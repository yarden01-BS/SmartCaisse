const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(
  /\/$/,
  ''
);
const ACCESS_TOKEN_KEY = 'smartcaisse_admin_access_token';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

function setAccessToken(token) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

function clearAccessToken() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

async function apiRequest(path, { method = 'GET', body, authenticated = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = getAccessToken();
  if (authenticated && token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Serveur SmartCaisse inaccessible.', 0);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = payload?.detail;
    const message =
      response.status === 404
        ? `Ressource introuvable (${path}). Vérifiez que le backend est à jour et redémarré.`
        : typeof detail === 'string'
          ? detail
          : `Erreur serveur (${response.status}).`;
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return null;
  return response.json();
}

function formaterAdmin(user) {
  const prenom = user.profile?.first_name ?? '';
  const nom = user.profile?.last_name ?? '';
  return {
    accountId: user.account_id,
    email: user.email,
    role: user.role,
    prenom,
    nom: [prenom, nom].filter(Boolean).join(' ').trim() || user.email,
  };
}

function formaterBeneficiaire(beneficiaire) {
  return {
    id: beneficiaire.id,
    matricule: beneficiaire.matricule,
    nom: beneficiaire.last_name,
    prenom: beneficiaire.first_name,
    profession: beneficiaire.profession,
    situation: beneficiaire.situation,
    isActive: beneficiaire.is_active,
    createdAt: beneficiaire.created_at,
  };
}

function formaterCompte(compte) {
  return {
    id: compte.id,
    nom: compte.nom,
    prenom: compte.prenom,
    email: compte.email,
    role: compte.role === 'admin' ? 'Administrateur' : 'Caissière',
    statut: compte.is_active ? 'actif' : 'suspendu',
  };
}

export async function loginAdmin(email, motDePasse) {
  let result;
  try {
    result = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: email.trim().toLowerCase(), password: motDePasse },
    });
  } catch (error) {
    if (error.status === 401) {
      throw new Error('Email ou mot de passe incorrect.');
    }
    throw error;
  }

  if (result.role !== 'admin') {
    throw new Error('Seuls les comptes administrateur peuvent ouvrir cet espace.');
  }

  setAccessToken(result.access_token);
  try {
    return formaterAdmin(await apiRequest('/me', { authenticated: true }));
  } catch (error) {
    clearAccessToken();
    throw error;
  }
}

export async function restoreAdminSession() {
  if (!getAccessToken()) return null;

  try {
    const user = await apiRequest('/me', { authenticated: true });
    if (user.role !== 'admin') {
      clearAccessToken();
      return null;
    }
    return formaterAdmin(user);
  } catch {
    clearAccessToken();
    return null;
  }
}

export async function logoutAdmin() {
  try {
    await apiRequest('/auth/logout', { method: 'POST', authenticated: true });
  } finally {
    clearAccessToken();
  }
}

export async function getBeneficiaires() {
  const beneficiaires = await apiRequest('/beneficiaries?sort=recent', {
    authenticated: true,
  });
  return beneficiaires.map(formaterBeneficiaire);
}

export async function creerBeneficiaire({
  matricule,
  nom,
  prenom,
  profession,
  situation,
}) {
  return formaterBeneficiaire(
    await apiRequest('/beneficiaries', {
      method: 'POST',
      authenticated: true,
      body: {
        matricule: matricule.trim().toUpperCase().replace(/\s+/g, ''),
        first_name: prenom.trim(),
        last_name: nom.trim(),
        profession: profession.trim(),
        situation,
      },
    })
  );
}

export async function modifierBeneficiaire(beneficiaire) {
  return formaterBeneficiaire(
    await apiRequest(`/beneficiaries/${beneficiaire.id}`, {
      method: 'PATCH',
      authenticated: true,
      body: {
        first_name: String(beneficiaire.prenom || '').trim(),
        last_name: String(beneficiaire.nom || '').trim(),
        profession: String(beneficiaire.profession || '').trim(),
        situation: beneficiaire.situation,
      },
    })
  );
}

export async function suspendreBeneficiaire(id) {
  return formaterBeneficiaire(
    await apiRequest(`/beneficiaries/${id}/suspend`, {
      method: 'POST',
      authenticated: true,
    })
  );
}

export async function reactiverBeneficiaire(id) {
  return formaterBeneficiaire(
    await apiRequest(`/beneficiaries/${id}`, {
      method: 'PATCH',
      authenticated: true,
      body: { is_active: true },
    })
  );
}

export async function supprimerBeneficiaire(id) {
  return apiRequest(`/beneficiaries/${id}`, {
    method: 'DELETE',
    authenticated: true,
  });
}

export async function getComptes() {
  const comptes = await apiRequest('/admin/accounts', { authenticated: true });
  return comptes.map(formaterCompte);
}

export async function creerCompte({ nom, email, motDePasse, role, statut }) {
  return formaterCompte(
    await apiRequest('/admin/accounts', {
      method: 'POST',
      authenticated: true,
      body: {
        nom: nom.trim(),
        email: email.trim().toLowerCase(),
        password: motDePasse,
        role: role === 'Administrateur' ? 'admin' : 'cashier',
        is_active: statut !== 'suspendu',
      },
    })
  );
}

export async function modifierCompte(compte, motDePasse) {
  const body = {
    nom: compte.nom,
    email: compte.email,
    is_active: compte.statut !== 'suspendu',
  };
  if (motDePasse) body.password = motDePasse;

  return formaterCompte(
    await apiRequest(`/admin/accounts/${compte.id}`, {
      method: 'PATCH',
      authenticated: true,
      body,
    })
  );
}

export async function supprimerCompte(id) {
  return apiRequest(`/admin/accounts/${id}`, {
    method: 'DELETE',
    authenticated: true,
  });
}
