<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("DROP VIEW IF EXISTS v_ventes_journalieres");
        DB::statement("DROP VIEW IF EXISTS v_ventes_mensuelles");

        DB::statement("
            CREATE VIEW v_ventes_journalieres AS
            SELECT 
                DATE(created_at) AS date,
                utilisateur_id,
                COUNT(*) AS nombre_ventes,
                SUM(total) AS chiffre_affaires,
                AVG(total) AS panier_moyen
            FROM ventes
            GROUP BY DATE(created_at), utilisateur_id
        ");

        DB::statement("
            CREATE VIEW v_ventes_mensuelles AS
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') AS mois,
                utilisateur_id,
                COUNT(*) AS nombre_ventes,
                SUM(total) AS chiffre_affaires,
                AVG(total) AS panier_moyen
            FROM ventes
            GROUP BY DATE_FORMAT(created_at, '%Y-%m'), utilisateur_id
        ");
    }

    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS v_ventes_journalieres");
        DB::statement("DROP VIEW IF EXISTS v_ventes_mensuelles");
    }
};
