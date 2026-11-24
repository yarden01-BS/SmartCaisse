import { Building2, Calendar, LogOut, Phone, ScanFace } from 'lucide-react';

export default function ProfilSection({ caissiere, onLogout }) {
  const infos = [
    { Icon: Building2, label: "Poste d'affectation", valeur: caissiere.poste },
    { Icon: Phone, label: 'Téléphone', valeur: caissiere.telephone },
    { Icon: Calendar, label: 'Date de prise de service', valeur: caissiere.dateEmbauche },
    { Icon: ScanFace, label: 'Validation Biométrique', valeur: caissiere.methodeAuth, vert: true },
  ];

  return (
    <main className="flex-1 p-6 flex items-center justify-center">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col items-center text-center shadow-xl">
        <div className="w-24 h-24 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center text-blue-400 text-3xl font-bold mb-4">
          {caissiere.nom.charAt(0).toUpperCase()}
        </div>

        <h2 className="text-2xl font-bold mb-1">{caissiere.nom}</h2>
        <p className="text-sm text-slate-400 mb-4">
          Opératrice de Caisse • Matricule : {caissiere.matricule}
        </p>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Compte {caissiere.statut}
        </div>

        <div className="w-full space-y-3 text-left bg-slate-950 border border-slate-800 rounded-2xl p-5 mb-6 text-sm">
          {infos.map(({ Icon, label, valeur, vert }, i) => (
            <div
              key={label}
              className={`flex justify-between items-center ${
                i < infos.length - 1 ? 'pb-3 border-b border-slate-900' : ''
              }`}
            >
              <span className="text-slate-400 flex items-center gap-2">
                <Icon className="w-4 h-4 text-blue-400" /> {label}
              </span>
              <span className={`font-semibold ${vert ? 'text-emerald-400' : 'text-white'}`}>{valeur}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onLogout}
          className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-xl transition-colors cursor-pointer w-full flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Fermer la Caisse et Se Déconnecter
        </button>
      </div>
    </main>
  );
}
