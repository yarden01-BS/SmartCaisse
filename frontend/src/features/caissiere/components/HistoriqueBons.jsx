import { FileText, Receipt } from 'lucide-react';

export default function HistoriqueBons({ commandes, chargement, erreur, onOuvrirBon }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col max-h-[750px]">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Receipt className="w-5 h-5 text-blue-400" />
        Bons de commande validés
      </h2>
      <span className="text-xs text-slate-400 mb-3">{commandes.length} bon(s) enregistré(s)</span>

      {erreur && <p className="text-xs text-red-400 mb-3">{erreur}</p>}
      {chargement && <p className="text-xs text-slate-400 mb-3">Chargement des bons...</p>}

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {!chargement && commandes.length === 0 && !erreur && (
          <p className="text-xs text-slate-500 italic text-center py-6">
            Aucun bon enregistré pour ce caissier.
          </p>
        )}
        {commandes.map((cmd) => (
          <div
            key={cmd.id}
            className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 text-xs"
          >
            <div className="flex justify-between items-center text-slate-400">
              <strong className="text-white text-sm">Bon #{cmd.numBon}</strong>
              <span>{cmd.date}</span>
            </div>
            <div>
              <strong className="text-white text-sm">{cmd.client.nom}</strong>{' '}
              <span className="text-slate-400">
                ({cmd.client.matricule} • {cmd.client.statut})
              </span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between font-semibold text-white">
              <span>Total : {cmd.prixTotal.toLocaleString()} F</span>
              <span className="text-amber-400">Client : {cmd.partClient.toLocaleString()} F</span>
              <span className="text-sky-400">SIAT : {cmd.partEntreprise.toLocaleString()} F</span>
            </div>

            <button
              type="button"
              onClick={() => onOuvrirBon(cmd)}
              className="mt-1 w-full flex items-center justify-center gap-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/40 py-2 rounded-lg transition-colors cursor-pointer font-medium"
            >
              <FileText className="w-4 h-4" />
              Afficher / Imprimer le Bon PDF
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
