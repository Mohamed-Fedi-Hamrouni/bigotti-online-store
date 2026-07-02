"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    Mail,
    PackageCheck,
    Phone,
    Search,
    ShieldCheck,
    ShieldOff,
    UserRound,
} from "lucide-react";
import type { AdminCustomer } from "@/types/customer";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type CustomerStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type CustomerSortOption =
    | "RECENT_ORDER"
    | "TOTAL_SPENT_DESC"
    | "ORDERS_DESC"
    | "NAME_ASC";

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

async function fetchAdminCustomers(token: string) {
    const response = await fetch(`${API_BASE_URL}/customers/admin`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);

        throw new Error(
            errorPayload?.message ?? "Erreur lors du chargement des clients.",
        );
    }

    return response.json() as Promise<AdminCustomer[]>;
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

function formatDate(value: string | null) {
    if (!value) {
        return "Aucune commande";
    }

    return new Date(value).toLocaleDateString("fr-FR");
}

function getDateTimestamp(value: string | null) {
    if (!value) {
        return 0;
    }

    return new Date(value).getTime();
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

export default function AdminCustomersPage() {
    const [customers, setCustomers] = useState<AdminCustomer[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] =
        useState<CustomerStatusFilter>("ALL");
    const [sortOption, setSortOption] =
        useState<CustomerSortOption>("RECENT_ORDER");
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const token = getAdminToken();

        if (!token) {
            setError("Session admin introuvable. Connectez-vous à nouveau.");
            setIsLoading(false);
            return;
        }

        fetchAdminCustomers(token)
            .then(setCustomers)
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Erreur lors du chargement des clients.",
                );
            })
            .finally(() => setIsLoading(false));
    }, []);

    const filteredCustomers = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLowerCase();

        const filtered = customers.filter((customer) => {
            const matchesSearch =
                !normalizedSearch ||
                customer.fullName.toLowerCase().includes(normalizedSearch) ||
                customer.phone.toLowerCase().includes(normalizedSearch) ||
                String(customer.email ?? "")
                    .toLowerCase()
                    .includes(normalizedSearch);

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && customer.isActive) ||
                (statusFilter === "INACTIVE" && !customer.isActive);

            return matchesSearch && matchesStatus;
        });

        return [...filtered].sort((firstCustomer, secondCustomer) => {
            if (sortOption === "TOTAL_SPENT_DESC") {
                return (
                    Number(secondCustomer.totalSpent) -
                    Number(firstCustomer.totalSpent)
                );
            }

            if (sortOption === "ORDERS_DESC") {
                return secondCustomer.ordersCount - firstCustomer.ordersCount;
            }

            if (sortOption === "NAME_ASC") {
                return firstCustomer.fullName.localeCompare(
                    secondCustomer.fullName,
                );
            }

            const secondDate =
                getDateTimestamp(secondCustomer.lastOrderAt) ||
                getDateTimestamp(secondCustomer.createdAt);

            const firstDate =
                getDateTimestamp(firstCustomer.lastOrderAt) ||
                getDateTimestamp(firstCustomer.createdAt);

            return secondDate - firstDate;
        });
    }, [customers, searchQuery, statusFilter, sortOption]);

    const totalCustomers = customers.length;

    const activeCustomers = customers.filter(
        (customer) => customer.isActive,
    ).length;

    const inactiveCustomers = totalCustomers - activeCustomers;

    const totalRevenue = customers.reduce(
        (sum, customer) => sum + Number(customer.totalSpent),
        0,
    );

    async function handleToggleStatus(customer: AdminCustomer) {
        const token = getAdminToken();

        if (!token) {
            setError("Session admin introuvable. Connectez-vous à nouveau.");
            return;
        }

        if (customer.isActive) {
            const confirmed = window.confirm(
                `Confirmer la désactivation du client "${customer.fullName}" ?\n\nLe client ne sera pas supprimé. Son compte sera désactivé, mais son historique de commandes restera conservé dans l’administration.`,
            );

            if (!confirmed) {
                return;
            }
        } else {
            const confirmed = window.confirm(
                `Réactiver le client "${customer.fullName}" ?\n\nLe client pourra de nouveau utiliser son compte.`,
            );

            if (!confirmed) {
                return;
            }
        }

        setError("");
        setActionLoadingId(customer.id);

        try {
            const updatedCustomer = await updateCustomerStatus(
                token,
                customer.id,
                !customer.isActive,
            );

            setCustomers((currentCustomers) =>
                currentCustomers.map((currentCustomer) =>
                    currentCustomer.id === customer.id
                        ? updatedCustomer
                        : currentCustomer,
                ),
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la mise à jour du client.",
            );
        } finally {
            setActionLoadingId("");
        }
    }

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <section className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                            Administration
                        </p>

                        <h1 className="mt-2 text-4xl font-black">Clients</h1>

                        <p className="mt-2 text-neutral-600">
                            Consultez, filtrez et désactivez les clients sans
                            supprimer leur historique.
                        </p>
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
                <div className="grid gap-5 md:grid-cols-4">
                    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                        <UserRound size={30} />

                        <p className="mt-5 text-sm text-neutral-500">
                            Total clients
                        </p>

                        <p className="mt-1 text-3xl font-black">
                            {totalCustomers}
                        </p>
                    </div>

                    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                        <ShieldCheck size={30} />

                        <p className="mt-5 text-sm text-neutral-500">
                            Clients actifs
                        </p>

                        <p className="mt-1 text-3xl font-black">
                            {activeCustomers}
                        </p>
                    </div>

                    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                        <ShieldOff size={30} />

                        <p className="mt-5 text-sm text-neutral-500">
                            Désactivés
                        </p>

                        <p className="mt-1 text-3xl font-black">
                            {inactiveCustomers}
                        </p>
                    </div>

                    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                        <PackageCheck size={30} />

                        <p className="mt-5 text-sm text-neutral-500">
                            CA clients
                        </p>

                        <p className="mt-1 text-2xl font-black">
                            {formatPrice(totalRevenue)}
                        </p>
                    </div>
                </div>

                <div className="mt-8 rounded-[2rem] bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-2xl font-black">
                                Liste des clients
                            </h2>

                            <p className="mt-1 text-neutral-500">
                                {filteredCustomers.length} client(s) affiché(s)
                            </p>
                        </div>

                        <div className="grid w-full gap-3 lg:max-w-3xl lg:grid-cols-[1fr_180px_210px]">
                            <div className="relative">
                                <Search
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                                />

                                <input
                                    value={searchQuery}
                                    onChange={(event) =>
                                        setSearchQuery(event.target.value)
                                    }
                                    placeholder="Rechercher nom, téléphone, email..."
                                    className="w-full rounded-full border border-neutral-300 py-3 pl-11 pr-4 outline-none focus:border-black"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(
                                        event.target
                                            .value as CustomerStatusFilter,
                                    )
                                }
                                className="rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                            >
                                <option value="ALL">Tous</option>
                                <option value="ACTIVE">Actifs</option>
                                <option value="INACTIVE">Désactivés</option>
                            </select>

                            <select
                                value={sortOption}
                                onChange={(event) =>
                                    setSortOption(
                                        event.target
                                            .value as CustomerSortOption,
                                    )
                                }
                                className="rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                            >
                                <option value="RECENT_ORDER">
                                    Dernière commande
                                </option>
                                <option value="TOTAL_SPENT_DESC">
                                    Plus dépensé
                                </option>
                                <option value="ORDERS_DESC">
                                    Plus de commandes
                                </option>
                                <option value="NAME_ASC">Nom A-Z</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-6 rounded-2xl bg-red-50 p-5 text-sm font-semibold text-red-700">
                            {error}
                        </div>
                    )}

                    {isLoading && (
                        <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-neutral-500">
                            Chargement des clients...
                        </div>
                    )}

                    {!isLoading && !error && filteredCustomers.length === 0 && (
                        <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-neutral-500">
                            Aucun client trouvé.
                        </div>
                    )}

                    {!isLoading && filteredCustomers.length > 0 && (
                        <div className="mt-6 space-y-5">
                            {filteredCustomers.map((customer) => {
                                const isInactive = !customer.isActive;
                                const isUpdating =
                                    actionLoadingId === customer.id;

                                return (
                                    <article
                                        key={customer.id}
                                        className={
                                            isInactive
                                                ? "rounded-[2rem] border border-red-100 bg-white p-6 opacity-80"
                                                : "rounded-[2rem] border border-neutral-200 p-6"
                                        }
                                    >
                                        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <h3 className="text-2xl font-black">
                                                        {customer.fullName}
                                                    </h3>

                                                    <span
                                                        className={
                                                            customer.isActive
                                                                ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
                                                                : "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                                                        }
                                                    >
                                                        {customer.isActive
                                                            ? "Actif"
                                                            : "Désactivé"}
                                                    </span>
                                                </div>

                                                <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-600">
                                                    <span className="inline-flex items-center gap-2">
                                                        <Phone size={16} />
                                                        {customer.phone}
                                                    </span>

                                                    <span className="inline-flex items-center gap-2">
                                                        <Mail size={16} />
                                                        {customer.email ??
                                                            "Email non renseigné"}
                                                    </span>
                                                </div>

                                                {isInactive && (
                                                    <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                                                        Ce client est désactivé.
                                                        Il n’est pas supprimé :
                                                        son historique de
                                                        commandes reste
                                                        conservé.
                                                    </p>
                                                )}

                                                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                                    <div className="rounded-2xl bg-neutral-50 p-4">
                                                        <p className="text-xs text-neutral-500">
                                                            Commandes
                                                        </p>

                                                        <p className="mt-1 text-xl font-black">
                                                            {
                                                                customer.ordersCount
                                                            }
                                                        </p>
                                                    </div>

                                                    <div className="rounded-2xl bg-neutral-50 p-4">
                                                        <p className="text-xs text-neutral-500">
                                                            Total dépensé
                                                        </p>

                                                        <p className="mt-1 text-xl font-black">
                                                            {formatPrice(
                                                                customer.totalSpent,
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-2xl bg-neutral-50 p-4">
                                                        <p className="text-xs text-neutral-500">
                                                            Dernière commande
                                                        </p>

                                                        <p className="mt-1 text-xl font-black">
                                                            {formatDate(
                                                                customer.lastOrderAt,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                <Link
                                                    href={`/admin/clients/${customer.id}`}
                                                    className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
                                                >
                                                    Détail
                                                </Link>

                                                <button
                                                    type="button"
                                                    disabled={isUpdating}
                                                    onClick={() =>
                                                        handleToggleStatus(
                                                            customer,
                                                        )
                                                    }
                                                    className={
                                                        customer.isActive
                                                            ? "inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-700 transition hover:border-red-600 disabled:opacity-50"
                                                            : "inline-flex items-center justify-center gap-2 rounded-full border border-green-200 px-5 py-3 text-sm font-bold text-green-700 transition hover:border-green-600 disabled:opacity-50"
                                                    }
                                                >
                                                    {customer.isActive ? (
                                                        <ShieldOff size={18} />
                                                    ) : (
                                                        <ShieldCheck
                                                            size={18}
                                                        />
                                                    )}

                                                    {isUpdating
                                                        ? "Mise à jour..."
                                                        : customer.isActive
                                                          ? "Désactiver"
                                                          : "Réactiver"}
                                                </button>
                                            </div>
                                        </div>

                                        {customer.orders.length > 0 && (
                                            <div className="mt-6 border-t border-neutral-200 pt-5">
                                                <p className="text-sm font-bold uppercase tracking-[0.2em] text-neutral-500">
                                                    Dernières commandes
                                                </p>

                                                <div className="mt-4 space-y-3">
                                                    {customer.orders
                                                        .slice(0, 3)
                                                        .map((order) => (
                                                            <div
                                                                key={order.id}
                                                                className="flex flex-col justify-between gap-3 rounded-2xl bg-neutral-50 p-4 md:flex-row md:items-center"
                                                            >
                                                                <div>
                                                                    <p className="font-black">
                                                                        {
                                                                            order.orderNumber
                                                                        }
                                                                    </p>

                                                                    <p className="mt-1 text-sm text-neutral-500">
                                                                        {getOrderStatusLabel(
                                                                            order.orderStatus,
                                                                        )}{" "}
                                                                        —{" "}
                                                                        {
                                                                            order
                                                                                .items
                                                                                .length
                                                                        }{" "}
                                                                        article(s)
                                                                    </p>
                                                                </div>

                                                                <div className="text-left md:text-right">
                                                                    <p className="font-black">
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
                                                                        className="mt-2 inline-flex text-sm font-bold underline"
                                                                    >
                                                                        Suivre
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
