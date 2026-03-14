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

        .montant-box {
            border: 2px solid #000;
            text-align: center;
            padding: 6px 4px;
            margin: 8px 0;
        }

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
        <div class="bold big">{{ strtoupper($boutique->nom_boutique) }}</div>
        <div class="small">{{ $boutique->adresse_boutique }}</div>
        @if($boutique->telephone_boutique)
            <div class="small">Tél : {{ $boutique->telephone_boutique }}</div>
        @endif
    </div>

    <hr class="separator">

    {{-- ══════════ TITRE ══════════ --}}
    <div class="center bold medium" style="margin: 4px 0;">
         TICKET DE PRÉLÈVEMENT 
    </div>

    <hr class="separator">

    {{-- ══════════ RÉFÉRENCE ══════════ --}}
    <div class="row">
        <span>Référence :</span>
        <span class="bold">{{ $mouvement->ticket_reference }}</span>
    </div>
    <div class="row">
        <span>Date :</span>
        <span>{{ $mouvement->created_at->format('d/m/Y') }}</span>
    </div>
    <div class="row">
        <span>Heure :</span>
        <span>{{ $mouvement->created_at->format('H:i:s') }}</span>
    </div>

    <hr class="separator">

    {{-- ══════════ CAISSIER ══════════ --}}
    <div class="row">
        <span>Effectué par :</span>
        <span class="bold">{{ $nom_acteur }}</span>
    </div>

    <hr class="separator">

    {{-- ══════════ MONTANT ══════════ --}}
    <div class="montant-box">
        <div class="small">MONTANT PRÉLEVÉ</div>
        <div class="bold" style="font-size: 16px; margin-top: 2px;">
            {{ number_format((float)$mouvement->montant, 0, ',', ' ') }} F CFA
        </div>
    </div>

    {{-- ══════════ SOLDES ══════════ --}}
    <div class="row small">
        <span>Solde avant :</span>
        <span>{{ number_format((float)$mouvement->solde_avant, 0, ',', ' ') }} F</span>
    </div>
    <div class="row small">
        <span>Solde après :</span>
        <span class="bold">{{ number_format((float)$mouvement->solde_apres, 0, ',', ' ') }} F</span>
    </div>

    @if($mouvement->note)
        <hr class="separator">
        <div class="small">Note : {{ $mouvement->note }}</div>
    @endif

    <hr class="separator">

    {{-- ══════════ SIGNATURES ══════════ --}}
    <div style="margin-top: 8px;">
        <div class="small">Signature caissier :</div>
        <div style="border-bottom: 1px solid #000; margin: 12px 0 4px 0;"></div>

        <div class="small">Signature patron :</div>
        <div style="border-bottom: 1px solid #000; margin: 12px 0 4px 0;"></div>
    </div>

    <hr class="separator">

    {{-- ══════════ PIED DE PAGE ══════════ --}}
    <div class="barcode-area">
        {{ $mouvement->ticket_reference }}
    </div>
    <div class="footer-text">
        Document généré le {{ now()->format('d/m/Y à H:i') }}<br>
        Conservez ce ticket — Document officiel
    </div>

</body>
</html>