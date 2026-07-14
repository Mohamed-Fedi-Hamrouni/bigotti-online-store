"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { COOKIE_SESSION_MARKER, getAdminMe } from "@/lib/api";
import type { AuthUser, UserRole } from "@/types/auth";

type AdminLayoutProps = {
    children: ReactNode;
};

type SessionState = "checking" | "valid" | "invalid" | "forbidden";

const ROLE_LABELS: Record<UserRole, string> = {
    SUPER_ADMIN: "Super administrateur",
    ADMIN: "Administrateur",
    MANAGER: "Manager",
};

const PUBLIC_ADMIN_AUTH_PATHS = [
    "/admin/login",
    "/admin/mot-de-passe-oublie",
    "/admin/reinitialiser-mot-de-passe",
] as const;

function isPublicAdminAuthPath(pathname: string) {
    return PUBLIC_ADMIN_AUTH_PATHS.some((path) => pathname === path);
}

function clearAdminSession() {
    window.localStorage.removeItem("bigotti-admin-token");
    window.localStorage.removeItem("bigotti-admin-user");
}

function saveAdminSessionMarker(user: AuthUser) {
    window.localStorage.setItem("bigotti-admin-token", COOKIE_SESSION_MARKER);
    window.localStorage.setItem("bigotti-admin-user", JSON.stringify(user));
}

function getFallbackPathForRole(role: UserRole) {
    if (role === "MANAGER") {
        return "/admin/dashboard";
    }

    return "/admin/commandes";
}

function getAllowedRolesForPath(pathname: string): UserRole[] | null {
    if (isPublicAdminAuthPath(pathname)) {
        return null;
    }

    if (pathname === "/admin") {
        return ["SUPER_ADMIN", "ADMIN", "MANAGER"];
    }

    if (pathname.startsWith("/admin/securite")) {
        return ["SUPER_ADMIN", "ADMIN", "MANAGER"];
    }

    if (pathname.startsWith("/admin/dashboard")) {
        return ["SUPER_ADMIN", "MANAGER"];
    }

    if (pathname.startsWith("/admin/commandes")) {
        return ["SUPER_ADMIN", "ADMIN", "MANAGER"];
    }

    if (pathname.startsWith("/admin/clients")) {
        return ["SUPER_ADMIN", "ADMIN", "MANAGER"];
    }

    if (pathname.startsWith("/admin/produits")) {
        return ["SUPER_ADMIN", "ADMIN"];
    }

    if (pathname.startsWith("/admin/categories")) {
        return ["SUPER_ADMIN", "ADMIN"];
    }

    if (pathname.startsWith("/admin/collections")) {
        return ["SUPER_ADMIN", "ADMIN"];
    }

    if (pathname.startsWith("/admin/promotions")) {
        return ["SUPER_ADMIN", "ADMIN"];
    }

    return ["SUPER_ADMIN"];
}

function getRoleLabel(role: UserRole) {
    return ROLE_LABELS[role] ?? role;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [sessionState, setSessionState] =
        useState<SessionState>("checking");
    const [user, setUser] = useState<AuthUser | null>(null);
    const [message, setMessage] = useState("");

    const publicPath = isPublicAdminAuthPath(pathname);

    const allowedRoles = useMemo(
        () => getAllowedRolesForPath(pathname),
        [pathname],
    );

    useEffect(() => {
        if (publicPath) {
            setSessionState("valid");
            return;
        }

        setSessionState("checking");
        setMessage("");

        getAdminMe()
            .then((profile) => {
                if (!profile.isActive) {
                    throw new Error("Ce compte administrateur est désactivé.");
                }

                saveAdminSessionMarker(profile);
                setUser(profile);

                if (allowedRoles && !allowedRoles.includes(profile.role)) {
                    setSessionState("forbidden");
                    setMessage(
                        `Accès refusé. Votre rôle "${getRoleLabel(
                            profile.role,
                        )}" ne permet pas d’accéder à cette page.`,
                    );
                    return;
                }

                setSessionState("valid");
            })
            .catch((err) => {
                clearAdminSession();
                setUser(null);
                setSessionState("invalid");
                setMessage(
                    err instanceof Error
                        ? err.message
                        : "Session admin invalide.",
                );

                setTimeout(() => {
                    router.replace("/admin/login");
                }, 800);
            });
    }, [pathname, router, allowedRoles, publicPath]);

    if (publicPath) {
        return children;
    }

    if (sessionState === "checking") {
        return (
            <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 text-neutral-950">
                <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm">
                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-neutral-500">
                        Administration
                    </p>

                    <h1 className="mt-3 text-2xl font-black">
                        Vérification de la session...
                    </h1>

                    <p className="mt-2 text-sm text-neutral-500">
                        Contrôle du cookie sécurisé et des permissions.
                    </p>
                </div>
            </main>
        );
    }

    if (sessionState === "invalid") {
        return (
            <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 text-neutral-950">
                <div className="max-w-md rounded-[2rem] bg-red-50 p-8 text-center text-red-700 shadow-sm">
                    <p className="text-sm font-bold uppercase tracking-[0.25em]">
                        Session invalide
                    </p>

                    <h1 className="mt-3 text-2xl font-black">
                        Connexion requise
                    </h1>

                    <p className="mt-3 text-sm font-semibold">{message}</p>

                    <p className="mt-2 text-sm">
                        Redirection vers la page de connexion...
                    </p>
                </div>
            </main>
        );
    }

    if (sessionState === "forbidden") {
        return (
            <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 text-neutral-950">
                <div className="max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-sm">
                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-neutral-500">
                        Accès refusé
                    </p>

                    <h1 className="mt-3 text-2xl font-black">
                        Permission insuffisante
                    </h1>

                    <p className="mt-3 text-sm text-neutral-600">{message}</p>

                    {user && (
                        <p className="mt-3 text-sm font-semibold text-neutral-950">
                            Compte connecté : {user.fullName} —{" "}
                            {getRoleLabel(user.role)}
                        </p>
                    )}

                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link
                            href="/admin"
                            className="rounded-full bg-black px-6 py-3 text-sm font-bold text-white"
                        >
                            Retour administration
                        </Link>

                        {user && (
                            <Link
                                href={getFallbackPathForRole(user.role)}
                                className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-bold hover:border-black"
                            >
                                Aller à mon espace
                            </Link>
                        )}
                    </div>
                </div>
            </main>
        );
    }

    return children;
}
