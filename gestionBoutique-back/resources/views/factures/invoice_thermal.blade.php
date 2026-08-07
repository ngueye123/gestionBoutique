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

        .client-section {
            font-size: 7px;
            margin-bottom: 2mm;
            border: 1px solid #000;
            padding: 1.5mm;
        }

        .client-title {
            font-weight: bold;
            text-align: center;
            margin-bottom: 1mm;
        }

        .debt-alert {
            border: 1px solid #000;
            padding: 1.5mm;
            margin-top: 1.5mm;
            font-size: 6px;
        }

        .debt-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 6px;
            margin-top: 1mm;
        }

        .debt-table td {
            padding: 0.5mm 0;
        }

        .debt-table td:last-child {
            text-align: right;
            font-weight: bold;
            white-space: nowrap;
        }

        .debt-separator {
            border-top: 1px solid #000;
            margin: 1mm 0;
        }

        .products {
            margin-bottom: 1mm;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 1.5mm 0;
        }

        .product-line {
            padding: 0.5mm 0;
        }

        .product-line .name {
            font-weight: bold;
            font-size: 7px;
            word-break: break-word;
            overflow-wrap: anywhere;
        }

        .product-line .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            font-size: 7px;
            margin-top: 0.3mm;
        }

        .product-line .qty-price {
            white-space: nowrap;
        }

        .product-line .total {
            white-space: nowrap;
            font-weight: bold;
            margin-left: 2mm;
        }

        .totals {
            font-size: 7px;
            margin-bottom: 2mm;
        }

        .totals-table {
            width: 100%;
            border-collapse: collapse;
        }

        .totals-table td {
            padding: 0.5mm 0;
        }

        .totals-table td:last-child {
            text-align: right;
            font-weight: bold;
            white-space: nowrap;
        }

        .total-final {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            font-weight: bold;
            font-size: 9px;
        }

        .total-final td {
            padding: 1.5mm 0;
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
        <div class="client-section">
            <div class="client-title">CLIENT</div>
            <div>{{ $vente->client->nom }}</div>
            <div>{{ $vente->client->telephone }}</div>

            @if($vente->moyen_paiement === 'dette' && $ancienSolde !== null && $nouveauSolde !== null)
                <div class="debt-alert">
                    <div style="text-align: center; font-weight: bold;">CREDIT</div>
                    <table class="debt-table">
                        <tr><td>Dette avant:</td><td>{{ number_format($ancienSolde, 0, ',', "\u{00A0}") }}&nbsp;F</td></tr>
                        <tr><td>Cette facture:</td><td>{{ number_format($vente->total, 0, ',', "\u{00A0}") }}&nbsp;F</td></tr>
                    </table>
                    <div class="debt-separator"></div>
                    <table class="debt-table">
                        <tr><td>NOUVELLE DETTE:</td><td>{{ number_format($nouveauSolde, 0, ',', "\u{00A0}") }}&nbsp;F</td></tr>
                    </table>
                </div>
            @endif
        </div>
    @endif

    <div class="products">
        @foreach($vente->details as $detail)
            <div class="product-line">
                <div class="name">{{ $detail->nom_produit }}</div>
                <div class="detail-row">
                    <span class="qty-price">{{ rtrim(rtrim(number_format($detail->quantite, 3, ',', ' '), '0'), ',') }}{{ $detail->unite_vente }}&nbsp;x&nbsp;{{ number_format($detail->prix_unitaire, 0, ',', "\u{00A0}") }}&nbsp;F/{{ $detail->unite_prix }}</span>
                    <span class="total">{{ number_format($detail->sous_total, 0, ',', "\u{00A0}") }}&nbsp;F</span>
                </div>
            </div>
        @endforeach
    </div>

    <div class="totals">
        <table class="totals-table">
            <tr><td>Sous-total:</td><td>{{ number_format($vente->total, 0, ',', "\u{00A0}") }}&nbsp;F</td></tr>
            @if($vente->moyen_paiement === 'especes')
                <tr><td>Reçu:</td><td>{{ number_format($vente->montant_recu, 0, ',', "\u{00A0}") }}&nbsp;F</td></tr>
                @if($vente->monnaie > 0)
                    <tr><td>Monnaie:</td><td>{{ number_format($vente->monnaie, 0, ',', "\u{00A0}") }}&nbsp;F</td></tr>
                @endif
            @endif
            <tr class="total-final">
                <td>TOTAL:</td>
                <td>{{ number_format($vente->total, 0, ',', "\u{00A0}") }}&nbsp;F</td>
            </tr>
        </table>
    </div>

    <div class="footer">
        <div class="footer-message">Merci de votre visite !</div>
        @if($vente->moyen_paiement === 'dette')
            <div class="footer-note">Credit - A regler</div>
        @endif
    </div>
</body>
</html>