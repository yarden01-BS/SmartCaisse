const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(
  /\/$/,
  ''
);
const ACCESS_TOKEN_KEY = 'smartcaisse_access_token';

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
      typeof detail === 'string' ? detail : `Erreur serveur (${response.status}).`;
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return null;
  return response.json();
}

function toCashier(user) {
  const profile = user.profile ?? {};
  const nom = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();

  return {
    accountId: user.account_id,
    nom: nom || user.email,
    email: user.email,
    role: user.role,
    isActive: user.is_active,
    company: profile.company ?? '',
  };
}

function statut(situation) {
  return situation === 'stagiare' ? 'Stagiaire' : 'Travailleur';
}

function dateHeure(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const deuxChiffres = (valeur) => String(valeur).padStart(2, '0');
  return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())} ${deuxChiffres(date.getHours())}:${deuxChiffres(date.getMinutes())}`;
}

function formaterClient(beneficiaire) {
  return {
    id: beneficiaire.id,
    matricule: beneficiaire.matricule,
    nom: `${beneficiaire.first_name} ${beneficiaire.last_name}`.trim(),
    statut: statut(beneficiaire.situation),
    service: beneficiaire.profession,
  };
}

export function formaterBon(order) {
  const transaction = order.transaction;
  return {
    id: order.id,
    numBon: String(order.id),
    date: dateHeure(order.order_date),
    client: formaterClient(order.beneficiary),
    prixTotal: order.amount,
    partEntreprise: transaction?.company_share ?? 0,
    partClient: transaction?.customer_share ?? 0,
    paye: Boolean(transaction),
  };
}

export function formaterRapport(rapport) {
  if (!rapport) {
    return {
      totaux: { nbBons: 0, ventes: 0, client: 0, siat: 0 },
      lignes: [],
    };
  }

  return {
    totaux: {
      nbBons: rapport.transaction_count,
      ventes: rapport.total_amount,
      client: rapport.customer_share,
      siat: rapport.company_share,
    },
    lignes: rapport.beneficiaries.map((beneficiaire) => ({
      matricule: beneficiaire.matricule,
      nom: `${beneficiaire.first_name} ${beneficiaire.last_name}`.trim(),
      statut: statut(beneficiaire.situation),
      service: beneficiaire.profession,
      nbBons: beneficiaire.transaction_count,
      total: beneficiaire.total_amount,
      client: beneficiaire.customer_share,
      siat: beneficiaire.company_share,
    })),
  };
}

export async function login(email, password) {
  let result;
  try {
    result = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  } catch (error) {
    if (error.status === 401) {
      throw new Error('Email ou mot de passe incorrect.');
    }
    throw error;
  }

  if (result.role !== 'cashier') {
    throw new Error('Seuls les comptes caissier peuvent ouvrir la caisse.');
  }

  setAccessToken(result.access_token);
  try {
    return toCashier(await apiRequest('/me', { authenticated: true }));
  } catch (error) {
    clearAccessToken();
    throw error;
  }
}

export async function restoreSession() {
  if (!getAccessToken()) return null;

  try {
    const user = await apiRequest('/me', { authenticated: true });
    if (user.role !== 'cashier') {
      clearAccessToken();
      return null;
    }
    return toCashier(user);
  } catch {
    clearAccessToken();
    return null;
  }
}

export async function logout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST', authenticated: true });
  } finally {
    clearAccessToken();
  }
}

export async function getBeneficiaires() {
  const beneficiaires = await apiRequest('/cashier/beneficiaries', {
    authenticated: true,
  });
  return beneficiaires.map(formaterClient);
}

export async function getBons() {
  const bons = await apiRequest('/cashier/purchase-orders', {
    authenticated: true,
  });
  return bons.map(formaterBon);
}

export async function creerBon({ beneficiaryId, amount }) {
  return apiRequest('/cashier/purchase-orders', {
    method: 'POST',
    authenticated: true,
    body: {
      beneficiary_id: beneficiaryId,
      amount,
    },
  });
}

export async function payerBon(orderId) {
  return apiRequest(`/cashier/purchase-orders/${orderId}/transactions`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function getRapport(periode) {
  const valeur = periode === 'jour' ? 'daily' : 'monthly';
  return apiRequest(`/cashier/reports?period=${valeur}`, { authenticated: true });
}
