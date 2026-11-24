import { useCallback, useEffect, useState } from 'react';
import {
  creerBeneficiaire,
  getBeneficiaires,
  modifierBeneficiaire as apiModifierBeneficiaire,
  reactiverBeneficiaire,
  supprimerBeneficiaire as apiSupprimerBeneficiaire,
  suspendreBeneficiaire,
} from '../api';

function messageErreur(error, fallback) {
  return error?.message || fallback;
}

export default function useBeneficiaires(notifier, sessionActive = true) {
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [chargementApi, setChargementApi] = useState(true);

  useEffect(() => {
    if (!sessionActive) return undefined;

    let actif = true;
    getBeneficiaires()
      .then((liste) => {
        if (actif) setBeneficiaires(liste);
      })
      .catch((error) => {
        if (actif) {
          notifier(
            'erreur',
            'Chargement impossible',
            messageErreur(error, 'Impossible de charger les bénéficiaires.')
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

  const ajouterBeneficiaire = useCallback(
    async (values) => {
      try {
        const nouveau = await creerBeneficiaire(values);
        setBeneficiaires((prev) => [nouveau, ...prev]);
        notifier(
          'succes',
          'Bénéficiaire enregistré',
          `${nouveau.prenom} ${nouveau.nom} (${nouveau.matricule} • ${nouveau.situation}) a été enregistré.`
        );
        return true;
      } catch (error) {
        notifier(
          'erreur',
          'Enregistrement impossible',
          messageErreur(error, "Le bénéficiaire n'a pas pu être enregistré.")
        );
        return false;
      }
    },
    [notifier]
  );

  const modifierBeneficiaire = useCallback(
    async (values) => {
      try {
        const modifie = await apiModifierBeneficiaire(values);
        setBeneficiaires((prev) =>
          prev.map((b) => (b.id === modifie.id ? modifie : b))
        );
        notifier(
          'succes',
          'Bénéficiaire modifié',
          `La fiche de ${modifie.prenom} ${modifie.nom} (${modifie.matricule}) a été mise à jour.`
        );
        return true;
      } catch (error) {
        notifier(
          'erreur',
          'Modification impossible',
          messageErreur(error, "La fiche n'a pas pu être modifiée.")
        );
        return false;
      }
    },
    [notifier]
  );

  const suspendre = useCallback(
    async (beneficiaire) => {
      try {
        const modifie = await suspendreBeneficiaire(beneficiaire.id);
        setBeneficiaires((prev) =>
          prev.map((b) => (b.id === modifie.id ? modifie : b))
        );
        notifier(
          'succes',
          'Bénéficiaire suspendu',
          `${modifie.prenom} ${modifie.nom} ne fait plus partie de la liste active.`
        );
        return true;
      } catch (error) {
        notifier(
          'erreur',
          'Suspension impossible',
          messageErreur(error, 'Le bénéficiaire n’a pas pu être suspendu.')
        );
        return false;
      }
    },
    [notifier]
  );

  const reactiver = useCallback(
    async (beneficiaire) => {
      try {
        const modifie = await reactiverBeneficiaire(beneficiaire.id);
        setBeneficiaires((prev) =>
          prev.map((b) => (b.id === modifie.id ? modifie : b))
        );
        notifier(
          'succes',
          'Bénéficiaire réactivé',
          `${modifie.prenom} ${modifie.nom} est de nouveau actif.`
        );
        return true;
      } catch (error) {
        notifier(
          'erreur',
          'Réactivation impossible',
          messageErreur(error, 'Le bénéficiaire n’a pas pu être réactivé.')
        );
        return false;
      }
    },
    [notifier]
  );

  const supprimerBeneficiaire = useCallback(
    async (beneficiaire) => {
      try {
        await apiSupprimerBeneficiaire(beneficiaire.id);
        setBeneficiaires((prev) => prev.filter((b) => b.id !== beneficiaire.id));
        notifier(
          'succes',
          'Bénéficiaire supprimé',
          `${beneficiaire.prenom} ${beneficiaire.nom} a été retiré de la liste.`
        );
        return true;
      } catch (error) {
        notifier(
          'erreur',
          'Suppression impossible',
          messageErreur(error, "Le bénéficiaire n'a pas pu être supprimé.")
        );
        return false;
      }
    },
    [notifier]
  );

  return {
    beneficiaires,
    chargement: sessionActive ? chargementApi : false,
    ajouterBeneficiaire,
    modifierBeneficiaire,
    suspendreBeneficiaire: suspendre,
    reactiverBeneficiaire: reactiver,
    supprimerBeneficiaire,
  };
}
