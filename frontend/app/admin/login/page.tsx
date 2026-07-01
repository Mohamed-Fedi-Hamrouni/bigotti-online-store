"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function AdminLoginPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        const formData = new FormData(event.currentTarget);

        const payload = {
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
        };

        try {
            setIsSubmitting(true);

            const response = await login(payload);

            window.localStorage.setItem(
                "bigotti-admin-token",
                response.accessToken,
            );
            window.localStorage.setItem(
                "bigotti-admin-user",
                JSON.stringify(response.user),
            );

            if (response.user.role === "MANAGER") {
                router.push("/admin/dashboard");
                return;
            }

            router.push("/admin/commandes");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Erreur de connexion.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-neutral-950">
            <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
                <div className="text-center">
                    <img
                        src="/images/bigotti-logo.jpg"
                        alt="Bigotti Collection"
                        className="mx-auto h-20 w-auto object-contain"
                    />

                    <h1 className="mt-8 text-3xl font-bold">
                        Espace administration
                    </h1>

                    <p className="mt-2 text-sm text-neutral-500">
                        Connectez-vous pour gérer la boutique.
                    </p>
                </div>

                {error && (
                    <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
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
                            defaultValue="admin@bigotti.tn"
                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold">
                            Mot de passe
                        </label>
                        <input
                            name="password"
                            type="password"
                            required
                            defaultValue="Bigotti@2026"
                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-full bg-black px-6 py-4 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
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
