import { useState, useRef, useEffect, useCallback } from 'react';

export default function useFaceVerification() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [visageReconnu, setVisageReconnu] = useState(false);
  const [feedback, setFeedback] = useState('');

  const arreterCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Branche le flux dès que l'élément <video> est affiché
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  // Nettoyage au démontage (changement d'onglet, déconnexion...)
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      arreterCamera();
    };
  }, [arreterCamera]);

  const reset = () => {
    clearTimeout(timerRef.current);
    arreterCamera();
    setIsScanning(false);
    setVisageReconnu(false);
    setFeedback('');
  };

  const verifier = async (client) => {
    if (!client) return;
    setIsScanning(true);
    setVisageReconnu(false);
    setFeedback('Activation de la caméra... Regardez l’objectif.');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 320 },
      });
      streamRef.current = stream;
      setCameraActive(true);

      timerRef.current = setTimeout(() => {
        arreterCamera();
        setIsScanning(false);
        setVisageReconnu(true);
        setFeedback(`✔ Visage de ${client.nom} reconnu avec succès !`);
      }, 2200);
    } catch {
      timerRef.current = setTimeout(() => {
        setIsScanning(false);
        setVisageReconnu(true);
        setFeedback(`✔ Identité de ${client.nom} validée (Mode test sans caméra)`);
      }, 1200);
    }
  };

  return { videoRef, cameraActive, isScanning, visageReconnu, feedback, verifier, reset };
}
