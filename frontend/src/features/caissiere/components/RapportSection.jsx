import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { formaterRapport, getRapport } from '../api';
import { aujourdhuiStr, moisActuelStr } from '../utils';
import RapportTable from './RapportTable';
import RapportChart from './RapportChart';
import EmailModal from './EmailModal';

export default function RapportSection() {
  const [periode, setPeriode] = useState('jour');
  const [rapport, setRapport] = useState(null);
  const [periodeChargee, setPeriodeChargee] = useState(null);
  const [erreur, setErreur] = useState('');
  const [showEmail, setShowEmail] = useState(false);

  const chargement = periodeChargee !== periode;

  useEffect(() => {
    let actif = true;

    getRapport(periode)
      .then((donnees) => {
        if (!actif) return;
        setRapport(donnees);
        setPeriodeChargee(periode);
        setErreur('');
      })
      .catch((error) => {
        if (actif) setErreur(error.message);
      });

    return () => {
      actif = false;
    };
  }, [periode]);

  const { totaux, lignes } = formaterRapport(rapport);

  const libellePeriode =
    periode === 'jour' ? `Journée du ${aujourdhuiStr}` : `Mois de ${moisActuelStr}`;

  const kpis = [
    { label: 'Commandes Validées', valeur: totaux.nbBons, couleur: 'text-white', note: 'Bons signés par caméra' },
    { label: 'Montant Total Ventes', valeur: `${totaux.ventes.toLocaleString()} FCFA`, couleur: 'text-blue-400', note: 'Total général de la période' },
    { label: 'Part Payée par Clients', valeur: `${totaux.client.toLocaleString()} FCFA`, couleur: 'text-amber-400', note: 'Cumul à charge des travailleurs' },
    { label: 'Part Entreprise (SIAT)', valeur: `${totaux.siat.toLocaleString()} FCFA`, couleur: 'text-sky-400', note: 'Cumul subventionné par SIAT' },
  ];

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">État Financier & Consommation par Travailleur</h2>
          <p className="text-sm text-slate-400">
            Détail nominal par employé et cumul global (Plafond SIAT : 1 000 FCFA)
          </p>
          {chargement && <p className="text-xs text-slate-400 mt-2">Chargement du rapport...</p>}
          {erreur && <p className="text-xs text-red-400 mt-2">{erreur}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            {[
              { id: 'jour', label: `Journalier (${aujourdhuiStr})` },
              { id: 'mois', label: `Mensuel (${moisActuelStr})` },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => {
                  setErreur('');
                  setPeriode(id);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  periode === id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowEmail(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            Envoyer par courrier électronique
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <span className="text-xs text-slate-400 block mb-1">{k.label}</span>
            <strong className={`text-3xl font-extrabold ${k.couleur}`}>{k.valeur}</strong>
            <span className="block text-xs text-slate-500 mt-2">{k.note}</span>
          </div>
        ))}
      </div>

      <RapportTable lignes={lignes} totaux={totaux} />
      <RapportChart lignes={lignes} />

      {showEmail && (
        <EmailModal
          objetParDefaut={`État Financier SmartCaisse SIAT — ${libellePeriode}`}
          nbTravailleurs={lignes.length}
          totaux={totaux}
          onClose={() => setShowEmail(false)}
        />
      )}
    </main>
  );
}
