"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Mail,
    PackageCheck,
    Phone,
    ShieldCheck,
    ShieldOff,
    UserRound,
} from "lucide-react";
import type { AdminCustomer } from "@/types/customer";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const ORDERS_PER_PAGE = 5;

function getAdminToken() {
    if (typeof window === "undefined") {
        return null;
    }

    return (
        window.localStorage.getItem("bigotti-admin-token") ??
        window.localStorage.getItem("admin-token") ??
        window.localStorage.getItem("token")
    );
}

async function fetchAdminCustomer(token: string, customerId: string) {
    const response = await fetch(
        `${API_BASE_URL}/customers/admin/${customerId}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    );

    if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(
            errorPayload?.message ?? "Erreur lors du chargement du client.",
        );
    }

    return response.json() as Promise<AdminCustomer>;
}

async function updateCustomerStatus(
    token: string,
    customerId: string,
    isActive: boolean,
) {
    const response = await fetch(
        `${API_BASE_URL}/customers/admin/${customerId}/status`,
        {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ isActive }),
        },
    );

    if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(
            errorPayload?.message ?? "Erreur lors de la mise à jour du client.",
        );
    }

    return response.json() as Promise<AdminCustomer>;
}

function formatPrice(value: number | string | null | undefined) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return "0.000 TND";
    }

    return `${numericValue.toFixed(3)} TND`;
}

function formatDate(value: string | null | undefined) {
    if (!value) {
        return "Aucune date";
    }

    return new Date(value).toLocaleDateString("fr-FR");
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

function getPaymentStatusLabel(status: string) {
    const labels: Record<string, string> = {
        UNPAID: "Non payé",
        PAID: "Payé",
        FAILED: "Échoué",
        REFUNDED: "Remboursé",
    };

    return labels[status] ?? status;
}

function getOrderStatusClassName(status: string) {
    if (status === "CANCELLED") {
        return "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700";
    }

    if (status === "DELIVERED") {
        return "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700";
    }

    if (status === "PENDING") {
        return "rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700";
    }

    return "rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-700";
}

function buildPaginationRange(currentPage: number, totalPages: number) {
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function AdminCustomerDetailPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();

    const [customer, setCustomer] = useState<AdminCustomer | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = getAdminToken();

        if (!token) {
            router.push("/admin/login");
            return;
        }

        fetchAdminCustomer(token, params.id)
            .then(setCustomer)
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Erreur lors du chargement du client.",
                );
            })
            .finally(() => setIsLoading(false));
    }, [params.id, router]);

    const customerOrders = useMemo(() => {
        return [...(customer?.orders ?? [])].sort(
            (firstOrder, secondOrder) =>
                new Date(secondOrder.createdAt).getTime() -
                new Date(firstOrder.createdAt).getTime(),
        );
    }, [customer]);

    const totalPages = Math.max(
        1,
        Math.ceil(customerOrders.length / ORDERS_PER_PAGE),
    );

    const paginationRange = useMemo(
        () => buildPaginationRange(currentPage, totalPages),
        [currentPage, totalPages],
    );

    const paginatedOrders = useMemo(() => {
        const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
        const endIndex = startIndex + ORDERS_PER_PAGE;

        return customerOrders.slice(startIndex, endIndex);
    }, [customerOrders, currentPage]);

    const firstVisibleOrderIndex =
        customerOrders.length === 0
            ? 0
            : (currentPage - 1) * ORDERS_PER_PAGE + 1;

    const lastVisibleOrderIndex = Math.min(
        currentPage * ORDERS_PER_PAGE,
        customerOrders.length,
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [customer?.id]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    function goToPage(page: number) {
        const nextPage = Math.min(Math.max(page, 1), totalPages);

        setCurrentPage(nextPage);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    async function handleToggleStatus() {
        if (!customer) {
            return;
        }

        const token = getAdminToken();

        if (!token) {
            router.push("/admin/login");
            return;
        }

        setError("");
        setActionLoading(true);

        try {
            const updatedCustomer = await updateCustomerStatus(
                token,
                customer.id,
                !customer.isActive,
            );

            setCustomer(updatedCustomer);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la mise à jour du client.",
            );
        } finally {
            setActionLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <section className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link
                            href="/admin/clients"
                            className="inline-flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-black"
                        >
                            <ArrowLeft size={18} />
                            Retour aux clients
                        </Link>

                        <p className="mt-5 text-sm uppercase tracking-[0.25em] text-neutral-500">
                            Administration
                        </p>

                        <h1 className="mt-2 text-4xl font-black">
                            Détail client
                        </h1>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/admin"
                            className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold hover:border-black"
                        >
                            Tableau de bord
                        </Link>

                        <Link
                            href="/admin/commandes"
                            className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
                        >
                            Commandes
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-8">
                {isLoading && (
                    <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                        Chargement du client...
                    </div>
                )}

                {error && (
                    <div className="rounded-[2rem] bg-red-50 p-8 text-sm font-semibold text-red-700 shadow-sm">
                        {error}
                    </div>
                )}

                {!isLoading && customer && (
                    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
                        <aside className="h-fit rounded-[2rem] bg-white p-8 shadow-sm">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
                                <UserRound size={30} />
                            </div>

                            <div className="mt-6 flex flex-wrap items-center gap-3">
                                <h2 className="text-3xl font-black">
                                    {customer.fullName}
                                </h2>

                                <span
                                    className={
                                        customer.isActive
                                            ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
                                            : "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                                    }
                                >
                                    {customer.isActive ? "Actif" : "Désactivé"}
                                </span>
                            </div>

                            <div className="mt-5 space-y-3 text-sm text-neutral-600">
                                <p className="flex items-center gap-2">
                                    <Phone size={17} />
                                    {customer.phone}
                                </p>

                                <p className="flex items-center gap-2">
                                    <Mail size={17} />
                                    {customer.email ?? "Email non renseigné"}
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={handleToggleStatus}
                                className={
                                    customer.isActive
                                        ? "mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-red-200 px-6 py-3 text-sm font-bold text-red-700 transition hover:border-red-600 disabled:opacity-50"
                                        : "mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-green-200 px-6 py-3 text-sm font-bold text-green-700 transition hover:border-green-600 disabled:opacity-50"
                                }
                            >
                                {customer.isActive ? (
                                    <ShieldOff size={18} />
                                ) : (
                                    <ShieldCheck size={18} />
                                )}

                                {actionLoading
                                    ? "Mise à jour..."
                                    : customer.isActive
                                      ? "Désactiver le client"
                                      : "Activer le client"}
                            </button>
                        </aside>

                        <div className="space-y-6">
                            <div className="grid gap-5 md:grid-cols-3">
                                <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                                    <PackageCheck size={30} />

                                    <p className="mt-5 text-sm text-neutral-500">
                                        Commandes
                                    </p>

                                    <p className="mt-1 text-3xl font-black">
                                        {customer.ordersCount}
                                    </p>
                                </div>

                                <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                                    <PackageCheck size={30} />

                                    <p className="mt-5 text-sm text-neutral-500">
                                        Total dépensé
                                    </p>

                                    <p className="mt-1 text-3xl font-black">
                                        {formatPrice(customer.totalSpent)}
                                    </p>
                                </div>

                                <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                                    <PackageCheck size={30} />

                                    <p className="mt-5 text-sm text-neutral-500">
                                        Dernière commande
                                    </p>

                                    <p className="mt-1 text-3xl font-black">
                                        {formatDate(customer.lastOrderAt)}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                                    <div>
                                        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                                            Historique
                                        </p>

                                        <h2 className="mt-2 text-3xl font-black">
                                            Commandes du client
                                        </h2>
                                    </div>

                                    {customerOrders.length > 0 && (
                                        <div className="rounded-full bg-neutral-100 px-5 py-3 text-sm font-bold text-neutral-600">
                                            Affichage de{" "}
                                            {firstVisibleOrderIndex} à{" "}
                                            {lastVisibleOrderIndex} sur{" "}
                                            {customerOrders.length} commande
                                            {customerOrders.length > 1
                                                ? "s"
                                                : ""}
                                        </div>
                                    )}
                                </div>

                                {customerOrders.length === 0 ? (
                                    <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-neutral-500">
                                        Ce client n’a pas encore de commande.
                                    </div>
                                ) : (
                                    <>
                                        <div className="mt-6 space-y-4">
                                            {paginatedOrders.map((order) => (
                                                <article
                                                    key={order.id}
                                                    className="rounded-3xl border border-neutral-200 p-5"
                                                >
                                                    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                                                        <div>
                                                            <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                                                                Commande
                                                            </p>

                                                            <div className="mt-2 flex flex-wrap items-center gap-3">
                                                                <h3 className="text-2xl font-black">
                                                                    {
                                                                        order.orderNumber
                                                                    }
                                                                </h3>

                                                                <span
                                                                    className={getOrderStatusClassName(
                                                                        order.orderStatus,
                                                                    )}
                                                                >
                                                                    {getOrderStatusLabel(
                                                                        order.orderStatus,
                                                                    )}
                                                                </span>
                                                            </div>

                                                            <p className="mt-2 text-sm text-neutral-500">
                                                                {formatDate(
                                                                    order.createdAt,
                                                                )}{" "}
                                                                —{" "}
                                                                {
                                                                    order.items
                                                                        .length
                                                                }{" "}
                                                                article(s)
                                                            </p>
                                                        </div>

                                                        <div className="text-left md:text-right">
                                                            <p className="text-2xl font-black">
                                                                {formatPrice(
                                                                    order.total,
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

                                                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                                                        <div className="rounded-2xl bg-neutral-50 p-4">
                                                            <p className="text-xs text-neutral-500">
                                                                Statut commande
                                                            </p>

                                                            <p className="mt-1 font-black">
                                                                {getOrderStatusLabel(
                                                                    order.orderStatus,
                                                                )}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-2xl bg-neutral-50 p-4">
                                                            <p className="text-xs text-neutral-500">
                                                                Paiement
                                                            </p>

                                                            <p className="mt-1 font-black">
                                                                {getPaymentStatusLabel(
                                                                    order.paymentStatus,
                                                                )}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-2xl bg-neutral-50 p-4">
                                                            <p className="text-xs text-neutral-500">
                                                                Ville / magasin
                                                            </p>

                                                            <p className="mt-1 font-black">
                                                                {
                                                                    order.deliveryCity
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {order.items.length > 0 && (
                                                        <div className="mt-5 border-t border-neutral-200 pt-5">
                                                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-neutral-500">
                                                                Articles
                                                            </p>

                                                            <div className="mt-3 space-y-3">
                                                                {order.items.map(
                                                                    (item) => (
                                                                        <div
                                                                            key={
                                                                                item.id
                                                                            }
                                                                            className="flex flex-col justify-between gap-3 rounded-2xl bg-neutral-50 p-4 md:flex-row md:items-center"
                                                                        >
                                                                            <div>
                                                                                <p className="font-black">
                                                                                    {
                                                                                        item.productName
                                                                                    }
                                                                                </p>

                                                                                <p className="mt-1 text-sm text-neutral-500">
                                                                                    Réf.{" "}
                                                                                    {
                                                                                        item.productReference
                                                                                    }{" "}
                                                                                    —{" "}
                                                                                    {
                                                                                        item.color
                                                                                    }{" "}
                                                                                    /{" "}
                                                                                    {
                                                                                        item.size
                                                                                    }
                                                                                </p>
                                                                            </div>

                                                                            <div className="text-left md:text-right">
                                                                                <p className="font-black">
                                                                                    {
                                                                                        item.quantity
                                                                                    }{" "}
                                                                                    ×{" "}
                                                                                    {formatPrice(
                                                                                        item.unitPrice,
                                                                                    )}
                                                                                </p>

                                                                                <p className="mt-1 text-sm text-neutral-500">
                                                                                    Total
                                                                                    :{" "}
                                                                                    {formatPrice(
                                                                                        item.totalPrice,
                                                                                    )}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </article>
                                            ))}
                                        </div>

                                        {totalPages > 1 && (
                                            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        goToPage(
                                                            currentPage - 1,
                                                        )
                                                    }
                                                    disabled={currentPage === 1}
                                                    className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    <ChevronLeft size={16} />
                                                    Précédent
                                                </button>

                                                {paginationRange[0] > 1 && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                goToPage(1)
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

                                                {paginationRange.map((page) => (
                                                    <button
                                                        key={page}
                                                        type="button"
                                                        onClick={() =>
                                                            goToPage(page)
                                                        }
                                                        className={
                                                            currentPage === page
                                                                ? "h-11 min-w-11 rounded-full bg-black px-4 text-sm font-black text-white"
                                                                : "h-11 min-w-11 rounded-full border border-neutral-300 bg-white px-4 text-sm font-black transition hover:border-black"
                                                        }
                                                    >
                                                        {page}
                                                    </button>
                                                ))}

                                                {paginationRange[
                                                    paginationRange.length - 1
                                                ] < totalPages && (
                                                    <>
                                                        <span className="px-2 text-sm font-black text-neutral-400">
                                                            ...
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                goToPage(
                                                                    totalPages,
                                                                )
                                                            }
                                                            className="h-11 min-w-11 rounded-full border border-neutral-300 bg-white px-4 text-sm font-black transition hover:border-black"
                                                        >
                                                            {totalPages}
                                                        </button>
                                                    </>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        goToPage(
                                                            currentPage + 1,
                                                        )
                                                    }
                                                    disabled={
                                                        currentPage ===
                                                        totalPages
                                                    }
                                                    className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    Suivant
                                                    <ChevronRight size={16} />
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
        </main>
    );
}
