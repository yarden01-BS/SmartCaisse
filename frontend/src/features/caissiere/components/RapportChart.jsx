export default function RapportChart({ lignes }) {
  const maxConsommation = Math.max(...lignes.map((d) => d.total), 1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <h3 className="text-lg font-bold mb-1">Graphique de Consommation par Personnel</h3>
      <p className="text-xs text-slate-400 mb-6">
        Comparaison visuelle entre la part payée par le client et la subvention SIAT
      </p>

      <div className="flex items-center gap-6 mb-6 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
          <span className="text-slate-300">Part Client</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-sky-500 inline-block"></span>
          <span className="text-slate-300">Subvention SIAT</span>
        </div>
      </div>

      {lignes.length === 0 ? (
        <p className="text-slate-500 text-sm italic py-8 text-center">Aucune donnée graphique disponible.</p>
      ) : (
        <div className="space-y-5">
          {lignes.map((item) => {
            const pctClient = (item.client / maxConsommation) * 100;
            const pctSiat = (item.siat / maxConsommation) * 100;
            return (
              <div key={item.matricule} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">
                    {item.nom}{' '}
                    <span className="text-slate-400 font-normal">
                      ({item.nbBons} bon{item.nbBons > 1 ? 's' : ''})
                    </span>
                  </span>
                  <span className="font-bold text-slate-200">{item.total.toLocaleString()} FCFA</span>
                </div>
                <div className="w-full bg-slate-950 h-4 rounded-xl overflow-hidden flex border border-slate-800">
                  <div
                    style={{ width: `${pctClient}%` }}
                    className="bg-amber-500 h-full transition-all duration-500"
                    title={`Part Client : ${item.client.toLocaleString()} FCFA`}
                  />
                  <div
                    style={{ width: `${pctSiat}%` }}
                    className="bg-sky-500 h-full transition-all duration-500"
                    title={`Part SIAT : ${item.siat.toLocaleString()} FCFA`}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Client : {item.client.toLocaleString()} FCFA</span>
                  <span>SIAT : {item.siat.toLocaleString()} FCFA</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
