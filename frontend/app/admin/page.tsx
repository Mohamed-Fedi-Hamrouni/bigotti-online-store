"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/types/auth";

export default function AdminHomePage() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        const token = window.localStorage.getItem("bigotti-admin-token");
        const rawUser = window.localStorage.getItem("bigotti-admin-user");

        if (!token || !rawUser) {
            router.push("/admin/login");
            return;
        }

        setUser(JSON.parse(rawUser));
    }, [router]);

    function logout() {
        window.localStorage.removeItem("bigotti-admin-token");
        window.localStorage.removeItem("bigotti-admin-user");
        router.push("/admin/login");
    }

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <header className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <Link href="/" className="flex items-center">
                        <img
                            src="/images/bigotti-logo.jpg"
                            alt="Bigotti Collection"
                            className="h-20 w-auto object-contain"
                        />
                    </Link>

                    <button
                        onClick={logout}
                        className="text-sm font-medium text-neutral-600 hover:text-black"
                    >
                        Déconnexion
                    </button>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-6 py-12">
                <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                    Administration
                </p>

                <h1 className="mt-2 text-4xl font-bold">
                    Bonjour {user?.fullName}
                </h1>

                <p className="mt-3 text-neutral-600">Rôle : {user?.role}</p>

                <div className="mt-10 grid gap-6 md:grid-cols-3">
                    <Link
                        href="/admin/commandes"
                        className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                    >
                        <h2 className="text-2xl font-bold">Commandes</h2>
                        <p className="mt-3 text-neutral-500">
                            Voir les commandes clients et changer les statuts.
                        </p>
                    </Link>

                    <Link
                        href="/admin/produits"
                        className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                    >
                        <h2 className="text-2xl font-bold">Produits</h2>
                        <p className="mt-3 text-neutral-500">
                            Voir les produits et ajouter de nouveaux articles.
                        </p>
                    </Link>

                    <div className="rounded-3xl bg-white p-6 opacity-60 shadow-sm">
                        <h2 className="text-2xl font-bold">Dashboard</h2>
                        <p className="mt-3 text-neutral-500">
                            Statistiques manager dans la prochaine étape.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
