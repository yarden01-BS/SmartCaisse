import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function LoginScreen({ onLogin }) {
  const navigate = useNavigate();
  const [nom, setNom] = useState('');
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nom.trim() && pwd === '1234') {
      setError('');
      onLogin({
        id: 2,
        matricule: 'CAIS-002',
        nom: nom.trim(),
        poste: 'Caisse Principale — Cantine SIAT',
        telephone: '+242 06 600 12 34',
        dateEmbauche: '15 Janvier 2025',
        statut: 'Actif',
        methodeAuth: 'Reconnaissance Faciale (Webcam)',
      });
    } else {
      setError('Nom ou mot de passe incorrect (Test : 1234)');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <span className="text-lg font-bold">SmartCaisse | Connexion Caissière</span>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour Accueil
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl"
        >
          <h1 className="text-2xl font-bold text-center mb-6">Ouverture de Caisse</h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Nom de la caissière</label>
              <input
                type="text"
                placeholder="Ex: Sarah"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Mot de passe</label>
              <input
                type="password"
                placeholder="Ex: 1234"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3.5 rounded-xl transition-colors mt-2 cursor-pointer"
            >
              Se connecter
            </button>

            {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}

            <p className="text-center text-xs text-slate-400 pt-2">
              Accès administrateur ?{' '}
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
              >
                Se connecter comme administrateur
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
