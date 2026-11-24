import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export default function ClientSelect({ personnel, value, onChange }) {
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState('');
  const conteneurRef = useRef(null);

  // Ferme la liste au clic à l'extérieur
  useEffect(() => {
    if (!ouvert) return;
    const handler = (e) => {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target)) {
        setOuvert(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ouvert]);

  const q = recherche.toLowerCase();
  const filtres = personnel.filter(
    (p) =>
      p.nom.toLowerCase().includes(q) ||
      p.matricule.toLowerCase().includes(q) ||
      p.service.toLowerCase().includes(q)
  );

  const choisir = (pers) => {
    onChange(pers);
    setOuvert(false);
    setRecherche('');
  };

  return (
    <div className="mb-2 relative" ref={conteneurRef}>
      <label className="block text-sm text-slate-400 mb-1.5">
        Personnel client (Travailleur / Stagiaire)
      </label>
      <button
        type="button"
        onClick={() => setOuvert(!ouvert)}
        className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 text-left flex items-center justify-between transition-colors cursor-pointer"
      >
        {value ? (
          <div>
            <strong className="text-white text-sm">{value.nom}</strong>{' '}
            <span className="text-slate-400 text-xs">
              ({value.matricule} • {value.statut})
            </span>
          </div>
        ) : (
          <span className="text-slate-500 text-sm">Sélectionner ou rechercher un travailleur...</span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${ouvert ? 'rotate-180' : ''}`}
        />
      </button>

      {ouvert && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-50 p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              autoFocus
              placeholder="Rechercher par nom, matricule, service..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {filtres.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-2 text-center">Aucun travailleur trouvé.</p>
            ) : (
              filtres.map((pers) => {
                const estSelectionne = value?.id === pers.id;
                return (
                  <button
                    type="button"
                    key={pers.id}
                    onClick={() => choisir(pers)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex justify-between items-center transition-colors cursor-pointer ${
                      estSelectionne
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <span className="block font-bold">{pers.nom}</span>
                      <span
                        className={`text-[11px] ${estSelectionne ? 'text-blue-100' : 'text-slate-500'}`}
                      >
                        {pers.matricule} • {pers.service}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        estSelectionne
                          ? 'bg-blue-700 text-white'
                          : 'bg-slate-900 border border-slate-800 text-slate-400'
                      }`}
                    >
                      {pers.statut}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
