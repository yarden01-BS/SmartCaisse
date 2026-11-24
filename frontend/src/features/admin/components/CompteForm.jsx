import { useState } from 'react';

export default function CompteForm({ compte, onSoumettre, onAnnuler }) {
  const estModification = Boolean(compte);

  const [form, setForm] = useState({
    nom: compte?.nom ?? '',
    email: compte?.email ?? '',
    role: compte?.role ?? 'Caissière',
    statut: compte?.statut ?? 'actif',
    motDePasse: '',
  });

  const maj = (champ) => (e) => setForm({ ...form, [champ]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (estModification) {
      onSoumettre({
        ...compte,
        nom: form.nom,
        email: form.email,
        role: form.role,
        statut: form.statut,
        motDePasse: form.motDePasse,
      });
    } else {
      onSoumettre(form);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
      <h2 className="text-xl font-bold mb-1">
        {estModification ? "Modifier le Compte" : "Création d'un Compte"}
      </h2>
      <p className="text-xs text-slate-400 mb-6">
        {estModification
          ? `Modifiez les informations préremplies de ${compte.nom}`
          : "Renseignez le nom, l'adresse e-mail et les accès du nouvel utilisateur"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-slate-400 mb-1">Nom complet</label>
          <input
            type="text"
            placeholder="Ex: Nadia Malonga"
            value={form.nom}
            onChange={maj('nom')}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Adresse e-mail</label>
          <input
            type="email"
            placeholder="Ex: nadia.malonga@siat.cg"
            value={form.email}
            onChange={maj('email')}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Rôle</label>
          <select
            value={form.role}
            onChange={maj('role')}
            disabled={estModification}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="Caissière">Caissière</option>
            <option value="Administrateur">Administrateur</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Statut</label>
          <select
            value={form.statut}
            onChange={maj('statut')}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm cursor-pointer"
          >
            <option value="actif">Actif</option>
            <option value="suspendu">Suspendu</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">
            {estModification
              ? 'Nouveau mot de passe (optionnel)'
              : 'Mot de passe'}
          </label>
          <input
            type="password"
            placeholder={
              estModification
                ? "Laisser vide pour conserver l'actuel"
                : 'Saisir un mot de passe'
            }
            value={form.motDePasse}
            onChange={maj('motDePasse')}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onAnnuler}
            className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-sm cursor-pointer text-white"
          >
            Annuler
          </button>
          <button
            type="submit"
            className={`flex-1 py-3 rounded-xl font-bold text-sm cursor-pointer text-white transition-colors ${
              estModification
                ? 'bg-blue-600 hover:bg-blue-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {estModification ? 'Valider' : 'Créer le compte'}
          </button>
        </div>
      </form>
    </div>
  );
}
