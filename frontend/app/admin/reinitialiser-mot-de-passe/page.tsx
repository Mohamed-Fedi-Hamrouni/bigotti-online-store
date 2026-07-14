"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { resetAdminPassword } from "@/lib/api";

export default function AdminResetPasswordPage() {
    const [token, setToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        setToken(searchParams.get("token") ?? "");
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage("");
        setError("");

        if (!token) {
            setError("Le lien de réinitialisation est incomplet.");
            return;
        }

        if (newPassword.length < 8) {
            setError("Le mot de passe doit contenir au moins 8 caractères.");
            return;
        }

        if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
            setError(
                "Le mot de passe doit contenir au moins une lettre et un chiffre.",
            );
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await resetAdminPassword({
                token,
                newPassword,
                confirmPassword,
            });

            setMessage(response.message);
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Impossible de réinitialiser le mot de passe.",
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
                    Nouveau mot de passe
                </h1>

                <p className="mt-5 leading-7 text-neutral-600">
                    La réinitialisation déconnectera toutes les sessions
                    administrateur actuellement actives pour ce compte.
                </p>

                {!token && (
                    <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                        Le token est absent du lien. Demandez un nouveau lien.
                    </div>
                )}

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

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <div>
                        <label className="text-sm font-bold">
                            Nouveau mot de passe
                        </label>

                        <div className="mt-2 flex items-center rounded-2xl border border-neutral-300 px-4 focus-within:border-black">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                minLength={8}
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(event) =>
                                    setNewPassword(event.target.value)
                                }
                                placeholder="8 caractères, lettre et chiffre"
                                className="w-full py-3 outline-none"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword((current) => !current)
                                }
                                aria-label={
                                    showPassword
                                        ? "Masquer le mot de passe"
                                        : "Afficher le mot de passe"
                                }
                                className="text-neutral-500 hover:text-black"
                            >
                                {showPassword ? (
                                    <EyeOff size={18} />
                                ) : (
                                    <Eye size={18} />
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-bold">
                            Confirmer le mot de passe
                        </label>

                        <div className="mt-2 flex items-center rounded-2xl border border-neutral-300 px-4 focus-within:border-black">
                            <input
                                type={
                                    showConfirmPassword ? "text" : "password"
                                }
                                required
                                minLength={8}
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(event) =>
                                    setConfirmPassword(event.target.value)
                                }
                                placeholder="Confirmer le mot de passe"
                                className="w-full py-3 outline-none"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowConfirmPassword(
                                        (current) => !current,
                                    )
                                }
                                aria-label={
                                    showConfirmPassword
                                        ? "Masquer la confirmation"
                                        : "Afficher la confirmation"
                                }
                                className="text-neutral-500 hover:text-black"
                            >
                                {showConfirmPassword ? (
                                    <EyeOff size={18} />
                                ) : (
                                    <Eye size={18} />
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !token}
                        className="w-full rounded-full bg-black px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                    >
                        {isSubmitting
                            ? "Réinitialisation..."
                            : "Enregistrer le mot de passe"}
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
