export const aujourdhuiStr = new Date().toISOString().slice(0, 10);
export const moisActuelStr = new Date().toISOString().slice(0, 7);

export function calculerRepartitionSiat(montantTotal) {
  const montant = parseFloat(montantTotal);
  if (isNaN(montant) || montant <= 0) {
    return { partEntreprise: 0, partClient: 0 };
  }
  const partEntreprise = Math.min(montant * 0.5, 1000);
  const partClient = montant - partEntreprise;
  return { partEntreprise, partClient };
}

export function imprimerBonPdf(bon, caissiereNom = bon.caissiereNom || '') {
  const fenetre = window.open("", "_blank", "width=450,height=650");
  if (!fenetre) return;
  fenetre.document.write(`
    <html>
      <head>
        <title>Bon de Commande #${bon.numBon} - SmartCaisse SIAT</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
          .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 12px; margin-bottom: 16px; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
          .total { border-top: 2px solid #111; border-bottom: 2px solid #111; padding: 10px 0; font-weight: bold; font-size: 16px; margin-top: 12px; }
          .badge { margin-top: 20px; padding: 10px; background: #ecfdf5; border: 1px solid #10b981; color: #065f46; text-align: center; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin:0;">SMARTCAISSE - SIAT</h2>
          <p style="margin:4px 0; font-size:12px;">Reçu Officiel de Restauration</p>
          <p style="margin:4px 0; font-weight:bold;">BON DE COMMANDE N° ${bon.numBon}</p>
        </div>
        <div class="row"><span>Date & Heure :</span><strong>${bon.date}</strong></div>
        <div class="row"><span>Caissière :</span><strong>${caissiereNom}</strong></div>
        <hr style="border:none; border-top:1px dashed #ccc; margin:12px 0;" />
        <div class="row"><span>Bénéficiaire :</span><strong>${bon.client.nom}</strong></div>
        <div class="row"><span>Matricule :</span><strong>${bon.client.matricule}</strong></div>
        <div class="row"><span>Statut / Service :</span><strong>${bon.client.statut} (${bon.client.service})</strong></div>
        <div class="row total"><span>MONTANT TOTAL :</span><span>${bon.prixTotal.toLocaleString()} FCFA</span></div>
        <div class="row"><span>Part Subventionnée (SIAT) :</span><strong>${bon.partEntreprise.toLocaleString()} FCFA</strong></div>
        <div class="row"><span>Part Payée par le Client :</span><strong>${bon.partClient.toLocaleString()} FCFA</strong></div>
        <div class="badge">✔ VALIDÉ PAR RECONNAISSANCE FACIALE</div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
    </html>
  `);
  fenetre.document.close();
}
