"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { registerCustomer } from "@/lib/api";

export default function CustomerRegisterPage() {
    const router = useRouter();
    const { saveCustomerSession } = useCustomerAuth();

    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        const formData = new FormData(event.currentTarget);

        const password = String(formData.get("password") ?? "");
        const confirmPassword = String(formData.get("confirmPassword") ?? "");

        if (password !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        const payload = {
            fullName: String(formData.get("fullName") ?? "").trim(),
            phone: String(formData.get("phone") ?? "").trim(),
            email: String(formData.get("email") ?? "")
                .trim()
                .toLowerCase(),
            password,
        };

        try {
            setIsSubmitting(true);
            const response = await registerCustomer(payload);
            saveCustomerSession(response);
            router.push("/compte");
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
                        Créez un compte client pour retrouver vos informations
                        et préparer vos commandes plus rapidement.
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
                                placeholder="Ahmed Ben Ali"
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
                                placeholder="20202020"
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-bold">Email</label>
                            <input
                                name="email"
                                required
                                type="email"
                                placeholder="client@email.com"
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-bold">
                                Mot de passe
                            </label>
                            <input
                                name="password"
                                required
                                type="password"
                                minLength={6}
                                placeholder="Minimum 6 caractères"
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-bold">
                                Confirmer le mot de passe
                            </label>
                            <input
                                name="confirmPassword"
                                required
                                type="password"
                                minLength={6}
                                placeholder="Confirmer le mot de passe"
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-8 w-full rounded-full bg-black px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
                    >
                        {isSubmitting ? "Création..." : "Créer mon compte"}
                    </button>
                </form>
            </section>

            <PublicFooter />
        </main>
    );
}
