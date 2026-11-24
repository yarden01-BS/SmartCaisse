import { UserPlus, Users } from 'lucide-react';

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

const LIENS_BENEFICIAIRES = [
  {
    id: 'beneficiaires-liste',
    label: 'Listes des bénéficiaires',
    Icon: Users,
    actif: ['beneficiaires-liste', 'beneficiaires-modifier'],
    couleur: 'bg-blue-600',
  },
  {
    id: 'beneficiaires-creer',
    label: 'Créer un nouveau bénéficiaire',
    Icon: UserPlus,
    actif: ['beneficiaires-creer'],
    couleur: 'bg-blue-600',
  },
];

function GroupeLiens({ titre, liens, sousPage, onChangeSousPage, avecBordure }) {
  return (
    <div className={`space-y-2 ${avecBordure ? 'pt-4 border-t border-slate-800' : ''}`}>
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-3">
        {titre}
      </span>
      {liens.map(({ id, label, Icon, actif, couleur }) => (
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
  );
}

export default function AdminSidebar({ sousPage, onChangeSousPage }) {
  return (
    <aside className="w-full md:w-72 bg-slate-900 border-r border-slate-800 p-6 space-y-6">
      <GroupeLiens
        titre="Gestion des Comptes"
        liens={LIENS_COMPTES}
        sousPage={sousPage}
        onChangeSousPage={onChangeSousPage}
      />
      <GroupeLiens
        titre="Gestion des bénéficiaires"
        liens={LIENS_BENEFICIAIRES}
        sousPage={sousPage}
        onChangeSousPage={onChangeSousPage}
        avecBordure
      />
    </aside>
  );
}
