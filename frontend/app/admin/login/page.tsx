'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { GoogleIdentityButton } from '@/components/customer-auth/GoogleIdentityButton';
import {
  COOKIE_SESSION_MARKER,
  getAdminMe,
  login,
  loginAdminWithGoogle,
} from '@/lib/api';
import type { AuthUser } from '@/types/auth';

function clearAdminSession() {
  window.localStorage.removeItem('bigotti-admin-token');
  window.localStorage.removeItem('bigotti-admin-user');
}

function saveAdminSessionMarker(user: AuthUser) {
  window.localStorage.setItem('bigotti-admin-token', COOKIE_SESSION_MARKER);
  window.localStorage.setItem('bigotti-admin-user', JSON.stringify(user));
}

function getAdminRedirectPath(user: AuthUser) {
  if (user.role === 'MANAGER') {
    return '/admin/dashboard';
  }

  return '/admin/commandes';
}

function assertAuthorizedAdmin(user: AuthUser) {
  if (!user.isActive) {
    throw new Error('Ce compte administrateur est désactivé.');
  }

  if (
    user.role !== 'SUPER_ADMIN' &&
    user.role !== 'ADMIN' &&
    user.role !== 'MANAGER'
  ) {
    throw new Error('Ce compte n’a pas accès à l’administration.');
  }
}

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  useEffect(() => {
    getAdminMe()
      .then((user) => {
        assertAuthorizedAdmin(user);
        saveAdminSessionMarker(user);
        router.replace(getAdminRedirectPath(user));
      })
      .catch(() => {
        clearAdminSession();
      });
  }, [router]);

  function completeLogin(user: AuthUser) {
    assertAuthorizedAdmin(user);
    saveAdminSessionMarker(user);
    router.replace(getAdminRedirectPath(user));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password;

    setError('');

    if (!normalizedEmail || !normalizedPassword) {
      setError('Veuillez saisir votre email et votre mot de passe.');
      return;
    }

    if (normalizedPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await login({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      completeLogin(response.user);
    } catch (err) {
      clearAdminSession();
      setError(
        err instanceof Error ? err.message : 'Erreur lors de la connexion.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleCredential(credential: string) {
    setError('');

    try {
      setIsGoogleSubmitting(true);

      const response = await loginAdminWithGoogle({ credential });

      completeLogin(response.user);
    } catch (err) {
      clearAdminSession();
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la connexion Google administrateur.',
      );
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  const isBusy = isSubmitting || isGoogleSubmitting;

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 py-10 text-neutral-950">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
            <LockKeyhole size={28} />
          </div>

          <img
            src="/images/bigotti-logo.jpg"
            alt="Bigotti Collection"
            className="mx-auto mt-6 h-20 w-auto object-contain"
          />

          <h1 className="mt-8 text-3xl font-bold">Espace administration</h1>

          <p className="mt-2 text-sm text-neutral-500">
            Connectez-vous avec un compte autorisé.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="admin-email" className="text-sm font-semibold">
              Email
            </label>

            <input
              id="admin-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@bigotti.tn"
              disabled={isBusy}
              className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="admin-password"
                className="text-sm font-semibold"
              >
                Mot de passe
              </label>

              <Link
                href="/admin/mot-de-passe-oublie"
                className="text-xs font-semibold text-neutral-500 hover:text-black"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <div className="mt-2 flex items-center rounded-2xl border border-neutral-300 px-4 focus-within:border-black">
              <input
                id="admin-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Votre mot de passe"
                disabled={isBusy}
                className="w-full py-3 outline-none disabled:bg-transparent"
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={isBusy}
                className="text-neutral-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={
                  showPassword
                    ? 'Masquer le mot de passe'
                    : 'Afficher le mot de passe'
                }
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="w-full rounded-full bg-black px-6 py-4 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {isSubmitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="my-7 flex items-center gap-4" aria-hidden="true">
          <div className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
            ou
          </span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <GoogleIdentityButton
          text="signin_with"
          onCredential={handleGoogleCredential}
          disabled={isBusy}
        />

        <p className="mt-4 text-center text-xs leading-5 text-neutral-500">
          Google ne crée aucun compte administrateur. Seuls les utilisateurs
          actifs déjà enregistrés dans Bigotti peuvent être liés.
        </p>

        <Link
          href="/"
          className="mt-6 block text-center text-sm text-neutral-500 hover:text-black"
        >
          Retour boutique
        </Link>
      </div>
    </main>
  );
}
