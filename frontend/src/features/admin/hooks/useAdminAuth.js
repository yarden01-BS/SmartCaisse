import { useState } from 'react';

export default function useAdminAuth() {
  const [adminUser, setAdminUser] = useState(null);

  const login = (nom) => setAdminUser({ id: 1, nom: nom.trim() });
  const logout = () => setAdminUser(null);

  return { adminUser, login, logout };
}
