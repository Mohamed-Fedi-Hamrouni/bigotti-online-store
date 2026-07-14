"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { GoogleIdentityButton } from "@/components/customer-auth/GoogleIdentityButton";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { loginCustomer, loginCustomerWithGoogle } from "@/lib/api";

export default function CustomerLoginPage() {
  const router = useRouter();
  const { saveCustomerSession, isAuthenticated, isLoading } = useCustomerAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/compte");
    }
  }, [isLoading, isAuthenticated, router]);

  async function completeLogin(
    request: () => ReturnType<typeof loginCustomer>,
  ) {
    const response = await request();

    if (!response.customer.isActive) {
      throw new Error("Ce compte client est désactivé.");
    }

    saveCustomerSession(response);
    router.replace("/compte");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    setError("");

    if (!normalizedEmail || !password) {
      setError("Veuillez saisir votre email et votre mot de passe.");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    try {
      setIsSubmitting(true);

      await completeLogin(() =>
        loginCustomer({
          email: normalizedEmail,
          password,
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Email ou mot de passe incorrect.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleCredential(credential: string) {
    setError("");

    try {
      setIsGoogleSubmitting(true);
      await completeLogin(() =>
        loginCustomerWithGoogle({
          credential,
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "La connexion Google a échoué.",
      );
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  const isBusy = isSubmitting || isGoogleSubmitting;

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <PublicHeader />

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1fr_460px] lg:items-center">
        <div className="rounded-[3rem] bg-neutral-950 p-10 text-white">
          <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">
            Bigotti Collection
          </p>

          <h1 className="mt-5 max-w-3xl text-5xl font-black uppercase leading-none md:text-7xl">
            Connexion client
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
            Connectez-vous pour accéder à votre espace client, retrouver vos
            informations et suivre vos commandes.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[2rem] bg-white p-8 shadow-sm"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
            <LogIn size={26} />
          </div>

          <h2 className="mt-6 text-3xl font-black">Connexion</h2>

          <p className="mt-3 text-neutral-600">
            Pas encore de compte ?{" "}
            <Link
              href="/compte/register"
              className="font-bold text-black underline"
            >
              Créer un compte
            </Link>
          </p>

          {error && (
            <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6">
            <GoogleIdentityButton
              text="signin_with"
              disabled={isBusy}
              onCredential={handleGoogleCredential}
            />

            {isGoogleSubmitting && (
              <p className="mt-2 text-center text-sm font-semibold text-neutral-600">
                Connexion Google en cours…
              </p>
            )}
          </div>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-neutral-200" />
            <span className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
              ou
            </span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-sm font-bold">Email</label>

              <input
                name="email"
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="client@email.com"
                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-bold">Mot de passe</label>

                <Link
                  href="/compte/mot-de-passe-oublie"
                  className="text-sm font-bold text-neutral-600 underline hover:text-black"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <div className="mt-2 flex items-center rounded-2xl border border-neutral-300 px-4 focus-within:border-black">
                <input
                  name="password"
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={6}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Votre mot de passe"
                  className="w-full py-3 outline-none"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="text-neutral-500 hover:text-black"
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="mt-8 w-full rounded-full bg-black px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </section>

      <PublicFooter />
    </main>
  );
}
