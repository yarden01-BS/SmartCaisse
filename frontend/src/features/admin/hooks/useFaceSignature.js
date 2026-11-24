import { useCallback, useEffect, useRef, useState } from 'react';
import { genererSignatureFaciale } from '../utils';

export default function useFaceSignature() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const arreterCamera = useCallback(() => {
    clearTimeout(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setIsScanning(false);
  }, []);

  // Branche le flux dès que l'élément <video> est affiché
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  // Nettoyage au démontage (changement de sous-page, déconnexion...)
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const capturer = async (onCapture) => {
    clearTimeout(timerRef.current);
    setIsScanning(true);

    const terminer = () => {
      onCapture(genererSignatureFaciale());
      arreterCamera();
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 320 },
      });
      streamRef.current = stream;
      setCameraActive(true);
      timerRef.current = setTimeout(terminer, 2200);
    } catch {
      // Mode test sans caméra : on génère tout de même une signature
      timerRef.current = setTimeout(terminer, 1000);
    }
  };

  return { videoRef, cameraActive, isScanning, capturer, arreterCamera };
}
