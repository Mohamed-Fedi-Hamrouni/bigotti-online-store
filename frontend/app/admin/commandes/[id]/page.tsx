"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    CreditCard,
    MapPin,
    PackageCheck,
    Phone,
    UserRound,
} from "lucide-react";
import { getAdminOrder, updateOrderStatus } from "@/lib/api";
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

const PAYMENT_STATUS_LABELS: Record<string, string> = {
    UNPAID: "Non payé",
    PAID: "Payé",
    FAILED: "Échoué",
    REFUNDED: "Remboursé",
};

function getAdminToken() {
    if (typeof window === "undefined") {
        return null;
    }

    return window.localStorage.getItem("bigotti-admin-token");
}

async function fetchAdminOrder(_token: string | null, orderId: string) {
    return getAdminOrder(_token, orderId);
}

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
        return "mt-3 inline-flex rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700";
    }

    if (status === "DELIVERED") {
        return "mt-3 inline-flex rounded-full bg-green-50 px-4 py-2 text-sm font-bold text-green-700";
    }

    if (status === "PENDING") {
        return "mt-3 inline-flex rounded-full bg-yellow-50 px-4 py-2 text-sm font-bold text-yellow-700";
    }

    return "mt-3 inline-flex rounded-full bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700";
}

function normalizeOrderText(value: string | null | undefined) {
    return (value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function isStorePickupOrder(order: AdminOrder) {
    const deliveryAddress = normalizeOrderText(order.deliveryAddress);
    const deliveryNotes = normalizeOrderText(order.deliveryNotes);

    return (
        deliveryAddress.includes("retrait en magasin") ||
        deliveryNotes.includes("retrait en magasin")
    );
}

function getFulfillmentMethodLabel(order: AdminOrder) {
    return isStorePickupOrder(order)
        ? "Retrait en magasin"
        : "Livraison à domicile";
}

function getPaymentMethodLabel(order: AdminOrder) {
    if (isStorePickupOrder(order)) {
        return "Paiement au retrait magasin";
    }

    if (order.paymentMethod === "CASH_ON_DELIVERY") {
        return "Paiement à la livraison";
    }

    return "Paiement à confirmer";
}

export default function AdminOrderDetailPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();

    const [order, setOrder] = useState<AdminOrder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = getAdminToken();

        if (!token) {
            router.push("/admin/login");
            return;
        }

        fetchAdminOrder(token, params.id)
            .then(setOrder)
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Erreur lors du chargement de la commande.",
                );
            })
            .finally(() => setIsLoading(false));
    }, [params.id, router]);

    async function handleStatusChange(orderStatus: OrderStatus) {
        if (!order) {
            return;
        }

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

        const token = getAdminToken();

        if (!token) {
            router.push("/admin/login");
            return;
        }

        try {
            setIsUpdating(true);

            const updatedOrder = await updateOrderStatus(
                token,
                order.id,
                orderStatus,
            );

            setOrder(updatedOrder);
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la mise à jour.",
            );
        } finally {
            setIsUpdating(false);
        }
    }

    const isCancelled = order?.orderStatus === "CANCELLED";

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <section className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link
                            href="/admin/commandes"
                            className="inline-flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-black"
                        >
                            <ArrowLeft size={18} />
                            Retour aux commandes
                        </Link>

                        <p className="mt-5 text-sm uppercase tracking-[0.25em] text-neutral-500">
                            Administration
                        </p>

                        <h1 className="mt-2 text-4xl font-black">
                            Détail commande
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
                            href="/admin/clients"
                            className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
                        >
                            Clients
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-8">
                {isLoading && (
                    <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                        Chargement de la commande...
                    </div>
                )}

                {error && (
                    <div className="rounded-[2rem] bg-red-50 p-8 text-sm font-semibold text-red-700 shadow-sm">
                        {error}
                    </div>
                )}

                {!isLoading && order && (
                    <div className="space-y-6">
                        <div
                            className={
                                isCancelled
                                    ? "rounded-[2rem] border border-red-100 bg-white p-8 opacity-90 shadow-sm"
                                    : "rounded-[2rem] bg-white p-8 shadow-sm"
                            }
                        >
                            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                                <div>
                                    <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                                        Commande
                                    </p>

                                    <h2 className="mt-2 text-4xl font-black">
                                        {order.orderNumber}
                                    </h2>

                                    <p className="mt-3 text-neutral-600">
                                        Créée le {formatDate(order.createdAt)}
                                    </p>

                                    <span
                                        className={getOrderStatusClassName(
                                            order.orderStatus,
                                        )}
                                    >
                                        {getOrderStatusLabel(order.orderStatus)}
                                    </span>

                                    {isCancelled && (
                                        <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                                            Cette commande est annulée. Elle
                                            n’est pas supprimée : elle reste
                                            conservée dans l’historique admin,
                                            dans la fiche client et dans le
                                            suivi de commande.
                                        </p>
                                    )}
                                </div>

                                <div className="text-left md:text-right">
                                    <p className="text-sm text-neutral-500">
                                        Total
                                    </p>

                                    <p
                                        className={
                                            isCancelled
                                                ? "mt-1 text-4xl font-black text-neutral-400 line-through"
                                                : "mt-1 text-4xl font-black"
                                        }
                                    >
                                        {formatPrice(order.total)}
                                    </p>

                                    <Link
                                        href={`/suivi-commande?orderNumber=${encodeURIComponent(
                                            order.orderNumber,
                                        )}&phone=${encodeURIComponent(
                                            order.customerPhone,
                                        )}`}
                                        className="mt-4 inline-flex rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
                                    >
                                        Suivi client
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                            <div className="space-y-6">
                                <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <UserRound size={28} />

                                        <h3 className="text-2xl font-black">
                                            Client
                                        </h3>
                                    </div>

                                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                                        <div className="rounded-2xl bg-neutral-50 p-5">
                                            <p className="text-sm text-neutral-500">
                                                Nom
                                            </p>

                                            <p className="mt-1 font-black">
                                                {order.customerName}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-neutral-50 p-5">
                                            <p className="text-sm text-neutral-500">
                                                Téléphone
                                            </p>

                                            <p className="mt-1 font-black">
                                                {order.customerPhone}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-neutral-50 p-5">
                                            <p className="text-sm text-neutral-500">
                                                Email
                                            </p>

                                            <p className="mt-1 font-black">
                                                {order.customerEmail ??
                                                    "Non renseigné"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <MapPin size={28} />

                                        <h3 className="text-2xl font-black">
                                            Expédition
                                        </h3>
                                    </div>

                                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                                        <div className="rounded-2xl bg-neutral-50 p-5">
                                            <p className="text-sm text-neutral-500">
                                                Mode
                                            </p>

                                            <p className="mt-1 font-black">
                                                {getFulfillmentMethodLabel(
                                                    order,
                                                )}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-neutral-50 p-5">
                                            <p className="text-sm text-neutral-500">
                                                {isStorePickupOrder(order)
                                                    ? "Magasin"
                                                    : "Ville"}
                                            </p>

                                            <p className="mt-1 font-black">
                                                {isStorePickupOrder(order)
                                                    ? `Magasin ${order.deliveryCity}`
                                                    : order.deliveryCity}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-neutral-50 p-5">
                                            <p className="text-sm text-neutral-500">
                                                Frais
                                            </p>

                                            <p className="mt-1 font-black">
                                                {formatPrice(order.deliveryFee)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 rounded-2xl bg-neutral-50 p-5">
                                        <p className="text-sm text-neutral-500">
                                            {isStorePickupOrder(order)
                                                ? "Information retrait"
                                                : "Adresse"}
                                        </p>

                                        <p className="mt-1 font-black">
                                            {isStorePickupOrder(order)
                                                ? `Commande à retirer au magasin ${order.deliveryCity}`
                                                : order.deliveryAddress}
                                        </p>
                                    </div>

                                    {order.deliveryNotes && (
                                        <div className="mt-4 rounded-2xl bg-neutral-50 p-5">
                                            <p className="text-sm text-neutral-500">
                                                Notes
                                            </p>

                                            <p className="mt-1 font-black">
                                                {order.deliveryNotes}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <PackageCheck size={28} />

                                        <h3 className="text-2xl font-black">
                                            Articles commandés
                                        </h3>
                                    </div>

                                    <div className="mt-6 space-y-4">
                                        {order.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="rounded-3xl bg-neutral-50 p-5"
                                            >
                                                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                                    <div>
                                                        <p className="text-lg font-black">
                                                            {item.productName}
                                                        </p>

                                                        <p className="mt-1 text-sm text-neutral-500">
                                                            Réf.{" "}
                                                            {
                                                                item.productReference
                                                            }{" "}
                                                            — {item.color} /
                                                            Taille {item.size}
                                                        </p>
                                                    </div>

                                                    <div className="text-left md:text-right">
                                                        <p className="font-black">
                                                            {item.quantity} ×{" "}
                                                            {formatPrice(
                                                                item.unitPrice,
                                                            )}
                                                        </p>

                                                        <p className="mt-1 text-sm text-neutral-500">
                                                            Total :{" "}
                                                            {formatPrice(
                                                                item.totalPrice,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <aside className="h-fit space-y-6">
                                <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                                    <h3 className="text-2xl font-black">
                                        Statut
                                    </h3>

                                    <p
                                        className={getOrderStatusClassName(
                                            order.orderStatus,
                                        )}
                                    >
                                        {getOrderStatusLabel(order.orderStatus)}
                                    </p>

                                    <label className="mt-6 block text-sm font-bold">
                                        Modifier le statut
                                    </label>

                                    <select
                                        value={order.orderStatus}
                                        disabled={isUpdating}
                                        onChange={(event) =>
                                            handleStatusChange(
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
                                                handleStatusChange("CANCELLED")
                                            }
                                            className="mt-4 inline-flex w-full justify-center rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-700 hover:border-red-600 disabled:opacity-50"
                                        >
                                            Annuler la commande
                                        </button>
                                    )}

                                    {isCancelled && (
                                        <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                                            Annulation enregistrée. La commande
                                            reste consultable et traçable.
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <CreditCard size={28} />

                                        <h3 className="text-2xl font-black">
                                            Paiement
                                        </h3>
                                    </div>

                                    <div className="mt-6 space-y-4">
                                        <div className="rounded-2xl bg-neutral-50 p-5">
                                            <p className="text-sm text-neutral-500">
                                                Méthode
                                            </p>

                                            <p className="mt-1 font-black">
                                                {getPaymentMethodLabel(order)}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-neutral-50 p-5">
                                            <p className="text-sm text-neutral-500">
                                                Statut
                                            </p>

                                            <p className="mt-1 font-black">
                                                {
                                                    PAYMENT_STATUS_LABELS[
                                                        order.paymentStatus
                                                    ]
                                                }
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-neutral-50 p-5">
                                            <p className="text-sm text-neutral-500">
                                                Sous-total
                                            </p>

                                            <p className="mt-1 font-black">
                                                {formatPrice(order.subtotal)}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-neutral-50 p-5">
                                            <p className="text-sm text-neutral-500">
                                                Livraison
                                            </p>

                                            <p className="mt-1 font-black">
                                                {formatPrice(order.deliveryFee)}
                                            </p>
                                        </div>

                                        <div
                                            className={
                                                isCancelled
                                                    ? "rounded-2xl bg-neutral-200 p-5 text-neutral-500"
                                                    : "rounded-2xl bg-black p-5 text-white"
                                            }
                                        >
                                            <p
                                                className={
                                                    isCancelled
                                                        ? "text-sm text-neutral-500"
                                                        : "text-sm text-neutral-300"
                                                }
                                            >
                                                Total
                                            </p>

                                            <p
                                                className={
                                                    isCancelled
                                                        ? "mt-1 text-2xl font-black line-through"
                                                        : "mt-1 text-2xl font-black"
                                                }
                                            >
                                                {formatPrice(order.total)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}
