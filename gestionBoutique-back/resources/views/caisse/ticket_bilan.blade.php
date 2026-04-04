<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 10px;
            width: 72mm;
            padding: 4mm;
            color: #000;
        }

        .center   { text-align: center; }
        .bold     { font-weight: bold; }
        .big      { font-size: 13px; }
        .medium   { font-size: 11px; }
        .small    { font-size: 9px; }
        .right    { text-align: right; }

        .separator {
            border: none;
            border-top: 1px dashed #000;
            margin: 4px 0;
        }

        .row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
        }

        .section-title {
            font-weight: bold;
            font-size: 9px;
            text-transform: uppercase;
            margin: 4px 0 2px 0;
        }

        .result-box {
            border: 2px solid #000;
            text-align: center;
            padding: 6px 4px;
            margin: 6px 0;
        }

        .ecart-equilibre { border: 2px solid #000; }
        .ecart-surplus   { border: 2px solid #000; }
        .ecart-manquant  { border: 2px solid #000; }

        .footer-text {
            font-size: 8px;
            text-align: center;
            margin-top: 6px;
        }

        .barcode-area {
            text-align: center;
            letter-spacing: 2px;
            font-size: 8px;
            margin-top: 4px;
        }
    </style>
</head>
<body>

    {{-- ══════════ EN-TÊTE BOUTIQUE ══════════ --}}
    <div class="center">
        @if($boutique->logo_boutique)
            <img src="{{ $boutique->logo_boutique }}" style="max-width:40mm; max-height:12mm;" alt="Logo">
            <br>
        @endif
        <div class="bold big">{{ strtoupper($boutique->nom_boutique ?? 'BOUTIQUE') }}</div>
        <div class="small">{{ $boutique->adresse_boutique ?? '' }}</div>
        @if(!empty($boutique->telephone_boutique))
            <div class="small">Tél : {{ $boutique->telephone_boutique }}</div>
        @endif
    </div>

    <hr class="separator">

    {{-- ══════════ TITRE ══════════ --}}
    <div class="center bold medium" style="margin: 4px 0;">
        ★ BILAN DE CAISSE ★
    </div>

    <hr class="separator">

    {{-- ══════════ RÉFÉRENCE & INFOS ══════════ --}}
    <div class="row">
        <span>Référence :</span>
        <span class="bold">{{ $bilan->ticket_reference }}</span>
    </div>
    <div class="row">
        <span>Généré le :</span>
        <span>{{ now()->format('d/m/Y H:i') }}</span>
    </div>
    <div class="row">
        <span>Caissier :</span>
        <span class="bold">{{ $bilan->effectue_par }}</span>
    </div>

    <hr class="separator">

    {{-- ══════════ PÉRIODE ══════════ --}}
    <div class="section-title">Période</div>
    <div class="row">
        <span>Du :</span>
        <span>{{ \Carbon\Carbon::parse($bilan->date_debut)->format('d/m/Y') }}</span>
    </div>
    <div class="row">
        <span>Au :</span>
        <span>{{ \Carbon\Carbon::parse($bilan->date_fin)->format('d/m/Y') }}</span>
    </div>

    <hr class="separator">

    {{-- ══════════ MOUVEMENTS ══════════ --}}
    <div class="section-title">Mouvements</div>
    <div class="row">
        <span>Solde début période :</span>
        <span>{{ number_format($bilan->solde_debut, 0, ',', ' ') }} F</span>
    </div>
    <div class="row">
        <span>Total entrées :</span>
        <span class="bold">+ {{ number_format($bilan->total_entrees, 0, ',', ' ') }} F</span>
    </div>
    <div class="row small">
        <span>  dont ventes espèces :</span>
        <span>{{ $bilan->nombre_ventes }} vente(s)</span>
    </div>
    <div class="row small">
        <span>  dont remb. dettes :</span>
        <span>{{ $bilan->nombre_remboursements }} remb.</span>
    </div>
    <div class="row">
        <span>Total sorties :</span>
        <span class="bold">- {{ number_format($bilan->total_sorties, 0, ',', ' ') }} F</span>
    </div>
    <div class="row small">
        <span>  dont prélèvements :</span>
        <span>{{ $bilan->nombre_prelevements }} prélèv.</span>
    </div>

    <hr class="separator">

    {{-- ══════════ RÉSULTAT ══════════ --}}
    <div class="section-title">Résultat</div>
    <div class="row">
        <span>Solde théorique :</span>
        <span class="bold">{{ number_format($bilan->solde_theorique, 0, ',', ' ') }} F</span>
    </div>
    <div class="row">
        <span>Solde réel compté :</span>
        <span class="bold">{{ number_format($bilan->solde_reel, 0, ',', ' ') }} F</span>
    </div>

    <div class="result-box {{ 'ecart-' . $bilan->statut_ecart }}">
        <div class="small">ÉCART</div>
        <div class="bold" style="font-size: 14px; margin-top: 2px;">
            @if($bilan->statut_ecart === 'equilibre')
                ✓ ÉQUILIBRÉ
            @elseif($bilan->statut_ecart === 'surplus')
                ↑ + {{ number_format(abs($bilan->ecart), 0, ',', ' ') }} F
            @else
                ⚠ - {{ number_format(abs($bilan->ecart), 0, ',', ' ') }} F
            @endif
        </div>
        <div class="small" style="margin-top: 2px;">
            @if($bilan->statut_ecart === 'equilibre') Caisse équilibrée
            @elseif($bilan->statut_ecart === 'surplus') Surplus de caisse
            @else Manquant en caisse
            @endif
        </div>
    </div>

    <hr class="separator">

    {{-- ══════════ SIGNATURES ══════════ --}}
    <div style="margin-top: 6px;">
        <div class="small">Signature caissier :</div>
        <div style="border-bottom: 1px solid #000; margin: 12px 0 4px 0;"></div>
        <div class="small">Signature patron :</div>
        <div style="border-bottom: 1px solid #000; margin: 12px 0 4px 0;"></div>
    </div>

    <hr class="separator">

    {{-- ══════════ PIED DE PAGE ══════════ --}}
    <div class="barcode-area">{{ $bilan->ticket_reference }}</div>
    <div class="footer-text">
        Document généré le {{ now()->format('d/m/Y à H:i') }}<br>
        Conservez ce ticket — Document officiel
    </div>

</body>
</html>