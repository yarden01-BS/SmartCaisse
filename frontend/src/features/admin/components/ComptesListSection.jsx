
import {
  Edit3,
  Mail,
  ShieldCheck,
  Trash2,
  UserCheck,
} from 'lucide-react';

export default function ComptesListSection({
  comptes,
  totaux,
  filtreStatut,
  onChangerFiltre,
  onModifier,
  onSupprimer,
  chargement = false,
}) {
  const filtres = [
    { id: 'actif', label: `Actifs (${totaux.actifs})`, couleur: 'bg-emerald-600' },
    { id: 'suspendu', label: `Suspendus (${totaux.suspendus})`, couleur: 'bg-amber-600' },
    { id: 'tous', label: `Tous (${totaux.tous})`, couleur: 'bg-blue-600' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold mb-1">Comptes Utilisateurs</h2>
          <p className="text-xs text-slate-400">
            Cliquez sur « … » ou sur les boutons d'action pour modifier ou supprimer
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          {filtres.map(({ id, label, couleur }) => (
            <button
              key={id}
              onClick={() => onChangerFiltre(id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                filtreStatut === id
                  ? `${couleur} text-white`
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {chargement ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-sm">
          Chargement des comptes depuis l'API...
        </div>
      ) : comptes.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-sm">
          Aucun compte trouvé dans cette catégorie. Utilisez « Création de compte » pour en ajouter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {comptes.map((compte) => (
            <div
              key={compte.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between gap-4 relative shadow-lg"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      compte.role === 'Administrateur'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-blue-500/15 text-blue-400'
                    }`}
                  >
                    {compte.role === 'Administrateur' ? (
                      <ShieldCheck className="w-6 h-6" />
                    ) : (
                      <UserCheck className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">{compte.nom}</h3>
                    <span className="text-xs text-slate-400">{compte.role}</span>
                  </div>
                </div>

                <div />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800/60">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>{compte.email}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    compte.statut === 'actif'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {compte.statut === 'actif' ? '● Actif' : '● Suspendu'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onModifier(compte)}
                    className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white transition-colors cursor-pointer"
                    title="Modifier ce compte"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {compte.id !== 1 && (
                    <button
                      onClick={() =>
                        onModifier({
                          ...compte,
                          statut: compte.statut === 'actif' ? 'suspendu' : 'actif',
                        })
                      }
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      compte.statut === 'actif'
                        ? 'bg-amber-500/10 hover:bg-amber-600 text-amber-400 hover:text-white'
                        : 'bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white'
                    }`}
                    title={compte.statut === 'actif' ? 'Suspendre ce compte' : 'Réactiver ce compte'}
                  >
                    {compte.statut === 'actif' ? '⏸' : '▶'}
                  </button>
                  )}
                  {compte.role !== 'Caissière' && (
                    <button
                      onClick={() => onSupprimer(compte)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white transition-colors cursor-pointer"
                      title="Supprimer ce compte"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
