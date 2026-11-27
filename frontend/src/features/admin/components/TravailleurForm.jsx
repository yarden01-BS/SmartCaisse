import { useState } from 'react';
import { Building2, CheckCircle2, Fingerprint, Save } from 'lucide-react';

export default function BeneficiaireForm({ beneficiaire, onSoumettre, onAnnuler }) {
  const estModification = Boolean(beneficiaire);

  const [form, setForm] = useState({
    nom: beneficiaire?.nom ?? '',
    prenom: beneficiaire?.prenom ?? '',
    profession: beneficiaire?.profession ?? '',
    situation: beneficiaire?.situation ?? 'permanent',
  });

  const maj = (champ) => (e) => setForm({ ...form, [champ]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSoumettre(
      estModification ? { ...beneficiaire, ...form } : { ...form }
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
      <h2 className="text-xl font-bold mb-1">
        {estModification
          ? 'Modifier le bénéficiaire'
          : 'Créer un nouveau bénéficiaire'}
      </h2>
      <p className="text-xs text-slate-400 mb-6">
        {estModification
          ? "Mettez à jour l'identité ou le service du bénéficiaire"
          : "Renseignez l'identité du bénéficiaire ; le matricule est généré automatiquement"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 mb-1">Nom</label>
            <input
              type="text"
              placeholder="Ex: Makosso"
              value={form.nom}
              onChange={maj('nom')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Prénom</label>
            <input
              type="text"
              placeholder="Ex: Jean"
              value={form.prenom}
              onChange={maj('prenom')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Profession / Service</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Ex: Comptable"
              value={form.profession}
              onChange={maj('profession')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Situation</label>
          <select
            value={form.situation}
            onChange={maj('situation')}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm cursor-pointer"
          >
            <option value="permanent">Permanent</option>
            <option value="stagiare">Stagiaire</option>
          </select>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Fingerprint className="w-4 h-4 text-emerald-400" />
            Authentification par empreinte digitale
          </div>
          <p className="text-xs text-slate-400">
            L&apos;enrôlement de l&apos;empreinte est effectué par l&apos;agent biométrique
            local après l&apos;enregistrement du bénéficiaire. Aucune capture faciale
            n&apos;est utilisée.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          {onAnnuler && (
            <button
              type="button"
              onClick={onAnnuler}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-sm cursor-pointer text-white"
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors text-white cursor-pointer ${
              estModification
                ? 'bg-blue-600 hover:bg-blue-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {estModification ? (
              <Save className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {estModification
              ? 'Valider les modifications'
              : 'Enregistrer le bénéficiaire'}
          </button>
        </div>
      </form>
    </div>
  );
}
