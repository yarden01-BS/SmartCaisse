import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../api';
import AdminPage from './AdminPage';

vi.mock('../api', () => ({
  loginAdmin: vi.fn(),
  restoreAdminSession: vi.fn(),
  logoutAdmin: vi.fn(),
  getComptes: vi.fn(),
  getBeneficiaires: vi.fn(),
  creerCompte: vi.fn(),
  modifierCompte: vi.fn(),
  supprimerCompte: vi.fn(),
  creerBeneficiaire: vi.fn(),
  modifierBeneficiaire: vi.fn(),
  suspendreBeneficiaire: vi.fn(),
  reactiverBeneficiaire: vi.fn(),
  supprimerBeneficiaire: vi.fn(),
}));

const admin = {
  accountId: 1,
  email: 'admin@smartcaisse.com',
  role: 'admin',
  prenom: 'Danielle',
  nom: 'Danielle Johnson',
};

const comptes = [
  {
    id: 1,
    nom: 'Danielle Johnson',
    prenom: 'Danielle',
    email: 'admin@smartcaisse.com',
    role: 'Administrateur',
    statut: 'actif',
  },
];

const beneficiaires = [
  {
    id: 1,
    matricule: 'SIAT-001',
    nom: 'Doe',
    prenom: 'Jane',
    profession: 'Teacher',
    situation: 'permanent',
    isActive: true,
  },
];

function renderAdminPage() {
  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>
  );
}

async function connecter() {
  const user = userEvent.setup();
  const champEmail = await screen.findByPlaceholderText('admin@smartcaisse.com');
  await user.type(champEmail, 'admin@smartcaisse.com');
  await user.type(screen.getByPlaceholderText('Mot de passe'), 'password123');
  await user.click(screen.getByRole('button', { name: 'Se connecter' }));
  return user;
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.mocked(api.restoreAdminSession).mockResolvedValue(null);
    vi.mocked(api.loginAdmin).mockResolvedValue(admin);
    vi.mocked(api.logoutAdmin).mockResolvedValue();
    vi.mocked(api.getComptes).mockResolvedValue(comptes);
    vi.mocked(api.getBeneficiaires).mockResolvedValue(beneficiaires);
    vi.mocked(api.creerBeneficiaire).mockResolvedValue({
      id: 2,
      matricule: 'SIAT-010',
      nom: 'Doe',
      prenom: 'Jane',
      profession: 'Teacher',
      situation: 'permanent',
      isActive: true,
    });
  });

  it('ne charge aucune donnée de gestion tant que la session admin est fermée', async () => {
    renderAdminPage();

    expect(
      await screen.findByPlaceholderText('admin@smartcaisse.com')
    ).toBeInTheDocument();
    expect(api.getComptes).not.toHaveBeenCalled();
    expect(api.getBeneficiaires).not.toHaveBeenCalled();
    expect(screen.queryByText('Chargement impossible')).not.toBeInTheDocument();
  });

  it('affiche l’erreur de connexion en ligne sans ouvrir de popup', async () => {
    vi.mocked(api.loginAdmin).mockRejectedValueOnce(
      new Error('Email ou mot de passe incorrect.')
    );
    renderAdminPage();

    await connecter();

    expect(
      await screen.findByText('Email ou mot de passe incorrect.')
    ).toBeInTheDocument();
    expect(api.getComptes).not.toHaveBeenCalled();
    expect(screen.queryByText('Chargement impossible')).not.toBeInTheDocument();
  });

  it('charge les comptes et les bénéficiaires depuis l’API après connexion', async () => {
    renderAdminPage();

    await connecter();

    expect(
      await screen.findByRole('heading', { name: 'Comptes Utilisateurs' })
    ).toBeInTheDocument();
    await screen.findAllByText('admin@smartcaisse.com');

    expect(api.loginAdmin).toHaveBeenCalledTimes(1);
    expect(api.getComptes).toHaveBeenCalledTimes(1);
    expect(api.getBeneficiaires).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Chargement impossible')).not.toBeInTheDocument();
  });

  it('restaure une session existante avant de charger les données', async () => {
    vi.mocked(api.restoreAdminSession).mockResolvedValue(admin);
    renderAdminPage();

    expect(
      await screen.findByRole('heading', { name: 'Comptes Utilisateurs' })
    ).toBeInTheDocument();
    expect(api.loginAdmin).not.toHaveBeenCalled();
    expect(api.getComptes).toHaveBeenCalledTimes(1);
    expect(api.getBeneficiaires).toHaveBeenCalledTimes(1);
  });

  it('signale une erreur de chargement uniquement après connexion', async () => {
    vi.mocked(api.getComptes).mockRejectedValue(new Error('API indisponible'));
    renderAdminPage();

    await connecter();

    expect(await screen.findByText('Chargement impossible')).toBeInTheDocument();
    expect(screen.getByText('API indisponible')).toBeInTheDocument();
  });

  it('crée un bénéficiaire via l’API et ferme le formulaire', async () => {
    renderAdminPage();
    const user = await connecter();

    await screen.findByRole('heading', { name: 'Comptes Utilisateurs' });
    await user.click(
      screen.getByRole('button', { name: 'Créer un nouveau bénéficiaire' })
    );

    await user.type(screen.getByPlaceholderText('Ex: Makosso'), 'Doe');
    await user.type(screen.getByPlaceholderText('Ex: Jean'), 'Jane');
    await user.type(screen.getByPlaceholderText('Ex: Comptable'), 'Teacher');
    await user.click(
      screen.getByRole('button', { name: 'Enregistrer le bénéficiaire' })
    );

    expect(api.creerBeneficiaire).toHaveBeenCalledWith({
      nom: 'Doe',
      prenom: 'Jane',
      profession: 'Teacher',
      situation: 'permanent',
    });
    expect(
      await screen.findByText('Bénéficiaire enregistré')
    ).toBeInTheDocument();
  });

  it('ne réaffiche pas un ancien popup après déconnexion puis reconnexion', async () => {
    vi.mocked(api.getComptes).mockRejectedValueOnce(new Error('API indisponible'));
    renderAdminPage();

    await connecter();
    expect(await screen.findByText('Chargement impossible')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Déconnexion' }));

    expect(
      await screen.findByPlaceholderText('admin@smartcaisse.com')
    ).toBeInTheDocument();
    await connecter();

    expect(
      await screen.findByRole('heading', { name: 'Comptes Utilisateurs' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Chargement impossible')).not.toBeInTheDocument();
  });
});
