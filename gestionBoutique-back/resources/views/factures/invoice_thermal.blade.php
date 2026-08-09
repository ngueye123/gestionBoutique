<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Ticket</title>
    <style>
        @page {
            size: 58mm auto;
            margin: 0;
        }
        html,
        body {
            margin: 0;
            padding: 0;
            min-height: auto;
            height: auto;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'DejaVu Sans Mono', 'Courier New', monospace;
            font-size: 8px;
            color: #000;
            line-height: 1.05;
            width: 58mm;
            padding: 2mm 2mm 0 2mm;
        }

        .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 2mm;
            margin-bottom: 2mm;
        }

        .shop-name {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 1px;
        }

        .shop-details {
            font-size: 7px;
        }

        .invoice-title {
            text-align: center;
            font-size: 11px;
            font-weight: bold;
            margin: 2mm 0;
        }

        .invoice-info {
            font-size: 7px;
            margin-bottom: 2mm;
            border-bottom: 1px dashed #000;
            padding-bottom: 2mm;
        }

        .info-line {
            margin-bottom: 0.5mm;
        }

        /* --- Bloc client --- */
        .client-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            font-size: 7px;
            margin-bottom: 2mm;
        }

        .client-table td {
            padding: 0.8mm 1.5mm;
        }

        .client-title {
            font-weight: bold;
            text-align: center;
            border-bottom: 1px solid #000;
        }

        .debt-title {
            font-weight: bold;
            text-align: center;
            border-top: 1px solid #000;
            padding-top: 1.2mm;
        }

        /* lignes pré-formatées (alignement fait en PHP, pas en CSS) */
        .pre-line {
            white-space: pre;
            font-size: 6px;
        }

        .pre-line.final {
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 1mm;
        }

        /* --- Produits --- */
        .products {
            margin-bottom: 1mm;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 1.5mm 0;
        }

        .product-line {
            white-space: pre;
            font-size: 6.5px;
            font-weight: bold;
            padding: 0.4mm 0;
        }

        /* --- Totaux --- */
        .totals {
            margin-bottom: 2mm;
        }

        .totals-line {
            white-space: pre;
            font-size: 7px;
            padding: 0.4mm 0;
        }

        .total-final-line {
            white-space: pre;
            font-weight: bold;
            font-size: 9px;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 1.5mm 0;
            margin-top: 0.5mm;
        }

        .footer {
            text-align: center;
            font-size: 7px;
            margin-top: 0.3mm;
            border-top: 1px dashed #000;
            padding: 0.5mm 0 0 0;
        }

        .footer-message {
            font-weight: bold;
            margin-bottom: 0;
            line-height: 1.1;
        }

        .footer-note {
            font-size: 6px;
            font-style: italic;
            margin-top: 0.5mm;
            line-height: 1.1;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="shop-name">{{ $boutique->nom_boutique ?? ($boutique->prenom . ' ' . $boutique->nom) }}</div>
        <div class="shop-details">
            @if($boutique->adresse_boutique)<div>{{ $boutique->adresse_boutique }}</div>@endif
            @if($boutique->telephone_boutique)<div>Tel: {{ $boutique->telephone_boutique }}</div>@endif
        </div>
    </div>

    <div class="invoice-title">FACTURE</div>

    <div class="invoice-info">
        <div class="info-line">N°: {{ $vente->reference }}</div>
        <div class="info-line">Date: {{ \Carbon\Carbon::parse($vente->created_at)->format('d/m/Y H:i') }}</div>
        <div class="info-line">Mode: {{ strtoupper(str_replace('_', ' ', $vente->moyen_paiement)) }}</div>
        @if($vente->employe)<div class="info-line">Vendeur: {{ $vente->employe->nom }}</div>@endif
    </div>

    @if($vente->client)
        <table class="client-table">
            <tr><td class="client-title">CLIENT</td></tr>
            <tr><td>{{ $vente->client->nom }}</td></tr>
            <tr><td>{{ $vente->client->telephone }}</td></tr>

            @if(!empty($debtLines))
                <tr><td class="debt-title">CREDIT</td></tr>
                @foreach($debtLines as $line)
                    <tr><td class="pre-line">{{ $line }}</td></tr>
                @endforeach
                <tr><td class="pre-line final">{{ $debtFinalLine }}</td></tr>
            @endif
        </table>
    @endif

    <div class="products">
        @foreach($productLines as $line)
            <div class="product-line">{{ $line }}</div>
        @endforeach
    </div>

    <div class="totals">
        @foreach($totalsLines as $line)
            <div class="totals-line">{{ $line }}</div>
        @endforeach
        <div class="total-final-line">{{ $totalFinalLine }}</div>
    </div>

    <div class="footer">
        <div class="footer-message">Merci de votre visite !</div>
        @if($vente->moyen_paiement === 'dette')
            <div class="footer-note">Credit - A regler</div>
        @endif
    </div>
</body>
</html>