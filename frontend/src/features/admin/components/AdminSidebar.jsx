import { ScanFace, UserPlus, Users } from 'lucide-react';

const LIENS_COMPTES = [
  {
    id: 'comptes-liste',
    label: 'Affichage des comptes',
    Icon: Users,
    actif: ['comptes-liste', 'comptes-modifier'],
    couleur: 'bg-emerald-600',
  },
  {
    id: 'comptes-creer',
    label: 'Création de compte',
    Icon: UserPlus,
    actif: ['comptes-creer'],
    couleur: 'bg-emerald-600',
  },
];

export default function AdminSidebar({ sousPage, onChangeSousPage }) {
  return (
    <aside className="w-full md:w-72 bg-slate-900 border-r border-slate-800 p-6 space-y-6">
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-3">
          Gestion des Comptes
        </span>
        {LIENS_COMPTES.map(({ id, label, Icon, actif, couleur }) => (
          <button
            key={id}
            onClick={() => onChangeSousPage(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
              actif.includes(sousPage)
                ? `${couleur} text-white`
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2 pt-4 border-t border-slate-800">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-3">
          Personnel Client SIAT
        </span>
        <button
          onClick={() => onChangeSousPage('travailleurs')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
            ['travailleurs', 'travailleurs-modifier'].includes(sousPage)
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <ScanFace className="w-4 h-4" />
          Gestion des travailleurs
        </button>
      </div>
    </aside>
  );
}
