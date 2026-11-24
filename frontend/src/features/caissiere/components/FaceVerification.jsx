import { Camera, CheckCircle2, ScanFace } from 'lucide-react';

export default function FaceVerification({ client, face }) {
  const { videoRef, cameraActive, isScanning, visageReconnu, feedback, verifier } = face;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium flex items-center gap-2">
          <ScanFace className="w-4 h-4 text-blue-400" />
          Reconnaissance Faciale (Webcam)
        </span>
        {client && (
          <span className="text-xs bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg text-slate-300">
            Client : <strong>{client.nom}</strong>
          </span>
        )}
      </div>

      {cameraActive && (
        <div className="relative w-full h-48 bg-black rounded-xl overflow-hidden border border-blue-500/40 flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute inset-0 border-2 border-dashed border-blue-400/60 m-4 rounded-lg pointer-events-none flex items-center justify-center">
            <span className="bg-black/70 text-blue-300 text-xs px-3 py-1 rounded-full font-medium">
              Analyse du visage en cours...
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={isScanning || !client}
        onClick={() => verifier(client)}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        <Camera className="w-5 h-5" />
        {isScanning ? 'Vérification du visage en cours...' : 'Démarrer la caméra & Vérifier le visage'}
      </button>

      {visageReconnu ? (
        <p className="text-xs text-emerald-400 flex items-center justify-center gap-1.5 font-medium">
          <CheckCircle2 className="w-4 h-4" /> {feedback}
        </p>
      ) : (
        <p className="text-xs text-slate-500 text-center">
          {feedback ||
            (client
              ? 'En attente de la vérification faciale du client'
              : 'Sélectionnez d’abord un travailleur ci-dessus')}
        </p>
      )}
    </div>
  );
}
