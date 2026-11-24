import { Printer } from 'lucide-react';

export default function RapportTable({ lignes, totaux }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-bold">Relevé Nominatif des Travailleurs & Stagiaires</h3>
          <p className="text-xs text-slate-400">
            Détail de chaque employé ayant commandé sur la période sélectionnée
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Imprimer / PDF État
        </button>
      </div>

      {lignes.length === 0 ? (
        <p className="text-slate-500 text-sm italic py-8 text-center">
          Aucune consommation enregistrée sur cette période.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Matricule</th>
                <th className="py-3 px-4">Nom du Travailleur</th>
                <th className="py-3 px-4">Statut / Service</th>
                <th className="py-3 px-4 text-center">Nb Bons</th>
                <th className="py-3 px-4 text-right">Total Consommé</th>
                <th className="py-3 px-4 text-right">Part Client</th>
                <th className="py-3 px-4 text-right">Subvention SIAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {lignes.map((t) => (
                <tr key={t.matricule} className="hover:bg-slate-950/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-blue-400">{t.matricule}</td>
                  <td className="py-3 px-4 font-bold text-white">{t.nom}</td>
                  <td className="py-3 px-4 text-slate-400">
                    {t.statut} • <span className="text-slate-300">{t.service}</span>
                  </td>
                  <td className="py-3 px-4 text-center font-semibold">{t.nbBons}</td>
                  <td className="py-3 px-4 text-right font-bold text-white">
                    {t.total.toLocaleString()} FCFA
                  </td>
                  <td className="py-3 px-4 text-right text-amber-400 font-medium">
                    {t.client.toLocaleString()} FCFA
                  </td>
                  <td className="py-3 px-4 text-right text-sky-400 font-medium">
                    {t.siat.toLocaleString()} FCFA
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-950 border-t-2 border-slate-800 font-bold text-white">
              <tr>
                <td colSpan="3" className="py-3.5 px-4 text-right uppercase">Total Général :</td>
                <td className="py-3.5 px-4 text-center">{totaux.nbBons}</td>
                <td className="py-3.5 px-4 text-right text-blue-400">{totaux.ventes.toLocaleString()} FCFA</td>
                <td className="py-3.5 px-4 text-right text-amber-400">{totaux.client.toLocaleString()} FCFA</td>
                <td className="py-3.5 px-4 text-right text-sky-400">{totaux.siat.toLocaleString()} FCFA</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
