"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { GoogleIdentityButton } from "@/components/customer-auth/GoogleIdentityButton";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import {
  registerCustomer,
  registerCustomerWithGoogle,
  resendCustomerVerification,
} from "@/lib/api";

function normalizePhone(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function isValidPhone(value: string) {
  return /^\+?[0-9]{8,15}$/.test(value);
}

function isValidPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export default function CustomerRegisterPage() {
  const router = useRouter();
  const { saveCustomerSession, isAuthenticated, isLoading } = useCustomerAuth();

  const [googlePhone, setGooglePhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/compte");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(
      () => setResendCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  async function completeRegistration(
    request: () => ReturnType<typeof registerCustomerWithGoogle>,
  ) {
    const response = await request();

    if (!response.customer.isActive) {
      throw new Error("Ce compte client est désactivé.");
    }

    saveCustomerSession(response);
    router.replace("/compte");
  }

  async function handleGoogleCredential(credential: string) {
    const normalizedGooglePhone = normalizePhone(googlePhone);

    setError("");

    if (!isValidPhone(normalizedGooglePhone)) {
      setError(
        "Saisissez d’abord un téléphone valide pour continuer avec Google.",
      );
      return;
    }

    try {
      setIsGoogleSubmitting(true);

      await completeRegistration(() =>
        registerCustomerWithGoogle({
          credential,
          phone: normalizedGooglePhone,
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "L’inscription Google a échoué.",
      );
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedPayload = {
      fullName: fullName.trim().replace(/\s+/g, " "),
      phone: normalizePhone(phone),
      email: email.trim().toLowerCase(),
      password,
    };

    if (
      !normalizedPayload.fullName ||
      !normalizedPayload.phone ||
      !normalizedPayload.email ||
      !normalizedPayload.password
    ) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (!isValidPhone(normalizedPayload.phone)) {
      setError(
        "Le téléphone doit contenir entre 8 et 15 chiffres, avec + optionnel.",
      );
      return;
    }

    if (!isValidPassword(password)) {
      setError(
        "Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await registerCustomer(normalizedPayload);
      setVerificationEmail(response.email);
      setResendCooldown(60);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l’inscription.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isBusy = isSubmitting || isGoogleSubmitting;

  async function handleResend() {
    if (!verificationEmail || resendCooldown > 0) return;
    setResendMessage("");
    await resendCustomerVerification(verificationEmail);
    setResendMessage(
      "Si votre compte est toujours en attente, un nouvel email a été envoyé.",
    );
    setResendCooldown(60);
  }

  if (verificationEmail) {
    return (
      <main className="min-h-screen bg-neutral-50 text-neutral-950">
        <PublicHeader />
        <section className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-6 py-12">
          <div className="w-full rounded-[2rem] bg-white p-10 text-center shadow-sm">
            <h1 className="text-4xl font-black">Vérifiez votre email</h1>
            <p className="mt-5 leading-7 text-neutral-600">
              Un lien de vérification a été envoyé à votre adresse. Cliquez sur
              ce lien avant de vous connecter. Il reste valable 24 heures.
            </p>
            {resendMessage && (
              <p className="mt-4 rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-700">
                {resendMessage}
              </p>
            )}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="mt-6 rounded-full border border-black px-6 py-3 text-sm font-bold disabled:opacity-50"
            >
              {resendCooldown > 0
                ? `Renvoyer dans ${resendCooldown} s`
                : "Renvoyer l’email de vérification"}
            </button>
            <div className="mt-6">
              <Link href="/compte/login" className="font-bold underline">
                Retour à la connexion
              </Link>
            </div>
          </div>
        </section>
        <PublicFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <PublicHeader />

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1fr_460px] lg:items-center">
        <div className="rounded-[3rem] bg-neutral-950 p-10 text-white">
          <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">
            Bigotti Collection
          </p>

          <h1 className="mt-5 max-w-3xl text-5xl font-black uppercase leading-none md:text-7xl">
            Créer votre compte
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
            Créez un compte client pour retrouver vos informations, consulter
            vos commandes et commander plus rapidement.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[2rem] bg-white p-8 shadow-sm"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
            <UserPlus size={26} />
          </div>

          <h2 className="mt-6 text-3xl font-black">Inscription</h2>

          <p className="mt-3 text-neutral-600">
            Déjà un compte ?{" "}
            <Link
              href="/compte/login"
              className="font-bold text-black underline"
            >
              Connectez-vous
            </Link>
          </p>

          {error && (
            <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <section className="mt-6 rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
            <h3 className="text-base font-black">S’inscrire avec Google</h3>

            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Votre nom et votre email vérifié seront récupérés depuis Google.
              Le téléphone reste nécessaire pour vos commandes et la livraison.
            </p>

            <label className="mt-4 block text-sm font-bold">Téléphone</label>

            <input
              name="googlePhone"
              value={googlePhone}
              onChange={(event) => setGooglePhone(event.target.value)}
              placeholder="20202020"
              autoComplete="tel"
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
            />

            <div className="mt-4">
              <GoogleIdentityButton
                text="signup_with"
                disabled={isBusy}
                onCredential={handleGoogleCredential}
              />
            </div>

            {isGoogleSubmitting && (
              <p className="mt-2 text-center text-sm font-semibold text-neutral-600">
                Création du compte Google en cours…
              </p>
            )}
          </section>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-neutral-200" />
            <span className="text-center text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
              ou avec email
            </span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-sm font-bold">Nom complet</label>

              <input
                name="fullName"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ahmed Ben Ali"
                autoComplete="name"
                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="text-sm font-bold">Téléphone</label>

              <input
                name="phone"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="20202020"
                autoComplete="tel"
                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="text-sm font-bold">Email</label>

              <input
                name="email"
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="client@email.com"
                autoComplete="email"
                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="text-sm font-bold">Mot de passe</label>

              <div className="mt-2 flex items-center rounded-2xl border border-neutral-300 px-4 focus-within:border-black">
                <input
                  name="password"
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="8 caractères, lettre et chiffre"
                  autoComplete="new-password"
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

            <div>
              <label className="text-sm font-bold">
                Confirmer le mot de passe
              </label>

              <div className="mt-2 flex items-center rounded-2xl border border-neutral-300 px-4 focus-within:border-black">
                <input
                  name="confirmPassword"
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirmer le mot de passe"
                  autoComplete="new-password"
                  className="w-full py-3 outline-none"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="text-neutral-500 hover:text-black"
                  aria-label={
                    showConfirmPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="mt-8 w-full rounded-full bg-black px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {isSubmitting ? "Création..." : "Créer mon compte"}
          </button>
        </form>
      </section>

      <PublicFooter />
    </main>
  );
}
