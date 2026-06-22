<?php

namespace App\Http\Controllers;

use App\Models\Depense;
use App\Models\Employe;
use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class DepenseController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // Résout l'acteur connecté — identique à CaisseController::getActor()
    // ─────────────────────────────────────────────────────────────────────────

    private function getActor(): Employe|Utilisateur
    {
        try {
            $employe = auth('employe')->user();
            if ($employe instanceof Employe) {
                return $employe;
            }
        } catch (\Exception $e) {}

        try {
            $utilisateur = auth('api')->user();
            if ($utilisateur instanceof Utilisateur) {
                return $utilisateur;
            }
        } catch (\Exception $e) {}

        abort(401, 'Non authentifié.');
    }

    /**
     * Vérifie que l'acteur est bien un patron (Utilisateur).
     * Les employés — même admin — n'ont pas accès aux dépenses.
     */
    private function assertPatron(): Utilisateur
    {
        $actor = $this->getActor();

        if (!($actor instanceof Utilisateur)) {
            abort(403, 'Accès réservé au patron.');
        }

        return $actor;
    }

    

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/depenses
    // Deux modes de filtrage, mutuellement exclusifs :
    //   Mode plage  : start_date + end_date  (YYYY-MM-DD)  ← NOUVEAU
    //   Mode mois   : mois + annee           (fallback legacy)
    // Paramètres communs : categorie, page
    // ─────────────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $patron = $this->assertPatron();

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date'   => 'nullable|date|after_or_equal:start_date',
            'mois'       => 'nullable|integer|min:1|max:12',
            'annee'      => 'nullable|integer|min:2000|max:2100',
            'categorie'  => 'nullable|string|in:' . implode(',', array_keys(Depense::CATEGORIES)),
        ]);

        // ── Déterminer le mode de filtrage ────────────────────────────────────
        $useRange = $request->filled('start_date') || $request->filled('end_date');

        // ── Requête de base ───────────────────────────────────────────────────
        $query = Depense::byUtilisateur($patron->id)
            ->orderByDesc('date_depense')
            ->orderByDesc('created_at');

        if ($useRange) {
            // Mode plage de dates : start_date → end_date
            // Si une seule date est fournie, l'autre prend la même valeur (jour unique)
            $debut = $request->filled('start_date')
                ? $request->start_date
                : $request->end_date;

            $fin = $request->filled('end_date')
                ? $request->end_date
                : $request->start_date;

            $query->parPeriode($debut, $fin);

            // Label humain de la période pour le front
            $labelPeriode = $debut === $fin
                ? \Carbon\Carbon::parse($debut)->locale('fr')->isoFormat('DD MMMM YYYY')
                : \Carbon\Carbon::parse($debut)->locale('fr')->isoFormat('DD MMM YYYY')
                . ' → '
                . \Carbon\Carbon::parse($fin)->locale('fr')->isoFormat('DD MMM YYYY');

            $periodeRetour = [
                'mode'       => 'range',
                'start_date' => $debut,
                'end_date'   => $fin,
                'label'      => $labelPeriode,
            ];

        } else {
            // Mode mois/année (comportement historique conservé)
            $mois  = (int) ($request->input('mois',  now()->month));
            $annee = (int) ($request->input('annee', now()->year));

            $query->parMois($mois, $annee);

            $periodeRetour = [
                'mode'  => 'mois',
                'mois'  => $mois,
                'annee' => $annee,
                'label' => ucfirst(
                    now()->setMonth($mois)->setYear($annee)->locale('fr')->isoFormat('MMMM YYYY')
                ),
            ];
        }

        // Filtre catégorie (commun aux deux modes)
        if ($request->filled('categorie')) {
            $query->parCategorie($request->categorie);
        }

        // ── Total de la période (avant pagination) ────────────────────────────
        $totalPeriode = (clone $query)->sum('montant');

        // ── Répartition par catégorie sur la même période ─────────────────────
        $parCategorie = (clone $query)
            ->reorder() // Supprime les ordres précédents pour le groupBy
            ->select('categorie', DB::raw('SUM(montant) as total'), DB::raw('COUNT(*) as nombre'))
            ->groupBy('categorie')
            ->get()
            ->map(fn ($row) => [
                'categorie' => $row->categorie,
                'label'     => Depense::CATEGORIES[$row->categorie] ?? $row->categorie,
                'total'     => (float) $row->total,
                'nombre'    => (int)   $row->nombre,
            ]);

        // ── Comparaison avec la période précédente (mode mois uniquement) ─────
        $variation             = null;
        $totalPeriodePrecedente = 0;

        if (!$useRange) {
            $mois  = $periodeRetour['mois'];
            $annee = $periodeRetour['annee'];

            $moisPrecedent = \Carbon\Carbon::now()
                ->setMonth($mois)
                ->setYear($annee)
                ->subMonth();

            $totalPeriodePrecedente = Depense::byUtilisateur($patron->id)
                ->parMois($moisPrecedent->month, $moisPrecedent->year)
                ->sum('montant');

            $variation = $totalPeriodePrecedente > 0
                ? round((($totalPeriode - $totalPeriodePrecedente) / $totalPeriodePrecedente) * 100, 1)
                : null;
        }

        // ── Pagination ────────────────────────────────────────────────────────
        $depenses = $query->paginate(20);

        return response()->json([
            'success'               => true,
            'depenses'              => $depenses,
            'total_mensuel'         => (float) $totalPeriode,   // alias conservé pour compat. front
            'total_periode'         => (float) $totalPeriode,   // nouveau nom explicite
            'total_mois_precedent'  => (float) $totalPeriodePrecedente,
            'variation_pct'         => $variation,
            'par_categorie'         => $parCategorie,
            'categories'            => Depense::CATEGORIES,
            'periode'               => $periodeRetour,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/depenses
    // ─────────────────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $patron = $this->assertPatron();

        try {
            $validated = $request->validate([
                'montant'      => 'required|numeric|min:1|max:99999999',
                'date_depense' => 'required|date|before_or_equal:today',
                'description'  => 'required|string|min:3|max:500',
                'categorie'    => 'nullable|string|in:' . implode(',', array_keys(Depense::CATEGORIES)),
            ]);

            $depense = Depense::create([
                'utilisateur_id' => $patron->id,
                'montant'        => floatval($validated['montant']),
                'date_depense'   => $validated['date_depense'],
                'description'    => trim($validated['description']),
                'categorie'      => $validated['categorie'] ?? 'autre',
            ]);
             
            $this->dashboardCache->invalidate($ownerId);

            return response()->json([
                'success'  => true,
                'message'  => 'Dépense enregistrée avec succès.',
                'depense'  => $depense,
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides.',
                'errors'  => $e->errors(),
            ], 422);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /api/depenses/{id}
    // ─────────────────────────────────────────────────────────────────────────

    public function update(Request $request, int $id): JsonResponse
    {
        $patron = $this->assertPatron();

        try {
            $depense = Depense::byUtilisateur($patron->id)->findOrFail($id);

            $validated = $request->validate([
                'montant'      => 'required|numeric|min:1|max:99999999',
                'date_depense' => 'required|date|before_or_equal:today',
                'description'  => 'required|string|min:3|max:500',
                'categorie'    => 'nullable|string|in:' . implode(',', array_keys(Depense::CATEGORIES)),
            ]);

            $depense->update([
                'montant'      => floatval($validated['montant']),
                'date_depense' => $validated['date_depense'],
                'description'  => trim($validated['description']),
                'categorie'    => $validated['categorie'] ?? $depense->categorie,
            ]);

            $this->dashboardCache->invalidate($ownerId);

            return response()->json([
                'success' => true,
                'message' => 'Dépense mise à jour.',
                'depense' => $depense->fresh(),
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides.',
                'errors'  => $e->errors(),
            ], 422);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /api/depenses/{id}
    // ─────────────────────────────────────────────────────────────────────────

    public function destroy(int $id): JsonResponse
    {
        $patron = $this->assertPatron();

        $depense = Depense::byUtilisateur($patron->id)->findOrFail($id);
        $depense->delete();

        $this->dashboardCache->invalidate($ownerId);
        return response()->json([
            'success' => true,
            'message' => 'Dépense supprimée.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/depenses/stats-annuelles
    // Retourne les totaux mois par mois pour l'année sélectionnée
    // ─────────────────────────────────────────────────────────────────────────

    public function statsAnnuelles(Request $request): JsonResponse
    {
        $patron = $this->assertPatron();

        $annee = (int) ($request->input('annee', now()->year));

        $parMois = Depense::byUtilisateur($patron->id)
            ->parAnnee($annee)
            ->select(
                DB::raw('MONTH(date_depense) as mois'),
                DB::raw('SUM(montant) as total'),
                DB::raw('COUNT(*) as nombre')
            )
            ->groupBy(DB::raw('MONTH(date_depense)'))
            ->orderBy('mois')
            ->get()
            ->keyBy('mois');

        // Construire le tableau complet des 12 mois
        $statsCompletes = collect(range(1, 12))->map(function (int $m) use ($parMois, $annee) {
            $data = $parMois->get($m);
            return [
                'mois'   => $m,
                'label'  => ucfirst(
                    now()->setMonth($m)->setYear($annee)->locale('fr')->isoFormat('MMM')
                ),
                'total'  => $data ? (float) $data->total  : 0,
                'nombre' => $data ? (int)   $data->nombre : 0,
            ];
        });

        return response()->json([
            'success'       => true,
            'annee'         => $annee,
            'stats_par_mois' => $statsCompletes,
            'total_annuel'  => (float) $statsCompletes->sum('total'),
        ]);
    }
}