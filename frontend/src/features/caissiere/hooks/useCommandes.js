import { useCallback, useEffect, useState } from 'react';
import { creerBon, getBons, payerBon } from '../api';

export default function useCommandes(actif = false) {
  const [commandes, setCommandes] = useState([]);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState('');

  const chargement = actif && !charge;

  const recharger = useCallback(() => {
    return getBons()
      .then((bons) => {
        setCommandes(bons);
        setErreur('');
        setCharge(true);
        return bons;
      })
      .catch((error) => {
        setErreur(error.message);
        setCharge(true);
        return [];
      });
  }, []);

  useEffect(() => {
    if (actif) recharger();
  }, [actif, recharger]);

  const ajouterCommande = async ({ client, prixTotal }) => {
    const order = await creerBon({
      beneficiaryId: client.id,
      amount: prixTotal,
    });
    await payerBon(order.id);
    const bons = await recharger();
    const bon = bons.find((item) => item.id === order.id);
    if (!bon) throw new Error('Bon enregistré mais introuvable dans la liste.');
    return bon;
  };

  return { commandes, chargement, erreur, recharger, ajouterCommande };
}
