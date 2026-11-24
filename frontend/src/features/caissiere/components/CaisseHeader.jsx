import { BarChart3, LogOut, ShoppingBag, User } from 'lucide-react';

const ONGLETS = [
  { id: 'commande', label: 'Commande', Icon: ShoppingBag },
  { id: 'rapport', label: 'Rapport', Icon: BarChart3 },
  { id: 'profil', label: 'Profil', Icon: User },
];

export default function CaisseHeader({ caissiere, sectionActive, onChangeSection, onLogout }) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-blue-400">SmartCaisse</span>
        <span className="text-slate-600">|</span>
        <span className="text-sm text-slate-300">
          Espace Caissière : <strong className="text-white">{caissiere.nom}</strong>
        </span>
      </div>

      <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
        {ONGLETS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onChangeSection(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
              sectionActive === id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={onLogout}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        Déconnexion
      </button>
    </header>
  );
}
