import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { COMPTE_ADMIN_TEST } from '../utils';

export default function AdminLoginScreen({ onLogin }) {
  const navigate = useNavigate();
  const [nom, setNom] = useState('');
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const identifiant = nom.trim().toLowerCase();
    if (
      identifiant === COMPTE_ADMIN_TEST.identifiant &&
      pwd === COMPTE_ADMIN_TEST.motDePasse
    ) {
      setError('');
      onLogin(identifiant);
    } else {
      setError(
        `Identifiant ou mot de passe incorrect (Test : ${COMPTE_ADMIN_TEST.identifiant} / ${COMPTE_ADMIN_TEST.motDePasse})`
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <span className="text-lg font-bold text-emerald-400">
          SmartCaisse | Connexion Administrateur
        </span>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour Accueil
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl space-y-4"
        >
          <h1 className="text-2xl font-bold text-center mb-6">Accès Supervision</h1>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Nom administrateur</label>
            <input
              type="text"
              placeholder="Ex: admin"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Mot de passe</label>
            <input
              type="password"
              placeholder="Ex: 1234"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold py-3.5 rounded-xl transition-colors mt-2 cursor-pointer text-white"
          >
            Se connecter
          </button>

          {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}

          <p className="text-center text-xs text-slate-400 pt-2">
            Espace caissière ?{' '}
            <button
              type="button"
              onClick={() => navigate('/caisse')}
              className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
            >
              Se connecter comme caissière
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
