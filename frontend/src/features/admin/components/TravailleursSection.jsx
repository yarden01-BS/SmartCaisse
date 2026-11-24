import { useEffect, useMemo, useState } from 'react';
import { Edit3, MoreVertical, Search, Trash2, UserPlus, X } from 'lucide-react';
import { normaliserMatricule } from '../utils';

export default function BeneficiairesListe({
  beneficiaires,
  onAjouter,
  onModifier,
  onSupprimer,
}) {
  const [recherche, setRecherche] = useState('');
  const [critere, setCritere] = useState('nom');
  const [menuOuvertId, setMenuOuvertId] = useState(null);

  useEffect(() => {
    if (!menuOuvertId) return;
    const fermer = () => setMenuOuvertId(null);
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, [menuOuvertId]);

  const resultats = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return beneficiaires;

    if (critere === 'matricule') {
      const matricule = normaliserMatricule(terme);
      return beneficiaires.filter((b) =>
        normaliserMatricule(b.matricule || '').includes(matricule)
      );
    }

    return beneficiaires.filter((b) => {
      const nomComplet = `${b.prenom || ''} ${b.nom || ''}`.toLowerCase();
      const nomInverse = `${b.nom || ''} ${b.prenom || ''}`.toLowerCase();
      return nomComplet.includes(terme) || nomInverse.includes(terme);
    });
  }, [beneficiaires, recherche, critere]);

  const rechercheActive = recherche.trim().length > 0;
  const placeholder =
    critere === 'matricule'
      ? 'Ex: SA7206 (recherche précise)'
      : 'Rechercher par nom ou prénom...';

  const reinitialiser = () => {
    setRecherche('');
    setCritere('nom');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-xl font-bold">Listes des bénéficiaires</h2>
          <p className="text-xs text-slate-400 mt-1">
            Recherchez, modifiez ou supprimez un bénéficiaire enregistré.
          </p>
        </div>
        <button
          onClick={onAjouter}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Nouveau bénéficiaire
        </button>
      </div>

      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 space-y-2">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={recherche}
              placeholder={placeholder}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            {rechercheActive && (
              <button
                type="button"
                onClick={() => setRecherche('')}
                title="Effacer la recherche"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={critere}
            onChange={(e) => setCritere(e.target.value)}
            title="Critère de recherche"
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white cursor-pointer focus:outline-none focus:border-blue-500"
          >
            <option value="nom">Rechercher par nom (défaut)</option>
            <option value="matricule">Rechercher par matricule</option>
          </select>
        </div>

        <p className="text-[11px] text-slate-500 px-1">
          {rechercheActive
            ? `${resultats.length} résultat(s) sur ${beneficiaires.length} bénéficiaire(s)`
            : `${beneficiaires.length} bénéficiaire(s) enregistré(s)`}
          {critere === 'matricule' && ' • la matricule offre une recherche plus précise'}
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
          {resultats.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-slate-500 text-sm">
                {rechercheActive
                  ? 'Aucun bénéficiaire ne correspond à cette recherche.'
                  : 'Aucun bénéficiaire enregistré pour le moment.'}
              </p>
              {rechercheActive && (
                <button
                  onClick={reinitialiser}
                  className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  Réinitialiser la recherche
                </button>
              )}
            </div>
          ) : (
            resultats.map((beneficiaire) => (
              <div
                key={beneficiaire.id}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex justify-between items-center gap-3 relative"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <strong className="text-sm text-white">
                      {beneficiaire.prenom} {beneficiaire.nom}
                    </strong>
                    {beneficiaire.matricule && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 text-slate-300">
                        {beneficiaire.matricule}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400">
                      {beneficiaire.situation}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 block break-all">
                    {beneficiaire.signatureFaciale}
                  </span>
                </div>

                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() =>
                      setMenuOuvertId(
                        menuOuvertId === beneficiaire.id ? null : beneficiaire.id
                      )
                    }
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer"
                    title="Options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {menuOuvertId === beneficiaire.id && (
                    <div className="absolute right-0 top-11 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-20 py-2 w-40 text-left">
                      <button
                        onClick={() => {
                          setMenuOuvertId(null);
                          onModifier(beneficiaire);
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-400" /> Modifier
                      </button>
                      <button
                        onClick={() => {
                          setMenuOuvertId(null);
                          onSupprimer(beneficiaire);
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
