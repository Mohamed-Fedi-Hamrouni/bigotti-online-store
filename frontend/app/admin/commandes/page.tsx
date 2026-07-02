"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminOrders, updateOrderStatus } from "@/lib/api";
import type { AdminOrder, OrderStatus, PaymentStatus } from "@/types/order";

const ORDER_STATUS_OPTIONS: Array<{
    value: OrderStatus;
    label: string;
}> = [
    { value: "PENDING", label: "En attente" },
    { value: "CONFIRMED", label: "Confirmée" },
    { value: "PREPARING", label: "En préparation" },
    { value: "SHIPPED", label: "Expédiée" },
    { value: "DELIVERED", label: "Livrée" },
    { value: "CANCELLED", label: "Annulée" },
];

const PAYMENT_STATUS_OPTIONS: Array<{
    value: PaymentStatus;
    label: string;
}> = [
    { value: "UNPAID", label: "Non payé" },
    { value: "PAID", label: "Payé" },
    { value: "FAILED", label: "Échoué" },
    { value: "REFUNDED", label: "Remboursé" },
];

const PAYMENT_STATUS_LABELS: Record<string, string> = {
    UNPAID: "Non payé",
    PAID: "Payé",
    FAILED: "Échoué",
    REFUNDED: "Remboursé",
};

type OrderStatusFilter = "ALL" | OrderStatus;
type PaymentStatusFilter = "ALL" | PaymentStatus;

function formatPrice(value: number | string | null | undefined) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return "0.000 TND";
    }

    return `${numericValue.toFixed(3)} TND`;
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("fr-FR");
}

function getOrderStatusLabel(status: OrderStatus) {
    return (
        ORDER_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
        status
    );
}

function getOrderStatusClassName(status: OrderStatus) {
    if (status === "CANCELLED") {
        return "rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700";
    }

    if (status === "DELIVERED") {
        return "rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700";
    }

    if (status === "PENDING") {
        return "rounded-full bg-yellow-50 px-3 py-1 text-sm font-semibold text-yellow-700";
    }

    return "rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700";
}

export default function AdminOrdersPage() {
    const router = useRouter();

    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [orderStatusFilter, setOrderStatusFilter] =
        useState<OrderStatusFilter>("ALL");
    const [paymentStatusFilter, setPaymentStatusFilter] =
        useState<PaymentStatusFilter>("ALL");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

    useEffect(() => {
        const token = window.localStorage.getItem("bigotti-admin-token");

        if (!token) {
            router.push("/admin/login");
            return;
        }

        getAdminOrders(token)
            .then(setOrders)
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Erreur de chargement.",
                );
            })
            .finally(() => setIsLoading(false));
    }, [router]);

    const filteredOrders = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLowerCase();

        return orders.filter((order) => {
            const matchesSearch =
                !normalizedSearch ||
                order.orderNumber.toLowerCase().includes(normalizedSearch) ||
                order.customerName.toLowerCase().includes(normalizedSearch) ||
                order.customerPhone.toLowerCase().includes(normalizedSearch) ||
                String(order.customerEmail ?? "")
                    .toLowerCase()
                    .includes(normalizedSearch) ||
                order.deliveryCity.toLowerCase().includes(normalizedSearch);

            const matchesOrderStatus =
                orderStatusFilter === "ALL" ||
                order.orderStatus === orderStatusFilter;

            const matchesPaymentStatus =
                paymentStatusFilter === "ALL" ||
                order.paymentStatus === paymentStatusFilter;

            return matchesSearch && matchesOrderStatus && matchesPaymentStatus;
        });
    }, [orders, searchQuery, orderStatusFilter, paymentStatusFilter]);

    const totalOrders = orders.length;

    const pendingOrders = orders.filter(
        (order) => order.orderStatus === "PENDING",
    ).length;

    const deliveredOrders = orders.filter(
        (order) => order.orderStatus === "DELIVERED",
    ).length;

    const cancelledOrders = orders.filter(
        (order) => order.orderStatus === "CANCELLED",
    ).length;

    const totalRevenue = orders
        .filter((order) => order.orderStatus !== "CANCELLED")
        .reduce((sum, order) => sum + Number(order.total), 0);

    async function handleStatusChange(
        order: AdminOrder,
        orderStatus: OrderStatus,
    ) {
        if (order.orderStatus === orderStatus) {
            return;
        }

        if (orderStatus === "CANCELLED") {
            const confirmed = window.confirm(
                `Confirmer l’annulation de la commande ${order.orderNumber} ?\n\nLa commande ne sera pas supprimée. Elle passera au statut Annulée et restera conservée dans l’historique admin, les statistiques et la fiche client.`,
            );

            if (!confirmed) {
                return;
            }
        }

        if (order.orderStatus === "CANCELLED" && orderStatus !== "CANCELLED") {
            const confirmed = window.confirm(
                `Réactiver la commande ${order.orderNumber} avec le statut "${getOrderStatusLabel(
                    orderStatus,
                )}" ?`,
            );

            if (!confirmed) {
                return;
            }
        }

        const token = window.localStorage.getItem("bigotti-admin-token");

        if (!token) {
            router.push("/admin/login");
            return;
        }

        try {
            setUpdatingOrderId(order.id);

            const updatedOrder = await updateOrderStatus(
                token,
                order.id,
                orderStatus,
            );

            setOrders((currentOrders) =>
                currentOrders.map((currentOrder) =>
                    currentOrder.id === order.id ? updatedOrder : currentOrder,
                ),
            );
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la mise à jour.",
            );
        } finally {
            setUpdatingOrderId(null);
        }
    }

    function logout() {
        window.localStorage.removeItem("bigotti-admin-token");
        window.localStorage.removeItem("bigotti-admin-user");
        router.push("/admin/login");
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

                    <div className="flex items-center gap-6">
                        <Link
                            href="/"
                            className="text-sm font-medium text-neutral-600 hover:text-black"
                        >
                            Boutique
                        </Link>

                        <button
                            type="button"
                            onClick={logout}
                            className="text-sm font-medium text-neutral-600 hover:text-black"
                        >
                            Déconnexion
                        </button>
                    </div>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-6 py-12">
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                            Administration
                        </p>

                        <h1 className="mt-2 text-4xl font-bold">
                            Commandes clients
                        </h1>

                        <p className="mt-2 text-neutral-600">
                            Recherchez, filtrez et annulez les commandes sans
                            suppression définitive.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/admin"
                            className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold hover:border-black"
                        >
                            Retour dashboard
                        </Link>

                        <Link
                            href="/admin/clients"
                            className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
                        >
                            Clients
                        </Link>
                    </div>
                </div>

                <div className="mb-8 grid gap-5 md:grid-cols-5">
                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-neutral-500">
                            Total commandes
                        </p>

                        <p className="mt-2 text-3xl font-bold">{totalOrders}</p>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-neutral-500">En attente</p>

                        <p className="mt-2 text-3xl font-bold">
                            {pendingOrders}
                        </p>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-neutral-500">Livrées</p>

                        <p className="mt-2 text-3xl font-bold">
                            {deliveredOrders}
                        </p>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-neutral-500">Annulées</p>

                        <p className="mt-2 text-3xl font-bold text-red-700">
                            {cancelledOrders}
                        </p>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-neutral-500">
                            CA hors annulation
                        </p>

                        <p className="mt-2 text-2xl font-bold">
                            {formatPrice(totalRevenue)}
                        </p>
                    </div>
                </div>

                <div className="mb-8 rounded-[2rem] bg-white p-6 shadow-sm">
                    <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
                        <input
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(event.target.value)
                            }
                            placeholder="Rechercher numéro, client, téléphone, email, ville..."
                            className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
                        />

                        <select
                            value={orderStatusFilter}
                            onChange={(event) =>
                                setOrderStatusFilter(
                                    event.target.value as OrderStatusFilter,
                                )
                            }
                            className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                        >
                            <option value="ALL">Tous les statuts</option>

                            {ORDER_STATUS_OPTIONS.map((status) => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={paymentStatusFilter}
                            onChange={(event) =>
                                setPaymentStatusFilter(
                                    event.target.value as PaymentStatusFilter,
                                )
                            }
                            className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                        >
                            <option value="ALL">Tous les paiements</option>

                            {PAYMENT_STATUS_OPTIONS.map((status) => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <p className="mt-4 text-sm text-neutral-500">
                        {filteredOrders.length} commande(s) affichée(s)
                    </p>
                </div>

                {isLoading && (
                    <div className="rounded-3xl bg-white p-8 shadow-sm">
                        Chargement des commandes...
                    </div>
                )}

                {error && (
                    <div className="rounded-3xl bg-red-50 p-8 text-red-700">
                        {error}
                    </div>
                )}

                {!isLoading && !error && filteredOrders.length === 0 && (
                    <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
                        <h2 className="text-2xl font-bold">
                            Aucune commande trouvée.
                        </h2>
                    </div>
                )}

                <div className="space-y-5">
                    {filteredOrders.map((order) => {
                        const isCancelled = order.orderStatus === "CANCELLED";
                        const isUpdating = updatingOrderId === order.id;

                        return (
                            <article
                                key={order.id}
                                className={
                                    isCancelled
                                        ? "rounded-[2rem] border border-red-100 bg-white p-6 opacity-80 shadow-sm"
                                        : "rounded-[2rem] bg-white p-6 shadow-sm"
                                }
                            >
                                <div className="flex flex-col justify-between gap-5 border-b border-neutral-200 pb-5 lg:flex-row lg:items-start">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h2 className="text-2xl font-bold">
                                                {order.orderNumber}
                                            </h2>

                                            <span
                                                className={getOrderStatusClassName(
                                                    order.orderStatus,
                                                )}
                                            >
                                                {getOrderStatusLabel(
                                                    order.orderStatus,
                                                )}
                                            </span>

                                            <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">
                                                {
                                                    PAYMENT_STATUS_LABELS[
                                                        order.paymentStatus
                                                    ]
                                                }
                                            </span>
                                        </div>

                                        <p className="mt-3 text-neutral-600">
                                            Client :{" "}
                                            <span className="font-semibold text-neutral-950">
                                                {order.customerName}
                                            </span>{" "}
                                            — {order.customerPhone}
                                        </p>

                                        <p className="mt-1 text-neutral-600">
                                            Adresse : {order.deliveryAddress},{" "}
                                            {order.deliveryCity}
                                        </p>

                                        <p className="mt-1 text-sm text-neutral-500">
                                            Date : {formatDate(order.createdAt)}
                                        </p>

                                        {isCancelled && (
                                            <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                                                Cette commande est annulée. Elle
                                                n’est pas supprimée : elle reste
                                                conservée dans l’historique
                                                admin et dans la fiche client.
                                            </p>
                                        )}
                                    </div>

                                    <div className="text-left lg:text-right">
                                        <p className="text-sm text-neutral-500">
                                            Total
                                        </p>

                                        <p
                                            className={
                                                isCancelled
                                                    ? "text-2xl font-bold text-neutral-400 line-through"
                                                    : "text-2xl font-bold"
                                            }
                                        >
                                            {formatPrice(order.total)}
                                        </p>

                                        <p className="mt-2 text-sm text-neutral-500">
                                            {order.paymentMethod ===
                                            "CASH_ON_DELIVERY"
                                                ? "Paiement à la livraison"
                                                : "Paiement carte"}
                                        </p>

                                        <Link
                                            href={`/admin/commandes/${order.id}`}
                                            className="mt-4 inline-flex rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
                                        >
                                            Détail
                                        </Link>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_260px]">
                                    <div className="space-y-3">
                                        {order.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="rounded-2xl bg-neutral-50 p-4"
                                            >
                                                <p className="font-bold">
                                                    {item.productName}
                                                </p>

                                                <p className="mt-1 text-sm text-neutral-500">
                                                    Réf. {item.productReference}{" "}
                                                    — {item.color} / Taille{" "}
                                                    {item.size}
                                                </p>

                                                <p className="mt-2 text-sm">
                                                    Quantité : {item.quantity} ×{" "}
                                                    {formatPrice(
                                                        item.unitPrice,
                                                    )}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <label className="text-sm font-semibold">
                                            Statut commande
                                        </label>

                                        <select
                                            value={order.orderStatus}
                                            disabled={isUpdating}
                                            onChange={(event) =>
                                                handleStatusChange(
                                                    order,
                                                    event.target
                                                        .value as OrderStatus,
                                                )
                                            }
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                                        >
                                            {ORDER_STATUS_OPTIONS.map(
                                                (status) => (
                                                    <option
                                                        key={status.value}
                                                        value={status.value}
                                                    >
                                                        {status.label}
                                                    </option>
                                                ),
                                            )}
                                        </select>

                                        {isUpdating && (
                                            <p className="mt-2 text-sm text-neutral-500">
                                                Mise à jour...
                                            </p>
                                        )}

                                        {!isCancelled && (
                                            <button
                                                type="button"
                                                disabled={isUpdating}
                                                onClick={() =>
                                                    handleStatusChange(
                                                        order,
                                                        "CANCELLED",
                                                    )
                                                }
                                                className="mt-4 inline-flex w-full justify-center rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-700 hover:border-red-600 disabled:opacity-50"
                                            >
                                                Annuler la commande
                                            </button>
                                        )}

                                        <Link
                                            href={`/suivi-commande?orderNumber=${encodeURIComponent(
                                                order.orderNumber,
                                            )}&phone=${encodeURIComponent(
                                                order.customerPhone,
                                            )}`}
                                            className="mt-4 inline-flex w-full justify-center rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold hover:border-black"
                                        >
                                            Suivi client
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}
