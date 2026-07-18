"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    ChevronRight,
    KeyRound,
    LogOut,
    PackageCheck,
    Save,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import {
    changeCustomerPassword,
    getCustomerOrders,
    updateCustomerProfile,
} from "@/lib/api";
import type { AdminOrder } from "@/types/order";

const ORDERS_PER_PAGE = 5;

function formatPrice(value: number | string | null | undefined) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return "0.000 TND";
    }

    return `${numericValue.toFixed(3)} TND`;
}

function getOrderStatusLabel(status: string) {
    const labels: Record<string, string> = {
        PENDING: "En attente",
        CONFIRMED: "Confirmée",
        PREPARING: "En préparation",
        SHIPPED: "Expédiée",
        DELIVERED: "Livrée",
        CANCELLED: "Annulée",
    };

    return labels[status] ?? status;
}

function buildPaginationRange(currentPage: number, totalPages: number) {
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function CustomerAccountPage() {
    const router = useRouter();
    const {
        customer,
        token,
        isLoading,
        isAuthenticated,
        updateCustomerSession,
        logoutCustomer,
    } = useCustomerAuth();

    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [currentOrdersPage, setCurrentOrdersPage] = useState(1);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError] = useState("");

    const [profileFullName, setProfileFullName] = useState("");
    const [profilePhone, setProfilePhone] = useState("");
    const [profileEmail, setProfileEmail] = useState("");
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState("");
    const [profileError, setProfileError] = useState("");

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [passwordError, setPasswordError] = useState("");

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/compte/login");
        }
    }, [isLoading, isAuthenticated, router]);

    useEffect(() => {
        if (customer) {
            const timeoutId = window.setTimeout(() => {
                setProfileFullName(customer.fullName);
                setProfilePhone(customer.phone);
                setProfileEmail(customer.email ?? "");
            }, 0);
            return () => window.clearTimeout(timeoutId);
        }
    }, [customer]);

    useEffect(() => {
        if (!token || !isAuthenticated) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setOrdersLoading(true);
            setOrdersError("");
        }, 0);

        getCustomerOrders(token)
            .then(setOrders)
            .catch((err) => {
                setOrdersError(
                    err instanceof Error
                        ? err.message
                        : "Erreur lors du chargement des commandes.",
                );
            })
            .finally(() => setOrdersLoading(false));
        return () => window.clearTimeout(timeoutId);
    }, [token, isAuthenticated]);

    const sortedOrders = useMemo(() => {
        return [...orders].sort(
            (firstOrder, secondOrder) =>
                new Date(secondOrder.createdAt).getTime() -
                new Date(firstOrder.createdAt).getTime(),
        );
    }, [orders]);

    const totalOrdersPages = Math.max(
        1,
        Math.ceil(sortedOrders.length / ORDERS_PER_PAGE),
    );

    const ordersPaginationRange = useMemo(
        () => buildPaginationRange(currentOrdersPage, totalOrdersPages),
        [currentOrdersPage, totalOrdersPages],
    );

    const paginatedOrders = useMemo(() => {
        const startIndex = (currentOrdersPage - 1) * ORDERS_PER_PAGE;
        const endIndex = startIndex + ORDERS_PER_PAGE;

        return sortedOrders.slice(startIndex, endIndex);
    }, [sortedOrders, currentOrdersPage]);

    const firstVisibleOrderIndex =
        sortedOrders.length === 0
            ? 0
            : (currentOrdersPage - 1) * ORDERS_PER_PAGE + 1;

    const lastVisibleOrderIndex = Math.min(
        currentOrdersPage * ORDERS_PER_PAGE,
        sortedOrders.length,
    );

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            if (currentOrdersPage > totalOrdersPages) setCurrentOrdersPage(totalOrdersPages);
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [currentOrdersPage, totalOrdersPages]);

    function goToOrdersPage(page: number) {
        const nextPage = Math.min(Math.max(page, 1), totalOrdersPages);

        setCurrentOrdersPage(nextPage);

        document.getElementById("customer-orders")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }

    async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!token) {
            setProfileError("Session client invalide.");
            return;
        }

        setProfileSuccess("");
        setProfileError("");

        try {
            setProfileLoading(true);

            const updatedCustomer = await updateCustomerProfile(token, {
                fullName: profileFullName.trim(),
                phone: profilePhone.trim(),
                email: profileEmail.trim().toLowerCase(),
            });

            if (updatedCustomer.emailVerifiedAt === null) {
                logoutCustomer();
                router.replace(
                    `/compte/login?verificationRequired=1&email=${encodeURIComponent(updatedCustomer.email ?? "")}`,
                );
                return;
            }

            updateCustomerSession(updatedCustomer);
            setProfileSuccess("Profil mis à jour avec succès.");
        } catch (err) {
            setProfileError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la mise à jour du profil.",
            );
        } finally {
            setProfileLoading(false);
        }
    }

    async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!token) {
            setPasswordError("Session client invalide.");
            return;
        }

        setPasswordSuccess("");
        setPasswordError("");

        if (newPassword !== confirmNewPassword) {
            setPasswordError(
                "Les nouveaux mots de passe ne correspondent pas.",
            );
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError(
                "Le nouveau mot de passe doit contenir au moins 6 caractères.",
            );
            return;
        }

        try {
            setPasswordLoading(true);

            const response = await changeCustomerPassword(token, {
                currentPassword,
                newPassword,
            });

            setPasswordSuccess(response.message);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
        } catch (err) {
            setPasswordError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors du changement du mot de passe.",
            );
        } finally {
            setPasswordLoading(false);
        }
    }

    function handleLogout() {
        logoutCustomer();
        router.push("/");
    }

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <PublicHeader />

            <section className="bg-neutral-950 text-white">
                <div className="mx-auto max-w-7xl px-6 py-16">
                    <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">
                        Bigotti Collection
                    </p>

                    <h1 className="mt-5 max-w-4xl text-5xl font-black uppercase leading-none md:text-7xl">
                        Mon compte
                    </h1>

                    <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
                        Retrouvez vos informations client et suivez vos
                        commandes Bigotti.
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-12">
                {isLoading && (
                    <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                        Chargement du compte...
                    </div>
                )}

                {!isLoading && customer && (
                    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
                        <aside className="h-fit rounded-[2rem] bg-white p-8 shadow-sm">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
                                <UserRound size={30} />
                            </div>

                            <h2 className="mt-6 text-3xl font-black">
                                {customer.fullName}
                            </h2>

                            <p className="mt-2 text-neutral-500">
                                {customer.email}
                            </p>

                            <p className="mt-1 text-neutral-500">
                                {customer.phone}
                            </p>

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-neutral-300 px-6 py-3 text-sm font-bold transition hover:border-red-600 hover:text-red-600"
                            >
                                <LogOut size={18} />
                                Déconnexion
                            </button>
                        </aside>

                        <div className="space-y-6">
                            <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                                <h2 className="text-3xl font-black">
                                    Bienvenue, {customer.fullName}
                                </h2>

                                <p className="mt-3 text-neutral-600">
                                    Votre compte client est actif. Vous pouvez
                                    consulter vos commandes et suivre leur état.
                                </p>
                            </div>

                            <form
                                onSubmit={handleUpdateProfile}
                                className="rounded-[2rem] bg-white p-8 shadow-sm"
                            >
                                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                                    <div>
                                        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                                            Profil
                                        </p>

                                        <h2 className="mt-2 text-3xl font-black">
                                            Modifier mes informations
                                        </h2>

                                        <p className="mt-3 text-neutral-600">
                                            Mettez à jour vos informations
                                            personnelles utilisées pour vos
                                            commandes.
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={profileLoading}
                                        className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
                                    >
                                        <Save size={18} />
                                        {profileLoading
                                            ? "Enregistrement..."
                                            : "Enregistrer"}
                                    </button>
                                </div>

                                {profileSuccess && (
                                    <div className="mt-6 rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-700">
                                        {profileSuccess}
                                    </div>
                                )}

                                {profileError && (
                                    <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                                        {profileError}
                                    </div>
                                )}

                                <div className="mt-6 grid gap-5 md:grid-cols-3">
                                    <div>
                                        <label className="text-sm font-bold">
                                            Nom complet
                                        </label>

                                        <input
                                            value={profileFullName}
                                            onChange={(event) =>
                                                setProfileFullName(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold">
                                            Téléphone
                                        </label>

                                        <input
                                            value={profilePhone}
                                            onChange={(event) =>
                                                setProfilePhone(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold">
                                            Email
                                        </label>

                                        <input
                                            value={profileEmail}
                                            onChange={(event) =>
                                                setProfileEmail(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                            type="email"
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>
                                </div>
                            </form>

                            <form
                                onSubmit={handleChangePassword}
                                className="rounded-[2rem] bg-white p-8 shadow-sm"
                            >
                                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                                    <div>
                                        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                                            Sécurité
                                        </p>

                                        <h2 className="mt-2 text-3xl font-black">
                                            Changer mon mot de passe
                                        </h2>

                                        <p className="mt-3 text-neutral-600">
                                            Utilisez un mot de passe différent
                                            de votre mot de passe actuel.
                                        </p>
                                    </div>

                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
                                        <KeyRound size={24} />
                                    </div>
                                </div>

                                {passwordSuccess && (
                                    <div className="mt-6 rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-700">
                                        {passwordSuccess}
                                    </div>
                                )}

                                {passwordError && (
                                    <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                                        {passwordError}
                                    </div>
                                )}

                                <div className="mt-6 grid gap-5 md:grid-cols-3">
                                    <div>
                                        <label className="text-sm font-bold">
                                            Mot de passe actuel
                                        </label>

                                        <input
                                            value={currentPassword}
                                            onChange={(event) =>
                                                setCurrentPassword(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                            type="password"
                                            minLength={6}
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold">
                                            Nouveau mot de passe
                                        </label>

                                        <input
                                            value={newPassword}
                                            onChange={(event) =>
                                                setNewPassword(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                            type="password"
                                            minLength={6}
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold">
                                            Confirmer
                                        </label>

                                        <input
                                            value={confirmNewPassword}
                                            onChange={(event) =>
                                                setConfirmNewPassword(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                            type="password"
                                            minLength={6}
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
                                >
                                    <KeyRound size={18} />
                                    {passwordLoading
                                        ? "Modification..."
                                        : "Modifier le mot de passe"}
                                </button>
                            </form>

                            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                <Link
                                    href="/suivi-commande"
                                    className="rounded-[2rem] bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <PackageCheck size={34} />

                                    <h3 className="mt-5 text-2xl font-black">
                                        Suivre une commande
                                    </h3>

                                    <p className="mt-3 text-neutral-600">
                                        Consultez l’état d’une commande avec son
                                        numéro et votre téléphone.
                                    </p>
                                </Link>

                                <Link
                                    href="/favoris"
                                    className="rounded-[2rem] bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <UserRound size={34} />

                                    <h3 className="mt-5 text-2xl font-black">
                                        Mes favoris
                                    </h3>

                                    <p className="mt-3 text-neutral-600">
                                        Retrouvez les articles que vous avez
                                        sauvegardés.
                                    </p>
                                </Link>

                                <Link
                                    href="/compte/securite"
                                    className="rounded-[2rem] bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <ShieldCheck size={34} />

                                    <h3 className="mt-5 text-2xl font-black">
                                        Sécurité du compte
                                    </h3>

                                    <p className="mt-3 text-neutral-600">
                                        Consultez les appareils connectés et
                                        fermez toute session inconnue.
                                    </p>
                                </Link>
                            </div>

                            <div
                                id="customer-orders"
                                className="rounded-[2rem] bg-white p-8 shadow-sm"
                            >
                                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                                    <div>
                                        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                                            Historique
                                        </p>

                                        <h2 className="mt-2 text-3xl font-black">
                                            Mes commandes
                                        </h2>
                                    </div>

                                    <div className="flex flex-col gap-3 md:items-end">
                                        {sortedOrders.length > 0 && (
                                            <div className="rounded-full bg-neutral-100 px-5 py-3 text-sm font-bold text-neutral-600">
                                                Affichage de{" "}
                                                {firstVisibleOrderIndex} à{" "}
                                                {lastVisibleOrderIndex} sur{" "}
                                                {sortedOrders.length} commande
                                                {sortedOrders.length > 1
                                                    ? "s"
                                                    : ""}
                                            </div>
                                        )}

                                        <Link
                                            href="/boutique"
                                            className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
                                        >
                                            Commander encore
                                        </Link>
                                    </div>
                                </div>

                                {ordersLoading && (
                                    <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-neutral-500">
                                        Chargement des commandes...
                                    </div>
                                )}

                                {ordersError && (
                                    <div className="mt-6 rounded-2xl bg-red-50 p-5 text-sm font-semibold text-red-700">
                                        {ordersError}
                                    </div>
                                )}

                                {!ordersLoading &&
                                    !ordersError &&
                                    orders.length === 0 && (
                                        <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-neutral-500">
                                            Vous n’avez pas encore de commande.
                                        </div>
                                    )}

                                {!ordersLoading &&
                                    !ordersError &&
                                    sortedOrders.length > 0 && (
                                        <>
                                            <div className="mt-6 space-y-4">
                                                {paginatedOrders.map(
                                                    (order) => (
                                                        <div
                                                            key={order.id}
                                                            className="rounded-3xl border border-neutral-200 p-5"
                                                        >
                                                            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                                                                <div>
                                                                    <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                                                                        Commande
                                                                    </p>

                                                                    <h3 className="mt-1 text-2xl font-black">
                                                                        {
                                                                            order.orderNumber
                                                                        }
                                                                    </h3>

                                                                    <p className="mt-2 text-sm text-neutral-500">
                                                                        {
                                                                            order
                                                                                .items
                                                                                .length
                                                                        }{" "}
                                                                        article(s)
                                                                        — Statut
                                                                        :{" "}
                                                                        <span className="font-bold text-neutral-950">
                                                                            {getOrderStatusLabel(
                                                                                order.orderStatus,
                                                                            )}
                                                                        </span>
                                                                    </p>
                                                                </div>

                                                                <div className="text-left md:text-right">
                                                                    <p className="text-2xl font-black">
                                                                        {formatPrice(
                                                                            order.total,
                                                                        )}
                                                                    </p>

                                                                    <p className="mt-1 text-sm text-neutral-500">
                                                                        {new Date(
                                                                            order.createdAt,
                                                                        ).toLocaleDateString(
                                                                            "fr-FR",
                                                                        )}
                                                                    </p>

                                                                    <Link
                                                                        href={`/suivi-commande?orderNumber=${encodeURIComponent(
                                                                            order.orderNumber,
                                                                        )}&phone=${encodeURIComponent(
                                                                            order.customerPhone,
                                                                        )}`}
                                                                        className="mt-4 inline-flex rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
                                                                    >
                                                                        Suivre
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                            </div>

                                            {totalOrdersPages > 1 && (
                                                <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            goToOrdersPage(
                                                                currentOrdersPage -
                                                                    1,
                                                            )
                                                        }
                                                        disabled={
                                                            currentOrdersPage ===
                                                            1
                                                        }
                                                        className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <ChevronLeft
                                                            size={16}
                                                        />
                                                        Précédent
                                                    </button>

                                                    {ordersPaginationRange[0] >
                                                        1 && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    goToOrdersPage(
                                                                        1,
                                                                    )
                                                                }
                                                                className="h-11 min-w-11 rounded-full border border-neutral-300 bg-white px-4 text-sm font-black transition hover:border-black"
                                                            >
                                                                1
                                                            </button>

                                                            <span className="px-2 text-sm font-black text-neutral-400">
                                                                ...
                                                            </span>
                                                        </>
                                                    )}

                                                    {ordersPaginationRange.map(
                                                        (page) => (
                                                            <button
                                                                key={page}
                                                                type="button"
                                                                onClick={() =>
                                                                    goToOrdersPage(
                                                                        page,
                                                                    )
                                                                }
                                                                className={
                                                                    currentOrdersPage ===
                                                                    page
                                                                        ? "h-11 min-w-11 rounded-full bg-black px-4 text-sm font-black text-white"
                                                                        : "h-11 min-w-11 rounded-full border border-neutral-300 bg-white px-4 text-sm font-black transition hover:border-black"
                                                                }
                                                            >
                                                                {page}
                                                            </button>
                                                        ),
                                                    )}

                                                    {ordersPaginationRange[
                                                        ordersPaginationRange.length -
                                                            1
                                                    ] < totalOrdersPages && (
                                                        <>
                                                            <span className="px-2 text-sm font-black text-neutral-400">
                                                                ...
                                                            </span>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    goToOrdersPage(
                                                                        totalOrdersPages,
                                                                    )
                                                                }
                                                                className="h-11 min-w-11 rounded-full border border-neutral-300 bg-white px-4 text-sm font-black transition hover:border-black"
                                                            >
                                                                {
                                                                    totalOrdersPages
                                                                }
                                                            </button>
                                                        </>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            goToOrdersPage(
                                                                currentOrdersPage +
                                                                    1,
                                                            )
                                                        }
                                                        disabled={
                                                            currentOrdersPage ===
                                                            totalOrdersPages
                                                        }
                                                        className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        Suivant
                                                        <ChevronRight
                                                            size={16}
                                                        />
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <PublicFooter />
        </main>
    );
}
