"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { COOKIE_SESSION_MARKER, getAdminMe, login } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

function clearAdminSession() {
    window.localStorage.removeItem("bigotti-admin-token");
    window.localStorage.removeItem("bigotti-admin-user");
}

function saveAdminSessionMarker(user: AuthUser) {
    window.localStorage.setItem("bigotti-admin-token", COOKIE_SESSION_MARKER);
    window.localStorage.setItem("bigotti-admin-user", JSON.stringify(user));
}

function getAdminRedirectPath(user: AuthUser) {
    if (user.role === "MANAGER") {
        return "/admin/dashboard";
    }

    return "/admin/commandes";
}

export default function AdminLoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        getAdminMe()
            .then((user) => {
                if (!user.isActive) {
                    throw new Error("Compte admin désactivé.");
                }

                saveAdminSessionMarker(user);
                router.replace(getAdminRedirectPath(user));
            })
            .catch(() => {
                clearAdminSession();
            });
    }, [router]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPassword = password;

        setError("");

        if (!normalizedEmail || !normalizedPassword) {
            setError("Veuillez saisir votre email et votre mot de passe.");
            return;
        }

        if (normalizedPassword.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caractères.");
            return;
        }

        try {
            setIsSubmitting(true);

            const response = await login({
                email: normalizedEmail,
                password: normalizedPassword,
            });

            if (!response.user.isActive) {
                throw new Error("Ce compte administrateur est désactivé.");
            }

            if (
                response.user.role !== "SUPER_ADMIN" &&
                response.user.role !== "ADMIN" &&
                response.user.role !== "MANAGER"
            ) {
                throw new Error("Ce compte n’a pas accès à l’administration.");
            }

            saveAdminSessionMarker(response.user);
            router.replace(getAdminRedirectPath(response.user));
        } catch (err) {
            clearAdminSession();

            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la connexion.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-neutral-950">
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

                    <h1 className="mt-8 text-3xl font-bold">
                        Espace administration
                    </h1>

                    <p className="mt-2 text-sm text-neutral-500">
                        Connectez-vous avec un compte autorisé.
                    </p>
                </div>

                {error && (
                    <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <div>
                        <label className="text-sm font-semibold">Email</label>

                        <input
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="admin@bigotti.tn"
                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold">
                            Mot de passe
                        </label>

                        <div className="mt-2 flex items-center rounded-2xl border border-neutral-300 px-4 focus-within:border-black">
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                placeholder="Votre mot de passe"
                                className="w-full py-3 outline-none"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword((current) => !current)
                                }
                                className="text-neutral-500 hover:text-black"
                                aria-label={
                                    showPassword
                                        ? "Masquer le mot de passe"
                                        : "Afficher le mot de passe"
                                }
                            >
                                {showPassword ? (
                                    <EyeOff size={18} />
                                ) : (
                                    <Eye size={18} />
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-full bg-black px-6 py-4 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                    >
                        {isSubmitting ? "Connexion..." : "Se connecter"}
                    </button>
                </form>

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
