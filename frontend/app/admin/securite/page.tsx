"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SessionManager } from "@/components/auth/SessionManager";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { changeAdminPassword } from "@/lib/api";

export default function AdminSecurityPage() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError("Tous les champs sont obligatoires.");
            return;
        }
        if (newPassword.length < 8) {
            setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
            return;
        }
        if (newPassword === currentPassword) {
            setError("Le nouveau mot de passe doit être différent du mot de passe actuel.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("La confirmation du nouveau mot de passe ne correspond pas.");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await changeAdminPassword({
                currentPassword,
                newPassword,
                confirmPassword,
            });
            window.localStorage.removeItem("bigotti-admin-token");
            window.localStorage.removeItem("bigotti-admin-user");
            window.sessionStorage.setItem("bigotti-admin-login-message", result.message);
            router.replace("/admin/login");
        } catch (err) {
            setError(err instanceof Error ? err.message : "La modification a échoué.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <header className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <Link href="/admin" className="flex items-center">
                        <img
                            src="/images/bigotti-logo.jpg"
                            alt="Bigotti Collection"
                            className="h-20 w-auto object-contain"
                        />
                    </Link>

                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-3 text-sm font-black transition hover:border-black"
                    >
                        <ArrowLeft size={17} />
                        Administration
                    </Link>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-6 py-12">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-neutral-500">
                    Sécurité administrateur
                </p>

                <h1 className="mt-3 text-4xl font-black md:text-5xl">
                    Sessions et appareils
                </h1>

                <p className="mt-4 max-w-2xl text-neutral-600">
                    Contrôlez les appareils connectés à votre compte
                    d’administration et révoquez toute session suspecte.
                </p>

                <form
                    onSubmit={submit}
                    className="mt-10 max-w-2xl rounded-3xl bg-white p-6 shadow-sm md:p-8"
                >
                    <h2 className="text-2xl font-black">Changer mon mot de passe</h2>
                    <p className="mt-2 text-sm text-neutral-600">
                        Après la modification, toutes vos sessions seront fermées et
                        vous devrez vous reconnecter.
                    </p>
                    <div className="mt-6 grid gap-5">
                        {[
                            ["Mot de passe actuel", currentPassword, setCurrentPassword],
                            ["Nouveau mot de passe", newPassword, setNewPassword],
                            ["Confirmer le nouveau mot de passe", confirmPassword, setConfirmPassword],
                        ].map(([label, value, setter]) => (
                            <label key={label as string} className="grid gap-2 text-sm font-bold">
                                {label as string}
                                <input
                                    type="password"
                                    value={value as string}
                                    onChange={(event) =>
                                        (setter as (value: string) => void)(event.target.value)
                                    }
                                    autoComplete={label === "Mot de passe actuel" ? "current-password" : "new-password"}
                                    className="rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                />
                            </label>
                        ))}
                    </div>
                    {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-6 rounded-full bg-black px-6 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                        {isSubmitting ? "Modification..." : "Modifier le mot de passe"}
                    </button>
                </form>

                <div className="mt-10">
                    <SessionManager scope="admin" />
                </div>
            </section>
        </main>
    );
}
