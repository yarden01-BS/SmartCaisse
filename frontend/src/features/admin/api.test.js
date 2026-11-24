import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  creerBeneficiaire,
  creerCompte,
  getComptes,
  loginAdmin,
  restoreAdminSession,
  supprimerCompte,
} from './api';

const TOKEN_KEY = 'smartcaisse_admin_access_token';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('admin/api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stocke le jeton et formate le profil après une connexion admin', async () => {
    fetch
      .mockResolvedValueOnce(
        json({ access_token: 'token-123', role: 'admin', account_id: 7 })
      )
      .mockResolvedValueOnce(
        json({
          account_id: 7,
          email: 'admin@smartcaisse.com',
          role: 'admin',
          is_active: true,
          profile: { first_name: 'Danielle', last_name: 'Johnson' },
        })
      );

    const admin = await loginAdmin(' Admin@SmartCaisse.com ', 'password123');

    expect(admin).toEqual({
      accountId: 7,
      email: 'admin@smartcaisse.com',
      role: 'admin',
      prenom: 'Danielle',
      nom: 'Danielle Johnson',
    });
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('token-123');

    const [loginUrl, loginOptions] = fetch.mock.calls[0];
    expect(loginUrl).toBe('http://localhost:8000/auth/login');
    expect(JSON.parse(loginOptions.body)).toEqual({
      email: 'admin@smartcaisse.com',
      password: 'password123',
    });

    const [, meOptions] = fetch.mock.calls[1];
    expect(meOptions.headers.Authorization).toBe('Bearer token-123');
  });

  it('refuse un compte caissier sans conserver le jeton', async () => {
    fetch.mockResolvedValueOnce(
      json({ access_token: 'jeton-caissier', role: 'cashier' })
    );

    await expect(loginAdmin('cashier@smartcaisse.com', 'password123')).rejects.toThrow(
      /administrateur/
    );
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('nettoie la session lorsqu’un jeton sauvegardé est invalide', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'expired');
    fetch.mockResolvedValueOnce(json({ detail: 'Token expired' }, 401));

    await expect(restoreAdminSession()).resolves.toBeNull();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('ajoute le bearer et mappe les comptes de l’API', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'token-123');
    fetch.mockResolvedValueOnce(
      json([
        {
          id: 1,
          email: 'admin@smartcaisse.com',
          role: 'admin',
          is_active: true,
          nom: 'Danielle Johnson',
          prenom: 'Danielle',
        },
      ])
    );

    const comptes = await getComptes();

    expect(comptes).toEqual([
      {
        id: 1,
        email: 'admin@smartcaisse.com',
        role: 'Administrateur',
        statut: 'actif',
        nom: 'Danielle Johnson',
        prenom: 'Danielle',
      },
    ]);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token-123');
  });

  it('normalise les champs lors de la création d’un bénéficiaire', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'token-123');
    fetch.mockResolvedValueOnce(
      json({
        id: 9,
        first_name: 'Jane',
        last_name: 'Doe',
        matricule: 'SIAT-009',
        profession: 'Teacher',
        situation: 'permanent',
        is_active: true,
      })
    );

    await creerBeneficiaire({
      matricule: ' siat- 009 ',
      nom: ' Doe ',
      prenom: ' Jane ',
      profession: ' Teacher ',
      situation: 'permanent',
    });

    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      matricule: 'SIAT-009',
      first_name: 'Jane',
      last_name: 'Doe',
      profession: 'Teacher',
      situation: 'permanent',
    });
  });

  it('expose le détail d’erreur du backend', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'token-123');
    fetch.mockResolvedValueOnce(
      json({ detail: 'Email already in use' }, 409)
    );

    await expect(
      creerCompte({
        nom: 'Jane Doe',
        email: 'jane@siat.cg',
        motDePasse: 'secret',
        role: 'Caissière',
        statut: 'actif',
      })
    ).rejects.toMatchObject({ status: 409, message: 'Email already in use' });
  });

  it('gère une suppression 204 sans corps', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'token-123');
    fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(supprimerCompte(12)).resolves.toBeNull();
    expect(fetch.mock.calls[0][1].method).toBe('DELETE');
  });
});
