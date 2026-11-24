const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(
  /\/$/,
  ''
);

function getWebSocketUrl() {
  return API_BASE_URL.replace(/^http/, 'ws') + '/ws/face-id';
}

function sleep(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

export async function captureFaceFrames(video, durationMs = 3000, fps = 3) {
  if (!video || !video.videoWidth) {
    throw new Error('Caméra non disponible.');
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const frames = [];
  const interval = 1000 / fps;
  const startedAt = Date.now();

  while (Date.now() - startedAt < durationMs) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    frames.push(canvas.toDataURL('image/jpeg', 0.8));
    await sleep(interval);
  }

  if (frames.length === 0) {
    throw new Error('Aucune image capturée.');
  }
  return frames;
}

export function sendFaceFrames(mode, beneficiaryId, frames, accessToken) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(getWebSocketUrl());
    let settled = false;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      socket.close();
      callback(value);
    };

    socket.addEventListener('open', () => {
      socket.send(
        JSON.stringify({
          type: 'start',
          mode,
          beneficiary_id: beneficiaryId,
          access_token: accessToken || undefined,
        })
      );
    });

    socket.addEventListener('message', (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        finish(reject, new Error('Réponse WebSocket invalide.'));
        return;
      }

      if (message.type === 'ready') {
        frames.forEach((frame) => {
          socket.send(JSON.stringify({ type: 'frame', image: frame }));
        });
        socket.send(JSON.stringify({ type: 'stop' }));
      } else if (message.type === 'result') {
        finish(resolve, message);
      } else if (message.type === 'error') {
        finish(reject, new Error(message.detail || 'Erreur de reconnaissance faciale.'));
      }
    });

    socket.addEventListener('error', () => {
      finish(reject, new Error('WebSocket de reconnaissance faciale inaccessible.'));
    });

    socket.addEventListener('close', () => {
      if (!settled) {
        finish(reject, new Error('Connexion fermée avant la fin de l’analyse.'));
      }
    });
  });
}
