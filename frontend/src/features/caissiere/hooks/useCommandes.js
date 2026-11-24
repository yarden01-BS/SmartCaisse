import { useState } from 'react';
import { commandesInitiales } from '../mockData';

export default function useCommandes() {
  const [commandes, setCommandes] = useState(commandesInitiales);

  const ajouterCommande = ({ client, prixTotal, partEntreprise, partClient, caissiereNom }) => {
    const maintenant = new Date();
    const date = `${maintenant.toISOString().slice(0, 10)} ${maintenant.toTimeString().slice(0, 5)}`;

    const nouveauBon = {
      numBon: commandes.length + 1,
      date,
      client,
      prixTotal,
      partEntreprise,
      partClient,
      caissiereNom,
    };

    setCommandes([nouveauBon, ...commandes]);
    return nouveauBon;
  };

  return { commandes, ajouterCommande };
}
