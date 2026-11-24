import { useEffect, useState } from 'react';
import { Edit3, MoreVertical, Trash2 } from 'lucide-react';
import TravailleurForm from './TravailleurForm';

export default function TravailleursSection({
  travailleurs,
  onAjouter,
  onModifier,
  onSupprimer,
}) {
  const [menuOuvertId, setMenuOuvertId] = useState(null);

  useEffect(() => {
    if (!menuOuvertId) return;
    const fermer = () => setMenuOuvertId(null);
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, [menuOuvertId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
      <TravailleurForm onSoumettre={onAjouter} />

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Liste du Personnel Enregistré</h2>
          <span className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-3 py-1.5 rounded-xl font-semibold">
            {travailleurs.length} enregistré(s)
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 max-h-[560px]">
          {travailleurs.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-12">
              Aucun travailleur ou stagiaire enregistré pour le moment.
            </p>
          ) : (
            travailleurs.map((trav) => (
              <div
                key={trav.id}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex justify-between items-center gap-3 relative"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <strong className="text-sm text-white">
                      {trav.prenom} {trav.nom}
                    </strong>
                    {trav.matricule && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 text-slate-300">
                        {trav.matricule}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400">
                      {trav.statut}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 block break-all">
                    {trav.signatureFaciale}
                  </span>
                </div>

                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() =>
                      setMenuOuvertId(menuOuvertId === trav.id ? null : trav.id)
                    }
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer"
                    title="Options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {menuOuvertId === trav.id && (
                    <div className="absolute right-0 top-11 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-20 py-2 w-40 text-left">
                      <button
                        onClick={() => {
                          setMenuOuvertId(null);
                          onModifier(trav);
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-400" /> Modifier
                      </button>
                      <button
                        onClick={() => {
                          setMenuOuvertId(null);
                          onSupprimer(trav);
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" /> Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
