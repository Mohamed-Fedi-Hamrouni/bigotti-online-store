"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { MailCheck } from "lucide-react";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { requestCustomerPasswordReset } from "@/lib/api";

export default function CustomerForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [debugResetUrl, setDebugResetUrl] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage("");
        setError("");
        setDebugResetUrl("");

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            setError("Veuillez saisir votre adresse email.");
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await requestCustomerPasswordReset(
                normalizedEmail,
            );

            setMessage(response.message);
            setDebugResetUrl(response.debugResetUrl ?? "");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Impossible d’envoyer la demande pour le moment.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <PublicHeader />

            <section className="mx-auto flex max-w-7xl justify-center px-6 py-14">
                <div className="w-full max-w-xl rounded-[2rem] bg-white p-8 shadow-sm md:p-10">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
                        <MailCheck size={26} />
                    </div>

                    <p className="mt-7 text-sm font-black uppercase tracking-[0.25em] text-neutral-500">
                        Sécurité du compte
                    </p>

                    <h1 className="mt-3 text-4xl font-black uppercase leading-none">
                        Mot de passe oublié
                    </h1>

                    <p className="mt-5 leading-7 text-neutral-600">
                        Saisissez l’adresse email associée à votre compte. Si le
                        compte existe, vous recevrez un lien sécurisé valable 20
                        minutes.
                    </p>

                    {message && (
                        <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                            {error}
                        </div>
                    )}

                    {debugResetUrl && (
                        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                            <p className="font-black">Mode développement</p>
                            <Link
                                href={debugResetUrl}
                                className="mt-2 block break-all underline"
                            >
                                Ouvrir le lien de réinitialisation
                            </Link>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-8">
                        <label className="text-sm font-bold">Adresse email</label>

                        <input
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="client@email.com"
                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                        />

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="mt-6 w-full rounded-full bg-black px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                        >
                            {isSubmitting
                                ? "Envoi en cours..."
                                : "Envoyer le lien"}
                        </button>
                    </form>

                    <Link
                        href="/compte/login"
                        className="mt-6 block text-center text-sm font-bold text-neutral-600 hover:text-black"
                    >
                        Retour à la connexion
                    </Link>
                </div>
            </section>

            <PublicFooter />
        </main>
    );
}
