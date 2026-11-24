import { useState } from 'react';
import { Camera, CheckCircle2, RefreshCw, ScanFace } from 'lucide-react';
import useFaceSignature from '../hooks/useFaceSignature';
import { normaliserMatricule } from '../utils';

export default function TravailleurForm({ travailleur, onSoumettre, onAnnuler }) {
  const estModification = Boolean(travailleur);
  const { videoRef, cameraActive, isScanning, capturer } = useFaceSignature();

  const [form, setForm] = useState({
    matricule: travailleur?.matricule ?? '',
    nom: travailleur?.nom ?? '',
    prenom: travailleur?.prenom ?? '',
    statut: travailleur?.statut ?? 'Travailleur',
    signatureFaciale: travailleur?.signatureFaciale ?? '',
  });

  const maj = (champ) => (e) => setForm({ ...form, [champ]: e.target.value });
  const majMatricule = (e) =>
    setForm({ ...form, matricule: normaliserMatricule(e.target.value) });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSoumettre(estModification ? { ...travailleur, ...form } : form);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
      <h2 className="text-xl font-bold mb-1">
        {estModification
          ? 'Modifier le Travailleur / Stagiaire'
          : 'Enregistrer un Travailleur / Stagiaire'}
      </h2>
      <p className="text-xs text-slate-400 mb-6">
        {estModification
          ? "Mettez à jour l'identité, le matricule ou la signature faciale"
          : "Renseignez l'identité, le matricule et scannez les traits faciaux"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-slate-400 mb-1">Matricule</label>
          <input
            type="text"
            placeholder="Ex: SA7206"
            value={form.matricule}
            onChange={majMatricule}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

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

        <div>
          <label className="block text-slate-400 mb-1">Statut</label>
          <select
            value={form.statut}
            onChange={maj('statut')}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm cursor-pointer"
          >
            <option value="Travailleur">Travailleur</option>
            <option value="Stagiaire">Stagiaire</option>
          </select>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <span className="font-semibold text-slate-300 flex items-center gap-2">
            <ScanFace className="w-4 h-4 text-blue-400" />
            Empreinte des traits faciaux
          </span>

          {cameraActive && (
            <div className="relative w-full h-36 bg-black rounded-xl overflow-hidden border border-blue-500/40 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <button
            type="button"
            disabled={isScanning}
            onClick={() =>
              capturer((signatureFaciale) =>
                setForm((prev) => ({ ...prev, signatureFaciale }))
              )
            }
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed text-white"
          >
            {estModification ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            {isScanning
              ? estModification
                ? 'Recapture en cours...'
                : 'Capture des traits faciaux en cours...'
              : estModification
                ? 'Recapturer les traits faciaux'
                : form.signatureFaciale
                  ? 'Recapturer les traits faciaux'
                  : 'Scanner les traits faciaux'}
          </button>

          <div
            className={`p-2.5 rounded-xl text-xs font-mono break-all ${
              form.signatureFaciale
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-slate-900 border border-slate-800 text-slate-400 text-center'
            }`}
          >
            {form.signatureFaciale || 'En attente de capture faciale'}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          {estModification && (
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
            <CheckCircle2 className="w-4 h-4" />
            {estModification
              ? 'Valider les modifications'
              : 'Enregistrer le travailleur'}
          </button>
        </div>
      </form>
    </div>
  );
}
