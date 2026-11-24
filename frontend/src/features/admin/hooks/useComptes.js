import { useCallback, useEffect, useState } from 'react';
import {
  creerCompte as apiCreerCompte,
  getComptes,
  modifierCompte as apiModifierCompte,
  supprimerCompte as apiSupprimerCompte,
} from '../api';

function messageErreur(error, fallback) {
  return error?.message || fallback;
}

export default function useComptes(notifier, sessionActive = true) {
  const [comptes, setComptes] = useState([]);
  const [filtreStatut, setFiltreStatut] = useState('actif');
  const [chargementApi, setChargementApi] = useState(true);

  useEffect(() => {
    if (!sessionActive) return undefined;

    let actif = true;
    getComptes()
      .then((liste) => {
        if (actif) setComptes(liste);
      })
      .catch((error) => {
        if (actif) {
          notifier(
            'erreur',
            'Chargement impossible',
            messageErreur(error, "Impossible de charger les comptes.")
          );
        }
      })
      .finally(() => {
        if (actif) setChargementApi(false);
      });
    return () => {
      actif = false;
    };
  }, [notifier, sessionActive]);

  const comptesFiltres = comptes.filter((c) =>
    filtreStatut === 'tous' ? true : c.statut === filtreStatut
  );

  const creerCompte = useCallback(
    async (values) => {
      try {
        const compte = await apiCreerCompte(values);
        setComptes((prev) => [compte, ...prev]);
        notifier(
          'succes',
          'Compte créé avec succès',
          `Le compte de ${compte.nom} (${compte.email}) a été créé.`
        );
        return true;
      } catch (error) {
        notifier(
          'erreur',
          'Création impossible',
          messageErreur(error, "Le compte n'a pas pu être créé.")
        );
        return false;
      }
    },
    [notifier]
  );

  const modifierCompte = useCallback(
    async (compte) => {
      try {
        const modifie = await apiModifierCompte(compte, compte.motDePasse);
        setComptes((prev) =>
          prev.map((c) => (c.id === modifie.id ? modifie : c))
        );
        notifier(
          'succes',
          'Compte modifié',
          `Les informations de ${modifie.nom} ont été enregistrées.`
        );
        return true;
      } catch (error) {
        notifier(
          'erreur',
          'Modification impossible',
          messageErreur(error, "Le compte n'a pas pu être modifié.")
        );
        return false;
      }
    },
    [notifier]
  );

  const supprimerCompte = useCallback(
    async (compte) => {
      try {
        await apiSupprimerCompte(compte.id);
        setComptes((prev) => prev.filter((c) => c.id !== compte.id));
        notifier(
          'succes',
          'Suppression réussie',
          `Le compte "${compte.nom}" a été supprimé.`
        );
        return true;
      } catch (error) {
        notifier(
          'erreur',
          'Suppression impossible',
          messageErreur(error, "Le compte n'a pas pu être supprimé.")
        );
        return false;
      }
    },
    [notifier]
  );

  return {
    comptes,
    comptesFiltres,
    filtreStatut,
    setFiltreStatut,
    chargement: sessionActive ? chargementApi : false,
    creerCompte,
    modifierCompte,
    supprimerCompte,
  };
}
