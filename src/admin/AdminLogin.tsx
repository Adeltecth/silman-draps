import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { AdminUser } from '@shared/types';
import { adminApi, ApiError } from '../lib/api';
import { useSettings } from '../lib/settings';
import { useAuth } from './AdminApp';
import { Alert, Field, Spinner } from '../components/ui';
import { EyeIcon, EyeOffIcon, LogoMark } from '../components/icons';
import { useSeo } from '../lib/seo';

export function AdminLogin() {
  const { user, setUser } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useSeo(`Connexion administrateur | ${settings.businessName}`, 'Accès réservé à l’administration de la boutique.');

  if (user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from.startsWith('/admin') ? from : '/admin'} replace />;
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await adminApi.post<{ user: AdminUser }>('/auth/login', { email, password });
      setUser(data.user);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible. Vérifiez votre réseau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      <div className="container-page flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={`Logo ${settings.businessName}`} className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              <LogoMark size={48} />
            )}
            <h1 className="mt-4 text-2xl">Espace de gestion</h1>
            <p className="mt-1.5 text-sm text-ink-500">{settings.businessName}</p>
          </div>

          <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-white p-6 shadow-soft">
            {error && (
              <Alert tone="error" className="mb-4">
                {error}
              </Alert>
            )}
            <div className="space-y-4">
              <Field label="Adresse e-mail" name="login-email" required>
                {(props) => (
                  <input
                    {...props}
                    type="email"
                    name="email"
                    autoComplete="username"
                    inputMode="email"
                    className="field-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                )}
              </Field>
              <Field label="Mot de passe" name="login-password" required>
                {(props) => (
                  <div className="relative">
                    <input
                      {...props}
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="current-password"
                      className="field-input pr-12"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-500 hover:bg-ink/5 hover:text-ink"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  </div>
                )}
              </Field>
            </div>

            <button type="submit" className="btn-primary mt-6 w-full" disabled={loading}>
              {loading ? <Spinner /> : null}
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
            <p className="mt-4 text-center text-xs leading-relaxed text-ink-500">
              Accès réservé. Les tentatives de connexion sont limitées pour protéger le compte.
            </p>
          </form>

          <p className="mt-6 text-center text-sm">
            <Link to="/" className="text-ink-500 link-underline hover:text-ink">
              ← Retour au site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
