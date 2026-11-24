// Génère une empreinte numérique unique représentant les traits faciaux (pour le Back-End)
export function genererSignatureFaciale() {
  const randomPart = Math.floor(100000000 + Math.random() * 900000000);
  const timePart = Date.now().toString().slice(-6);
  return `FACE-${timePart}-${randomPart}`;
}

export function normaliserMatricule(valeur) {
  return valeur.toUpperCase().replace(/\s+/g, '');
}
