"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { requestAdminPasswordReset } from "@/lib/api";

export default function AdminForgotPasswordPage() {
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
            const response = await requestAdminPasswordReset(normalizedEmail);

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
        <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 py-12 text-neutral-950">
            <div className="w-full max-w-xl rounded-[2rem] bg-white p-8 shadow-2xl md:p-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
                    <ShieldCheck size={26} />
                </div>

                <p className="mt-7 text-sm font-black uppercase tracking-[0.25em] text-neutral-500">
                    Administration sécurisée
                </p>

                <h1 className="mt-3 text-4xl font-black uppercase leading-none">
                    Mot de passe oublié
                </h1>

                <p className="mt-5 leading-7 text-neutral-600">
                    Un lien à usage unique sera envoyé si l’adresse correspond à
                    un compte administrateur actif.
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
                        placeholder="admin@bigotti.tn"
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
                    href="/admin/login"
                    className="mt-6 block text-center text-sm font-bold text-neutral-600 hover:text-black"
                >
                    Retour à la connexion admin
                </Link>
            </div>
        </main>
    );
}
