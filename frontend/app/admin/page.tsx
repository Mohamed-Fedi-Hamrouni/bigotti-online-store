"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COOKIE_SESSION_MARKER, getAdminMe, logoutAdmin } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

function clearAdminSession() {
    window.localStorage.removeItem("bigotti-admin-token");
    window.localStorage.removeItem("bigotti-admin-user");
}

function saveAdminSessionMarker(user: AuthUser) {
    window.localStorage.setItem("bigotti-admin-token", COOKIE_SESSION_MARKER);
    window.localStorage.setItem("bigotti-admin-user", JSON.stringify(user));
}

function getRoleLabel(role: AuthUser["role"]) {
    const labels: Record<AuthUser["role"], string> = {
        SUPER_ADMIN: "Super administrateur",
        ADMIN: "Administrateur",
        MANAGER: "Manager",
    };

    return labels[role] ?? role;
}

export default function AdminHomePage() {
    const router = useRouter();

    const [user, setUser] = useState<AuthUser | null>(null);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [sessionError, setSessionError] = useState("");

    useEffect(() => {
        getAdminMe()
            .then((profile) => {
                if (!profile.isActive) {
                    throw new Error("Ce compte administrateur est désactivé.");
                }

                saveAdminSessionMarker(profile);
                setUser(profile);
            })
            .catch((err) => {
                clearAdminSession();
                setSessionError(
                    err instanceof Error
                        ? err.message
                        : "Session admin invalide.",
                );

                setTimeout(() => {
                    router.replace("/admin/login");
                }, 800);
            })
            .finally(() => {
                setIsCheckingSession(false);
            });
    }, [router]);

    function logout() {
        logoutAdmin().catch(() => undefined);
        clearAdminSession();
        router.replace("/admin/login");
    }

    const canManageProducts =
        user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

    const canManageOrders =
        user?.role === "ADMIN" ||
        user?.role === "SUPER_ADMIN" ||
        user?.role === "MANAGER";

    const canViewDashboard =
        user?.role === "MANAGER" || user?.role === "SUPER_ADMIN";

    const canViewCustomers =
        user?.role === "ADMIN" ||
        user?.role === "SUPER_ADMIN" ||
        user?.role === "MANAGER";

    const canManageCatalog =
        user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

    const canManageUsers = user?.role === "SUPER_ADMIN";

    if (isCheckingSession) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 text-neutral-950">
                <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm">
                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-neutral-500">
                        Administration
                    </p>

                    <h1 className="mt-3 text-2xl font-black">
                        Vérification de la session...
                    </h1>
                </div>
            </main>
        );
    }

    if (sessionError) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 text-neutral-950">
                <div className="rounded-[2rem] bg-red-50 p-8 text-center text-red-700 shadow-sm">
                    <p className="text-sm font-bold">{sessionError}</p>
                    <p className="mt-2 text-sm">
                        Redirection vers la page de connexion...
                    </p>
                </div>
            </main>
        );
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
                        type="button"
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

                {user && (
                    <p className="mt-3 text-neutral-600">
                        Rôle :{" "}
                        <span className="font-bold">
                            {getRoleLabel(user.role)}
                        </span>
                    </p>
                )}

                <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {canManageOrders && (
                        <Link
                            href="/admin/commandes"
                            className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                        >
                            <h2 className="text-2xl font-bold">Commandes</h2>

                            <p className="mt-3 text-neutral-500">
                                Voir les commandes clients et changer les
                                statuts.
                            </p>
                        </Link>
                    )}

                    {canManageProducts && (
                        <Link
                            href="/admin/produits"
                            className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                        >
                            <h2 className="text-2xl font-bold">Produits</h2>

                            <p className="mt-3 text-neutral-500">
                                Voir les produits, modifier les articles et
                                gérer les stocks.
                            </p>
                        </Link>
                    )}

                    {canViewCustomers && (
                        <Link
                            href="/admin/clients"
                            className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                        >
                            <h2 className="text-2xl font-bold">Clients</h2>

                            <p className="mt-3 text-neutral-500">
                                Voir les clients, leurs commandes, leur statut
                                et le total dépensé.
                            </p>
                        </Link>
                    )}

                    {canManageCatalog && (
                        <Link
                            href="/admin/categories"
                            className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                        >
                            <h2 className="text-2xl font-bold">Catégories</h2>

                            <p className="mt-3 text-neutral-500">
                                Créer, modifier, activer ou désactiver les
                                catégories.
                            </p>
                        </Link>
                    )}

                    {canManageCatalog && (
                        <Link
                            href="/admin/collections"
                            className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                        >
                            <h2 className="text-2xl font-bold">Collections</h2>

                            <p className="mt-3 text-neutral-500">
                                Gérer les collections affichées dans la
                                boutique.
                            </p>
                        </Link>
                    )}

                    {canManageCatalog && (
                        <Link
                            href="/admin/promotions"
                            className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                        >
                            <h2 className="text-2xl font-bold">Promotions</h2>

                            <p className="mt-3 text-neutral-500">
                                Créer et gérer les campagnes de solde.
                            </p>
                        </Link>
                    )}

                    {canManageUsers && (
                        <Link
                            href="/admin/utilisateurs"
                            className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                        >
                            <h2 className="text-2xl font-bold">Utilisateurs</h2>
                            <p className="mt-3 text-neutral-500">
                                Créer les comptes internes et gérer leurs rôles
                                et leur accès.
                            </p>
                        </Link>
                    )}


                    <Link
                        href="/admin/securite"
                        className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                    >
                        <h2 className="text-2xl font-bold">Sécurité</h2>

                        <p className="mt-3 text-neutral-500">
                            Voir les appareils connectés et révoquer les sessions
                            administrateur.
                        </p>
                    </Link>

                    {canViewDashboard && (
                        <Link
                            href="/admin/dashboard"
                            className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                        >
                            <h2 className="text-2xl font-bold">Dashboard</h2>

                            <p className="mt-3 text-neutral-500">
                                Suivre les ventes, les commandes et les produits
                                à faible stock.
                            </p>
                        </Link>
                    )}
                </div>
            </section>
        </main>
    );
}
