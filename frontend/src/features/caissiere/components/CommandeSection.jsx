import { useState } from 'react';
import { CheckCircle2, Receipt } from 'lucide-react';
import { calculerRepartitionSiat } from '../utils';
import ClientSelect from './ClientSelect';
import HistoriqueBons from './HistoriqueBons';

export default function CommandeSection({
  personnel,
  commandes,
  chargement,
  erreur,
  erreurPersonnel,
  onAjouterCommande,
  onOuvrirBon,
}) {
  const [client, setClient] = useState(null);
  const [montantInput, setMontantInput] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusErreur, setStatusErreur] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const { partEntreprise, partClient } = calculerRepartitionSiat(montantInput);

  const handleChoisirClient = (pers) => {
    setClient(pers);
    setStatusMessage('');
  };

  const handleValider = async (e) => {
    e.preventDefault();
    const montant = parseFloat(montantInput);
    if (!client || isNaN(montant) || montant <= 0 || enCours) {
      return;
    }

    setEnCours(true);
    setStatusMessage('');
    try {
      const bon = await onAjouterCommande({ client, prixTotal: montant });
      setMontantInput('');
      setStatusErreur(false);
      setStatusMessage(
        `Bon ${bon.numBon} validé pour ${client.nom} ! Client : ${partClient.toLocaleString()} FCFA | SIAT : ${partEntreprise.toLocaleString()} FCFA`
      );
    } catch (error) {
      setStatusErreur(true);
      setStatusMessage(error.message || "Impossible d'enregistrer le bon.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-400" />
          Saisie d'une Commande
        </h2>

        {(chargement || erreurPersonnel) && (
          <p className={`text-xs mb-3 ${erreurPersonnel ? 'text-red-400' : 'text-slate-400'}`}>
            {erreurPersonnel || 'Chargement des bénéficiaires...'}
          </p>
        )}

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

          <button
            type="submit"
            disabled={!montantInput || enCours}
            className="mt-auto w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            {enCours ? 'Enregistrement en cours...' : 'Valider le Bon de Commande'}
          </button>

          {statusMessage && (
            <div
              className={`text-xs p-3 rounded-xl text-center ${
                statusErreur
                  ? 'bg-red-950/50 border border-red-500/30 text-red-300'
                  : 'bg-emerald-950/50 border border-emerald-500/30 text-emerald-300'
              }`}
            >
              {statusMessage}
            </div>
          )}
        </form>
      </section>

      <HistoriqueBons
        commandes={commandes}
        chargement={chargement}
        erreur={erreur}
        onOuvrirBon={onOuvrirBon}
      />
    </main>
  );
}
