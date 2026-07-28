<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture {{ $vente->reference }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 11px;
            color: #333;
            line-height: 1.5;
        }

        .container {
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
        }

        /* En-tête */
        .header {
            margin-bottom: 30px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
        }

        .header-content {
            display: table;
            width: 100%;
        }

        .logo-section {
            display: table-cell;
            width: 40%;
            vertical-align: top;
        }

        .logo {
            max-width: 150px;
            max-height: 80px;
        }

        .shop-info {
            margin-top: 10px;
        }

        .shop-name {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
        }

        .shop-details {
            font-size: 10px;
            color: #666;
        }

        .invoice-info {
            display: table-cell;
            width: 60%;
            text-align: right;
            vertical-align: top;
        }

        .invoice-title {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
        }

        .invoice-meta {
            font-size: 11px;
        }

        .invoice-meta-item {
            margin-bottom: 5px;
        }

        .label {
            font-weight: bold;
            color: #555;
            vertical-align: middle;
        }

        /* Informations client */
        .client-section {
            margin-bottom: 25px;
            background-color: #f3f4f6;
            padding: 15px;
            border-radius: 5px;
        }

        .section-title {
            font-size: 13px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 5px;
        }

        .client-info {
            display: table;
            width: 100%;
        }

        .client-info-left {
            display: table-cell;
            width: 50%;
        }

        .client-info-right {
            display: table-cell;
            width: 50%;
            text-align: right;
        }

        .info-item {
            margin-bottom: 5px;
        }

        /* Alerte dette */
        .debt-alert {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 10px;
            margin-top: 10px;
            border-radius: 3px;
        }

        .debt-amounts {
            margin-top: 8px;
        }

        .debt-amount-row {
            display: table;
            width: 100%;
            margin-bottom: 5px;
        }

        .debt-label {
            display: table-cell;
            width: 70%;
            font-weight: bold;
        }

        .debt-value {
            display: table-cell;
            width: 30%;
            text-align: right;
            font-weight: bold;
        }

        .old-debt {
            color: #dc2626;
        }

        .current-amount {
            color: #ea580c;
        }

        .new-debt {
            color: #b91c1c;
            font-size: 13px;
        }

        /* Tableau des produits */
        .products-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }

        .products-table thead {
            background-color: #1e40af;
            color: white;
        }

        .products-table th {
            padding: 10px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
        }

        .products-table th.text-center {
            text-align: center;
        }

        .products-table th.text-right {
            text-align: right;
        }

        .products-table tbody tr {
            border-bottom: 1px solid #e5e7eb;
        }

        .products-table tbody tr:nth-child(even) {
            background-color: #f9fafb;
        }

        .products-table td {
            padding: 10px;
            font-size: 11px;
        }

        .products-table td.text-center {
            text-align: center;
        }

        .products-table td.text-right {
            text-align: right;
        }

        .product-ref {
            color: #6b7280;
            font-size: 9px;
        }

        /* Totaux */
        .totals-section {
            margin-top: 20px;
            float: right;
            width: 50%;
        }

        .totals-table {
            width: 100%;
            border-collapse: collapse;
        }

        .totals-table tr {
            border-bottom: 1px solid #e5e7eb;
        }

        .totals-table td {
            padding: 8px;
        }

        .totals-table td:first-child {
            text-align: left;
            font-weight: bold;
            color: #555;
        }

        .totals-table td:last-child {
            text-align: right;
            font-weight: bold;
        }

        .total-final {
            background-color: #1e40af;
            color: white;
            font-size: 14px;
        }

        .total-final td {
            padding: 12px 8px;
        }

        /* Pied de page */
        .footer {
            clear: both;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #d1d5db;
            text-align: center;
            font-size: 10px;
            color: #6b7280;
        }

        .footer-note {
            margin-top: 10px;
            font-style: italic;
        }

        /* Méthode de paiement */
        .payment-method {
            display: inline-block;
            vertical-align: middle;
            padding: 2px 12px;
            background-color: #dbeafe;
            color: #1e40af;
            border-radius: 12px;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            margin-left: 5px
        }

        .payment-method.dette {
            background-color: #fee2e2;
            color: #dc2626;
        }

        /* Clearfix */
        .clearfix::after {
            content: "";
            display: table;
            clear: both;
        }
     
    </style>
</head>
<body>
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            <div class="header-content">
                <div class="logo-section">
                    @if($boutique->logo_boutique)
                        <img src="{{ public_path('storage/' . $boutique->logo_boutique) }}" alt="Logo" class="logo">
                    @endif
                    <div class="shop-info">
                        <div class="shop-name">
                            {{ $boutique->nom_boutique ?? ($boutique->prenom . ' ' . $boutique->nom) }}
                        </div>
                        <div class="shop-details">
                            @if($boutique->adresse_boutique)
                                <div>{{ $boutique->adresse_boutique }}</div>
                            @endif
                            @if($boutique->telephone_boutique)
                                <div>Tél: {{ $boutique->telephone_boutique }}</div>
                            @endif
                            
                        </div>
                    </div>
                </div>
                <div class="invoice-info">
                    <div class="invoice-title">FACTURE</div>
                    <div class="invoice-meta">
                        <div class="invoice-meta-item">
                            <span class="label">N°:</span> {{ $vente->reference }}
                        </div>
                        <div class="invoice-meta-item">
                            <span class="label">Date:</span> {{ \Carbon\Carbon::parse($vente->created_at)->format('d/m/Y à H:i') }}
                        </div>
                        <div class="invoice-meta-item">
                            <span class="label">Paiement:</span>
                            <span class="payment-method {{ $vente->moyen_paiement === 'dette' ? 'dette' : '' }}" >
                                {{ ucfirst(str_replace('_', ' ', $vente->moyen_paiement)) }}
                            </span>
                        </div>
                        @if($vente->employe)
                            <div class="invoice-meta-item">
                                <span class="label">Vendeur:</span> {{ $vente->employe->nom }}
                            </div>
                        @endif
                    </div>
                </div>
            </div>
        </div>

        <!-- Informations client -->
        @if($vente->client)
            <div class="client-section">
                <div class="section-title">Informations Client</div>
                <div class="client-info">
                    <div class="client-info-left">
                        <div class="info-item">
                            <span class="label">Nom:</span> {{ $vente->client->nom }}
                        </div>
                        <div class="info-item">
                            <span class="label">Téléphone:</span> {{ $vente->client->telephone }}
                        </div>
                    </div>
                </div>

                @if($vente->moyen_paiement === 'dette' && $ancienSolde !== null && $nouveauSolde !== null)
                    <div class="debt-alert">
                        <strong>⚠️ Vente à crédit</strong>
                        <div class="debt-amounts">
                            <div class="debt-amount-row">
                                <span class="debt-label">Dette précédente:</span>
                                <span class="debt-value old-debt">{{ number_format($ancienSolde, 0, ',', ' ') }} F</span>
                            </div>
                            <div class="debt-amount-row">
                                <span class="debt-label">Montant de cette facture:</span>
                                <span class="debt-value current-amount">+ {{ number_format($vente->total, 0, ',', ' ') }} F</span>
                            </div>
                            <div class="debt-amount-row">
                                <span class="debt-label">Nouvelle dette totale:</span>
                                <span class="debt-value new-debt">{{ number_format($nouveauSolde, 0, ',', ' ') }} F</span>
                            </div>
                        </div>
                    </div>
                @endif
            </div>
        @endif

        <!-- Tableau des produits -->
        <table class="products-table">
            <thead>
                <tr>
                    <th style="width: 10%;">Réf</th>
                    <th style="width: 40%;">Désignation</th>
                    <th class="text-center" style="width: 15%;">Quantité</th>
                    <th class="text-right" style="width: 17.5%;">Prix Unit.</th>
                    <th class="text-right" style="width: 17.5%;">Sous-total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($vente->details as $detail)
                    <tr>
                        <td>
                            <div class="product-ref">{{ $detail->reference_produit }}</div>
                        </td>
                        <td>
                            <strong>{{ $detail->nom_produit }}</strong>
                        </td>
                        <td class="text-center">{{ rtrim(rtrim(number_format($detail->quantite, 3, ',', ' '), '0'), ',') }} {{ $detail->unite_vente }}</td>
                        <td class="text-right">{{ number_format($detail->prix_unitaire, 0, ',', ' ') }} F/{{ $detail->unite_prix }}</td>
                        <td class="text-right">{{ number_format($detail->sous_total, 0, ',', ' ') }} F</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <!-- Section totaux -->
        <div class="clearfix">
            <div class="totals-section">
                <table class="totals-table">
                    <tr>
                        <td>Sous-total HT:</td>
                        <td>{{ number_format($vente->total, 0, ',', ' ') }} F</td>
                    </tr>
                    @if($vente->moyen_paiement === 'especes')
                        <tr>
                            <td>Montant reçu:</td>
                            <td>{{ number_format($vente->montant_recu, 0, ',', ' ') }} F</td>
                        </tr>
                        @if($vente->monnaie > 0)
                            <tr>
                                <td>Monnaie rendue:</td>
                                <td>{{ number_format($vente->monnaie, 0, ',', ' ') }} F</td>
                            </tr>
                        @endif
                    @endif
                    <tr class="total-final">
                        <td style="color:white">TOTAL TTC:</td>
                        <td>{{ number_format($vente->total, 0, ',', ' ') }} F</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- Pied de page -->
        <div class="footer">
            <div>Merci pour votre confiance !</div>
            @if($vente->moyen_paiement === 'dette')
                <div class="footer-note">
                    Cette facture représente un montant à crédit. Veuillez régler votre dette dans les meilleurs délais.
                </div>
          
            @endif
        </div>
    </div>
</body>
</html>