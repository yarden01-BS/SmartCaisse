import { useState } from 'react';
import { CheckCircle2, Receipt } from 'lucide-react';
import useFaceVerification from '../hooks/useFaceVerification';
import { calculerRepartitionSiat } from '../utils';
import ClientSelect from './ClientSelect';
import FaceVerification from './FaceVerification';
import HistoriqueBons from './HistoriqueBons';

export default function CommandeSection({
  personnel,
  commandes,
  caissiereNom,
  onAjouterCommande,
  onOuvrirBon,
}) {
  const [client, setClient] = useState(null);
  const [montantInput, setMontantInput] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const face = useFaceVerification();

  const { partEntreprise, partClient } = calculerRepartitionSiat(montantInput);

  const handleChoisirClient = (pers) => {
    setClient(pers);
    setStatusMessage('');
    face.reset();
  };

  const handleValider = (e) => {
    e.preventDefault();
    const montant = parseFloat(montantInput);
    if (!face.visageReconnu || !client || isNaN(montant) || montant <= 0) return;

    const bon = onAjouterCommande({
      client,
      prixTotal: montant,
      partEntreprise,
      partClient,
      caissiereNom,
    });

    setMontantInput('');
    face.reset();
    setStatusMessage(
      `Bon N°${bon.numBon} validé pour ${client.nom} ! Client : ${partClient.toLocaleString()} FCFA | SIAT : ${partEntreprise.toLocaleString()} FCFA`
    );
  };

  return (
    <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-400" />
          Saisie d'une Commande
        </h2>

        <form onSubmit={handleValider} className="flex-1 flex flex-col gap-5">
          <ClientSelect personnel={personnel} value={client} onChange={handleChoisirClient} />

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">
              Montant Total de la commande (FCFA)
            </label>
            <input
              type="number"
              min="1"
              placeholder="Ex: 2500"
              value={montantInput}
              onChange={(e) => setMontantInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Répartition automatique (Plafond SIAT : 1 000 FCFA)
            </h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="block text-xs text-slate-400 mb-1">Part Entreprise (SIAT)</span>
                <strong className="text-lg text-sky-400">{partEntreprise.toLocaleString()} FCFA</strong>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="block text-xs text-slate-400 mb-1">Part à payer par le Client</span>
                <strong className="text-lg text-amber-400">{partClient.toLocaleString()} FCFA</strong>
              </div>
            </div>
          </div>

          <FaceVerification client={client} face={face} />

          <button
            type="submit"
            disabled={!face.visageReconnu || !montantInput}
            className="mt-auto w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            Valider le Bon de Commande
          </button>

          {statusMessage && (
            <div className="bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl text-center">
              {statusMessage}
            </div>
          )}
        </form>
      </section>

      <HistoriqueBons commandes={commandes} onOuvrirBon={onOuvrirBon} />
    </main>
  );
}
