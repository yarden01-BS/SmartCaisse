import { useEffect, useRef, useState } from 'react';
import { Building2, Camera, CheckCircle2, Save } from 'lucide-react';
import { captureFaceFrames } from '../../../lib/faceId';

export default function BeneficiaireForm({ beneficiaire, onSoumettre, onAnnuler }) {
  const estModification = Boolean(beneficiaire);

  const [form, setForm] = useState({
    nom: beneficiaire?.nom ?? '',
    prenom: beneficiaire?.prenom ?? '',
    profession: beneficiaire?.profession ?? '',
    situation: beneficiaire?.situation ?? 'permanent',
  });
  const [visageFrames, setVisageFrames] = useState([]);
  const [captureStatus, setCaptureStatus] = useState('');
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const maj = (champ) => (e) => setForm({ ...form, [champ]: e.target.value });

  const demarrerCapture = async () => {
    setCapturing(true);
    setCaptureStatus('Activation de la caméra...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 320 },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      await new Promise((resolve) => setTimeout(resolve, 300));
      const frames = await captureFaceFrames(videoRef.current, 3000, 3);
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setVisageFrames(frames);
      setCaptureStatus(`${frames.length} images faciales capturées.`);
    } catch (error) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setCaptureStatus(error.message || 'Capture faciale impossible.');
    } finally {
      setCapturing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSoumettre(
      estModification
        ? { ...beneficiaire, ...form, visageFrames }
        : { ...form, visageFrames }
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

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-300">
              Reconnaissance faciale
            </span>
            <button
              type="button"
              onClick={demarrerCapture}
              disabled={capturing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              <Camera className="w-4 h-4" />
              {capturing ? 'Capture en cours...' : 'Capturer le visage'}
            </button>
          </div>

          {capturing && (
            <div className="relative w-full h-40 bg-black rounded-xl overflow-hidden border border-blue-500/40">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <p className="text-xs text-slate-400">
            {captureStatus ||
              (visageFrames.length
                ? `${visageFrames.length} images prêtes à être enregistrées.`
                : 'Aucune capture faciale pour le moment.')}
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
