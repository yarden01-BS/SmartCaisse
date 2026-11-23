import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { login } from '../api';

export default function LoginScreen({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [connexion, setConnexion] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setConnexion(true);
    try {
      const caissiere = await login(email.trim(), password);
      onLogin(caissiere);
    } catch (err) {
      setError(err.message || 'Connexion impossible.');
    } finally {
      setConnexion(false);
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
          <h1 className="text-2xl font-bold text-center mb-2">Ouverture de Caisse</h1>
          <p className="text-center text-xs text-slate-500 mb-6">
            Authentification via le serveur SmartCaisse
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Adresse e-mail</label>
              <input
                type="email"
                autoComplete="username"
                placeholder="cashier@smartcaisse.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Mot de passe</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={connexion}
              className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3.5 rounded-xl transition-colors mt-2 cursor-pointer disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {connexion ? 'Connexion...' : 'Se connecter'}
            </button>

            {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
