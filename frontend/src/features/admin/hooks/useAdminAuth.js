import { useCallback, useEffect, useState } from 'react';
import { loginAdmin, logoutAdmin, restoreAdminSession } from '../api';

export default function useAdminAuth() {
  const [adminUser, setAdminUser] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let actif = true;
    restoreAdminSession()
      .then((user) => {
        if (actif) setAdminUser(user);
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, []);

  const login = useCallback(async (email, motDePasse) => {
    const user = await loginAdmin(email, motDePasse);
    setAdminUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutAdmin();
    } finally {
      setAdminUser(null);
    }
  }, []);

  return { adminUser, chargement, login, logout };
}
