"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminOrders, updateOrderStatus } from "@/lib/api";
import type { AdminOrder, OrderStatus } from "@/types/order";

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

const PAYMENT_STATUS_LABELS = {
    UNPAID: "Non payé",
    PAID: "Payé",
    FAILED: "Échoué",
    REFUNDED: "Remboursé",
};

function formatPrice(value: number | string | null | undefined) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return "0.000 TND";
    }

    return `${numericValue.toFixed(3)} TND`;
}

function getOrderStatusLabel(status: OrderStatus) {
    return (
        ORDER_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
        status
    );
}

export default function AdminOrdersPage() {
    const router = useRouter();

    const [orders, setOrders] = useState<AdminOrder[]>([]);
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

    async function handleStatusChange(
        orderId: string,
        orderStatus: OrderStatus,
    ) {
        const token = window.localStorage.getItem("bigotti-admin-token");

        if (!token) {
            router.push("/admin/login");
            return;
        }

        try {
            setUpdatingOrderId(orderId);
            const updatedOrder = await updateOrderStatus(
                token,
                orderId,
                orderStatus,
            );

            setOrders((currentOrders) =>
                currentOrders.map((order) =>
                    order.id === orderId ? updatedOrder : order,
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
                    </div>

                    <Link
                        href="/admin"
                        className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold hover:border-black"
                    >
                        Retour dashboard
                    </Link>
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

                {!isLoading && !error && orders.length === 0 && (
                    <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
                        <h2 className="text-2xl font-bold">
                            Aucune commande pour le moment.
                        </h2>
                    </div>
                )}

                <div className="space-y-5">
                    {orders.map((order) => (
                        <article
                            key={order.id}
                            className="rounded-[2rem] bg-white p-6 shadow-sm"
                        >
                            <div className="flex flex-col justify-between gap-5 border-b border-neutral-200 pb-5 lg:flex-row lg:items-start">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h2 className="text-2xl font-bold">
                                            {order.orderNumber}
                                        </h2>

                                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">
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
                                </div>

                                <div className="text-left lg:text-right">
                                    <p className="text-sm text-neutral-500">
                                        Total
                                    </p>

                                    <p className="text-2xl font-bold">
                                        {formatPrice(order.total)}
                                    </p>

                                    <p className="mt-2 text-sm text-neutral-500">
                                        {order.paymentMethod ===
                                        "CASH_ON_DELIVERY"
                                            ? "Paiement à la livraison"
                                            : "Paiement carte"}
                                    </p>
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
                                                Réf. {item.productReference} —{" "}
                                                {item.color} / Taille{" "}
                                                {item.size}
                                            </p>

                                            <p className="mt-2 text-sm">
                                                Quantité : {item.quantity} ×{" "}
                                                {formatPrice(item.unitPrice)}
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
                                        disabled={updatingOrderId === order.id}
                                        onChange={(event) =>
                                            handleStatusChange(
                                                order.id,
                                                event.target
                                                    .value as OrderStatus,
                                            )
                                        }
                                        className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                                    >
                                        {ORDER_STATUS_OPTIONS.map((status) => (
                                            <option
                                                key={status.value}
                                                value={status.value}
                                            >
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>

                                    {updatingOrderId === order.id && (
                                        <p className="mt-2 text-sm text-neutral-500">
                                            Mise à jour...
                                        </p>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
