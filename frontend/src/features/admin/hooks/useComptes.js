import { useState } from 'react';

export default function useComptes(notifier) {
  const [comptes, setComptes] = useState([]);
  const [filtreStatut, setFiltreStatut] = useState('actif');

  const comptesFiltres = comptes.filter((c) =>
    filtreStatut === 'tous' ? true : c.statut === filtreStatut
  );

  const creerCompte = ({ nom, email, motDePasse, role, statut }) => {
    const nomPropre = (nom || '').trim();
    const emailPropre = (email || '').trim().toLowerCase();

    if (!nomPropre || !emailPropre || !(motDePasse || '').trim()) {
      notifier(
        'erreur',
        'Compte inexistant ou incomplet',
        'Veuillez renseigner le nom, l’adresse e-mail et le mot de passe.'
      );
      return false;
    }

    const existeDeja = comptes.some(
      (c) =>
        c.nom.toLowerCase() === nomPropre.toLowerCase() ||
        c.email.toLowerCase() === emailPropre
    );
    if (existeDeja) {
      notifier(
        'erreur',
        'Compte déjà existant',
        'Un compte avec ce nom ou cette adresse e-mail existe déjà.'
      );
      return false;
    }

    const nouveauCompte = {
      id: Date.now(),
      nom: nomPropre,
      email: emailPropre,
      role,
      statut,
      protege: false,
    };

    setComptes([nouveauCompte, ...comptes]);
    notifier(
      'succes',
      'Compte créé avec succès',
      `Le compte de ${nouveauCompte.nom} (${nouveauCompte.email}) a été créé.`
    );
    return true;
  };

  const modifierCompte = (compte) => {
    const nomPropre = (compte?.nom || '').trim();
    const emailPropre = (compte?.email || '').trim().toLowerCase();

    if (!nomPropre || !emailPropre) {
      notifier(
        'erreur',
        'Compte invalide',
        'Le nom et l’adresse e-mail sont obligatoires.'
      );
      return false;
    }

    setComptes((prev) =>
      prev.map((c) =>
        c.id === compte.id
          ? {
              ...c,
              nom: nomPropre,
              email: emailPropre,
              role: compte.role,
              statut: compte.statut,
            }
          : c
      )
    );
    notifier(
      'succes',
      'Compte modifié',
      `Les informations de ${nomPropre} ont été enregistrées.`
    );
    return true;
  };

  const supprimerCompte = (compte) => {
    if (compte.protege) {
      notifier(
        'erreur',
        'Échec de la suppression',
        `Le compte "${compte.nom}" est protégé et ne peut pas être supprimé.`
      );
      return;
    }
    setComptes((prev) => prev.filter((c) => c.id !== compte.id));
    notifier(
      'succes',
      'Suppression réussie',
      `Le compte "${compte.nom}" a été supprimé.`
    );
  };

  return {
    comptes,
    comptesFiltres,
    filtreStatut,
    setFiltreStatut,
    creerCompte,
    modifierCompte,
    supprimerCompte,
  };
}
