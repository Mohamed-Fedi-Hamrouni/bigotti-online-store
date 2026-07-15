"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Globe2,
    Laptop,
    LoaderCircle,
    LogOut,
    RefreshCw,
    ShieldCheck,
    Smartphone,
    Terminal,
    Trash2,
} from "lucide-react";
import {
    getAdminSessions,
    getCustomerSessions,
    revokeAdminSession,
    revokeAllAdminSessions,
    revokeAllCustomerSessions,
    revokeCustomerSession,
    revokeOtherAdminSessions,
    revokeOtherCustomerSessions,
} from "@/lib/api";
import type { AuthSession, SessionScope } from "@/types/session";

type SessionManagerProps = {
    scope: SessionScope;
};

function clearLocalSession(scope: SessionScope) {
    if (scope === "admin") {
        window.localStorage.removeItem("bigotti-admin-token");
        window.localStorage.removeItem("bigotti-admin-user");
        return;
    }

    window.localStorage.removeItem("bigotti-customer-token");
    window.localStorage.removeItem("bigotti-customer");
}

function getLoginPath(scope: SessionScope) {
    return scope === "admin" ? "/admin/login" : "/compte/login";
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getSessionDevice(userAgent: string | null) {
    const normalizedUserAgent = userAgent ?? "";

    if (/curl|postman|insomnia/i.test(normalizedUserAgent)) {
        return {
            label: "Terminal ou client API",
            details: normalizedUserAgent || "Client API",
            icon: Terminal,
        };
    }

    const isMobile = /android|iphone|ipad|mobile/i.test(normalizedUserAgent);

    let browser = "Navigateur inconnu";

    if (/edg\//i.test(normalizedUserAgent)) {
        browser = "Microsoft Edge";
    } else if (/firefox\//i.test(normalizedUserAgent)) {
        browser = "Mozilla Firefox";
    } else if (/chrome\//i.test(normalizedUserAgent)) {
        browser = "Google Chrome";
    } else if (/safari\//i.test(normalizedUserAgent)) {
        browser = "Safari";
    }

    let operatingSystem = "Système inconnu";

    if (/windows/i.test(normalizedUserAgent)) {
        operatingSystem = "Windows";
    } else if (/macintosh|mac os/i.test(normalizedUserAgent)) {
        operatingSystem = "macOS";
    } else if (/android/i.test(normalizedUserAgent)) {
        operatingSystem = "Android";
    } else if (/iphone|ipad|ios/i.test(normalizedUserAgent)) {
        operatingSystem = "iOS";
    } else if (/linux/i.test(normalizedUserAgent)) {
        operatingSystem = "Linux";
    }

    return {
        label: isMobile ? "Appareil mobile" : "Ordinateur",
        details: `${browser} · ${operatingSystem}`,
        icon: isMobile ? Smartphone : Laptop,
    };
}

export function SessionManager({ scope }: SessionManagerProps) {
    const router = useRouter();

    const [sessions, setSessions] = useState<AuthSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionSessionId, setActionSessionId] = useState<string | null>(null);
    const [globalAction, setGlobalAction] = useState<
        "others" | "all" | null
    >(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const currentSession = useMemo(
        () => sessions.find((session) => session.isCurrent) ?? null,
        [sessions],
    );

    const otherSessionsCount = sessions.filter(
        (session) => !session.isCurrent,
    ).length;

    const loadSessions = useCallback(async () => {
        setError("");

        try {
            setIsLoading(true);

            const nextSessions =
                scope === "admin"
                    ? await getAdminSessions()
                    : await getCustomerSessions();

            setSessions(nextSessions);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Impossible de charger les sessions actives.",
            );
        } finally {
            setIsLoading(false);
        }
    }, [scope]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => void loadSessions(), 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadSessions]);

    function redirectAfterSessionEnd() {
        clearLocalSession(scope);
        router.replace(getLoginPath(scope));
        router.refresh();
    }

    async function handleRevokeSession(session: AuthSession) {
        const confirmationMessage = session.isCurrent
            ? "Cette action va fermer la session utilisée actuellement. Continuer ?"
            : "Déconnecter cet appareil ?";

        if (!window.confirm(confirmationMessage)) {
            return;
        }

        setError("");
        setSuccess("");
        setActionSessionId(session.id);

        try {
            const result =
                scope === "admin"
                    ? await revokeAdminSession(session.id)
                    : await revokeCustomerSession(session.id);

            if (result.currentSessionRevoked) {
                redirectAfterSessionEnd();
                return;
            }

            setSuccess(result.message);
            await loadSessions();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Impossible de révoquer cette session.",
            );
        } finally {
            setActionSessionId(null);
        }
    }

    async function handleRevokeOthers() {
        if (otherSessionsCount === 0) {
            return;
        }

        if (
            !window.confirm(
                `Déconnecter les ${otherSessionsCount} autre(s) appareil(s) ?`,
            )
        ) {
            return;
        }

        setError("");
        setSuccess("");
        setGlobalAction("others");

        try {
            const result =
                scope === "admin"
                    ? await revokeOtherAdminSessions()
                    : await revokeOtherCustomerSessions();

            setSuccess(result.message);
            await loadSessions();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Impossible de révoquer les autres sessions.",
            );
        } finally {
            setGlobalAction(null);
        }
    }

    async function handleRevokeAll() {
        if (
            !window.confirm(
                "Déconnecter tous les appareils, y compris celui-ci ? Vous devrez vous reconnecter.",
            )
        ) {
            return;
        }

        setError("");
        setSuccess("");
        setGlobalAction("all");

        try {
            if (scope === "admin") {
                await revokeAllAdminSessions();
            } else {
                await revokeAllCustomerSessions();
            }

            redirectAfterSessionEnd();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Impossible de révoquer toutes les sessions.",
            );
            setGlobalAction(null);
        }
    }

    return (
        <div className="space-y-6">
            <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                    <div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
                            <ShieldCheck size={26} />
                        </div>

                        <p className="mt-6 text-sm font-black uppercase tracking-[0.25em] text-neutral-500">
                            Sécurité du compte
                        </p>

                        <h2 className="mt-2 text-3xl font-black">
                            Appareils connectés
                        </h2>

                        <p className="mt-3 max-w-2xl text-neutral-600">
                            Consultez les sessions actives et déconnectez tout
                            appareil que vous ne reconnaissez pas.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                        <button
                            type="button"
                            onClick={() => void loadSessions()}
                            disabled={isLoading || globalAction !== null}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 px-5 py-3 text-sm font-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <RefreshCw
                                size={17}
                                className={isLoading ? "animate-spin" : ""}
                            />
                            Actualiser
                        </button>

                        <button
                            type="button"
                            onClick={() => void handleRevokeOthers()}
                            disabled={
                                otherSessionsCount === 0 ||
                                globalAction !== null ||
                                actionSessionId !== null
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 px-5 py-3 text-sm font-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {globalAction === "others" ? (
                                <LoaderCircle
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <LogOut size={17} />
                            )}
                            Déconnecter les autres
                        </button>

                        <button
                            type="button"
                            onClick={() => void handleRevokeAll()}
                            disabled={
                                sessions.length === 0 ||
                                globalAction !== null ||
                                actionSessionId !== null
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                        >
                            {globalAction === "all" ? (
                                <LoaderCircle
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <Trash2 size={17} />
                            )}
                            Tout déconnecter
                        </button>
                    </div>
                </div>

                {currentSession && (
                    <div className="mt-6 rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-800">
                        Cette page est ouverte depuis votre session actuelle,
                        créée le {formatDate(currentSession.createdAt)}.
                    </div>
                )}

                {success && (
                    <div className="mt-6 rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-700">
                        {success}
                    </div>
                )}

                {error && (
                    <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                        {error}
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center gap-3 rounded-[2rem] bg-white p-10 text-neutral-500 shadow-sm">
                    <LoaderCircle size={22} className="animate-spin" />
                    Chargement des sessions...
                </div>
            ) : sessions.length === 0 ? (
                <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm">
                    <Globe2 className="mx-auto" size={34} />
                    <h3 className="mt-4 text-xl font-black">
                        Aucune session active
                    </h3>
                    <p className="mt-2 text-neutral-500">
                        Aucune session active n’a été trouvée pour ce compte.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {sessions.map((session) => {
                        const device = getSessionDevice(session.userAgent);
                        const DeviceIcon = device.icon;
                        const isRevoking = actionSessionId === session.id;

                        return (
                            <article
                                key={session.id}
                                className={`rounded-[2rem] border bg-white p-6 shadow-sm ${
                                    session.isCurrent
                                        ? "border-green-300"
                                        : "border-neutral-200"
                                }`}
                            >
                                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                                    <div className="flex min-w-0 items-start gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                                            <DeviceIcon size={23} />
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-lg font-black">
                                                    {device.label}
                                                </h3>

                                                {session.isCurrent && (
                                                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-green-800">
                                                        Session actuelle
                                                    </span>
                                                )}
                                            </div>

                                            <p className="mt-1 break-words text-sm font-semibold text-neutral-600">
                                                {device.details}
                                            </p>

                                            <div className="mt-3 grid gap-1 text-sm text-neutral-500 sm:grid-cols-2 sm:gap-x-8">
                                                <p>
                                                    Adresse IP :{" "}
                                                    <span className="font-semibold text-neutral-700">
                                                        {session.ipAddress ??
                                                            "Non disponible"}
                                                    </span>
                                                </p>
                                                <p>
                                                    Dernière activité :{" "}
                                                    <span className="font-semibold text-neutral-700">
                                                        {formatDate(
                                                            session.updatedAt,
                                                        )}
                                                    </span>
                                                </p>
                                                <p>
                                                    Connexion :{" "}
                                                    <span className="font-semibold text-neutral-700">
                                                        {formatDate(
                                                            session.createdAt,
                                                        )}
                                                    </span>
                                                </p>
                                                <p>
                                                    Expiration :{" "}
                                                    <span className="font-semibold text-neutral-700">
                                                        {formatDate(
                                                            session.expiresAt,
                                                        )}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            void handleRevokeSession(session)
                                        }
                                        disabled={
                                            isRevoking ||
                                            globalAction !== null ||
                                            (actionSessionId !== null &&
                                                !isRevoking)
                                        }
                                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-black text-red-700 transition hover:border-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {isRevoking ? (
                                            <LoaderCircle
                                                size={17}
                                                className="animate-spin"
                                            />
                                        ) : (
                                            <LogOut size={17} />
                                        )}
                                        {session.isCurrent
                                            ? "Fermer cette session"
                                            : "Déconnecter"}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
