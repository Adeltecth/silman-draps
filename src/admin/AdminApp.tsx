import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { AdminUser } from '@shared/types';
import { adminApi } from '../lib/api';
import { Spinner } from '../components/ui';

interface AuthValue {
  user: AdminUser | null;
  loading: boolean;
  setUser: (user: AdminUser | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({ user: null, loading: true, setUser: () => {}, logout: async () => {} });
export const useAuth = () => useContext(AuthContext);

/** Fournit l'état de session admin à toutes les routes /admin (connexion comprise). */
export function AdminAuthProvider() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    adminApi
      .get<{ user: AdminUser }>('/auth/me')
      .then((data) => active && setUser(data.user))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));

    const onUnauthorized = () => setUser(null);
    window.addEventListener('silima:unauthorized', onUnauthorized);
    return () => {
      active = false;
      window.removeEventListener('silima:unauthorized', onUnauthorized);
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminApi.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, setUser, logout }), [user, loading, logout]);
  return (
    <AuthContext.Provider value={value}>
      <Outlet />
    </AuthContext.Provider>
  );
}

/** Bloque l'accès aux pages privées tant que la session n'est pas validée côté serveur. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100">
        <div className="flex items-center gap-3 text-ink-500">
          <Spinner /> Vérification de la session…
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
