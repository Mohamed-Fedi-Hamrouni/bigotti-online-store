"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { registerCustomer } from "@/lib/api";

function normalizePhone(value: string) {
    return value.trim().replace(/\s+/g, "");
}

function isValidPassword(value: string) {
    return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export default function CustomerRegisterPage() {
    const router = useRouter();
    const { saveCustomerSession, isAuthenticated, isLoading } =
        useCustomerAuth();

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.replace("/compte");
        }
    }, [isLoading, isAuthenticated, router]);

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

        if (!/^\+?[0-9]{8,15}$/.test(normalizedPayload.phone)) {
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

            if (!response.customer.isActive) {
                throw new Error("Ce compte client est désactivé.");
            }

            saveCustomerSession(response);
            router.replace("/compte");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de l’inscription.",
            );
        } finally {
            setIsSubmitting(false);
        }
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
                        Créez un compte client pour retrouver vos informations,
                        consulter vos commandes et commander plus rapidement.
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

                    <div className="mt-6 space-y-5">
                        <div>
                            <label className="text-sm font-bold">
                                Nom complet
                            </label>

                            <input
                                name="fullName"
                                required
                                value={fullName}
                                onChange={(event) =>
                                    setFullName(event.target.value)
                                }
                                placeholder="Ahmed Ben Ali"
                                autoComplete="name"
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-bold">
                                Téléphone
                            </label>

                            <input
                                name="phone"
                                required
                                value={phone}
                                onChange={(event) =>
                                    setPhone(event.target.value)
                                }
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
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                placeholder="client@email.com"
                                autoComplete="email"
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-bold">
                                Mot de passe
                            </label>

                            <div className="mt-2 flex items-center rounded-2xl border border-neutral-300 px-4 focus-within:border-black">
                                <input
                                    name="password"
                                    required
                                    type={showPassword ? "text" : "password"}
                                    minLength={8}
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    placeholder="8 caractères, lettre et chiffre"
                                    autoComplete="new-password"
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

                        <div>
                            <label className="text-sm font-bold">
                                Confirmer le mot de passe
                            </label>

                            <div className="mt-2 flex items-center rounded-2xl border border-neutral-300 px-4 focus-within:border-black">
                                <input
                                    name="confirmPassword"
                                    required
                                    type={
                                        showConfirmPassword
                                            ? "text"
                                            : "password"
                                    }
                                    minLength={8}
                                    value={confirmPassword}
                                    onChange={(event) =>
                                        setConfirmPassword(event.target.value)
                                    }
                                    placeholder="Confirmer le mot de passe"
                                    autoComplete="new-password"
                                    className="w-full py-3 outline-none"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            (current) => !current,
                                        )
                                    }
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
                        disabled={isSubmitting}
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
