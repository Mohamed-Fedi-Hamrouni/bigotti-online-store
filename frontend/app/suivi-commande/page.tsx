"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { PackageCheck, Search } from "lucide-react";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { trackOrder } from "@/lib/api";
import type { TrackedOrder } from "@/types/order";

function formatPrice(value: number | string | null | undefined) {
    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
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

function getPaymentStatusLabel(status: string) {
    const labels: Record<string, string> = {
        UNPAID: "Non payé",
        PAID: "Payé",
        FAILED: "Échoué",
        REFUNDED: "Remboursé",
    };

    return labels[status] ?? status;
}

function normalizeOrderText(value: string | null | undefined) {
    return (value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function isStorePickupOrder(
    order: Pick<TrackedOrder, "deliveryAddress" | "deliveryNotes">,
) {
    const deliveryAddress = normalizeOrderText(order.deliveryAddress);
    const deliveryNotes = normalizeOrderText(order.deliveryNotes);

    return (
        deliveryAddress.includes("retrait en magasin") ||
        deliveryNotes.includes("retrait en magasin")
    );
}

function getFulfillmentMethodLabel(order: TrackedOrder) {
    return isStorePickupOrder(order)
        ? "Retrait en magasin"
        : "Livraison à domicile";
}

function getFulfillmentLocationLabel(order: TrackedOrder) {
    return isStorePickupOrder(order)
        ? `Magasin ${order.deliveryCity}`
        : order.deliveryCity;
}

function getPaymentMethodLabel(order: TrackedOrder) {
    if (isStorePickupOrder(order)) {
        return "Paiement au retrait magasin";
    }

    if (order.paymentMethod === "CASH_ON_DELIVERY") {
        return "Paiement à la livraison";
    }

    return "Paiement à confirmer";
}

function getFulfillmentDetails(order: TrackedOrder) {
    if (isStorePickupOrder(order)) {
        return `Votre commande est prévue en retrait au magasin ${order.deliveryCity}.`;
    }

    return `${order.deliveryAddress}, ${order.deliveryCity}`;
}

function getStatusStep(status: string) {
    const steps = ["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED"];

    return Math.max(0, steps.indexOf(status));
}

export default function TrackOrderPage() {
    const [order, setOrder] = useState<TrackedOrder | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const [orderNumberInput, setOrderNumberInput] = useState("");
    const [phoneInput, setPhoneInput] = useState("");

    const hasAutoTracked = useRef(false);

    async function searchOrder(orderNumberValue: string, phoneValue: string) {
        const orderNumber = orderNumberValue.trim().toUpperCase();
        const phone = phoneValue.trim();

        setError("");
        setOrder(null);

        if (!orderNumber || !phone) {
            setError("Veuillez saisir le numéro de commande et le téléphone.");
            return;
        }

        try {
            setIsLoading(true);
            const trackedOrder = await trackOrder(orderNumber, phone);
            setOrder(trackedOrder);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Commande introuvable.",
            );
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        const orderNumberFromUrl = String(params.get("orderNumber") ?? "")
            .trim()
            .toUpperCase();

        const phoneFromUrl = String(params.get("phone") ?? "").trim();

        if (orderNumberFromUrl) {
            setOrderNumberInput(orderNumberFromUrl);
        }

        if (phoneFromUrl) {
            setPhoneInput(phoneFromUrl);
        }

        if (orderNumberFromUrl && phoneFromUrl && !hasAutoTracked.current) {
            hasAutoTracked.current = true;
            void searchOrder(orderNumberFromUrl, phoneFromUrl);
        }
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await searchOrder(orderNumberInput, phoneInput);
    }

    const activeStep = order ? getStatusStep(order.orderStatus) : 0;

    const steps = [
        { key: "PENDING", label: "En attente" },
        { key: "CONFIRMED", label: "Confirmée" },
        { key: "PREPARING", label: "Préparation" },
        { key: "SHIPPED", label: "Expédiée" },
        { key: "DELIVERED", label: "Livrée" },
    ];

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <PublicHeader />

            <section className="bg-neutral-950 text-white">
                <div className="mx-auto max-w-7xl px-6 py-16">
                    <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">
                        Bigotti Collection
                    </p>

                    <h1 className="mt-5 max-w-4xl text-5xl font-black uppercase leading-none md:text-7xl">
                        Suivi de commande
                    </h1>

                    <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
                        Entrez votre numéro de commande et votre téléphone pour
                        consulter l’état de votre commande.
                    </p>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[420px_1fr]">
                <form
                    onSubmit={handleSubmit}
                    className="h-fit rounded-[2rem] bg-white p-8 shadow-sm"
                >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
                        <PackageCheck size={26} />
                    </div>

                    <h2 className="mt-6 text-3xl font-black">
                        Rechercher une commande
                    </h2>

                    <p className="mt-3 text-neutral-600">
                        Exemple : BG-0002 avec le numéro de téléphone utilisé
                        lors de la commande.
                    </p>

                    {error && (
                        <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="mt-6 space-y-5">
                        <div>
                            <label className="text-sm font-bold">
                                Numéro de commande
                            </label>

                            <input
                                name="orderNumber"
                                required
                                value={orderNumberInput}
                                onChange={(event) =>
                                    setOrderNumberInput(
                                        event.target.value.toUpperCase(),
                                    )
                                }
                                placeholder="BG-0002"
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 uppercase outline-none focus:border-black"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-bold">
                                Téléphone
                            </label>

                            <input
                                name="phone"
                                required
                                value={phoneInput}
                                onChange={(event) =>
                                    setPhoneInput(event.target.value)
                                }
                                placeholder="20222020"
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
                    >
                        <Search size={18} />
                        {isLoading ? "Recherche..." : "Suivre ma commande"}
                    </button>
                </form>

                <div>
                    {!order && !isLoading && (
                        <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm">
                            <h2 className="text-2xl font-black">
                                Aucun suivi affiché.
                            </h2>

                            <p className="mt-3 text-neutral-500">
                                Recherchez une commande pour afficher son
                                statut, ses articles et son total.
                            </p>

                            <Link
                                href="/boutique"
                                className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-bold text-white"
                            >
                                Retour boutique
                            </Link>
                        </div>
                    )}

                    {isLoading && (
                        <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm">
                            <h2 className="text-2xl font-black">
                                Recherche en cours...
                            </h2>

                            <p className="mt-3 text-neutral-500">
                                Vérification de votre commande.
                            </p>
                        </div>
                    )}

                    {order && (
                        <div className="space-y-6">
                            <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                                <div className="flex flex-col justify-between gap-5 border-b border-neutral-200 pb-6 md:flex-row md:items-start">
                                    <div>
                                        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                                            Commande
                                        </p>

                                        <h2 className="mt-2 text-4xl font-black">
                                            {order.orderNumber}
                                        </h2>

                                        <p className="mt-3 text-neutral-600">
                                            Client :{" "}
                                            <span className="font-bold text-neutral-950">
                                                {order.customerName}
                                            </span>
                                        </p>

                                        <p className="mt-1 text-neutral-600">
                                            Téléphone : {order.customerPhone}
                                        </p>
                                    </div>

                                    <div className="text-left md:text-right">
                                        <p className="text-sm text-neutral-500">
                                            Total
                                        </p>

                                        <p className="mt-2 text-3xl font-black">
                                            {formatPrice(order.total)}
                                        </p>

                                        <p className="mt-2 text-sm font-semibold text-neutral-500">
                                            {getPaymentMethodLabel(order)}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 grid gap-4 md:grid-cols-4">
                                    <div className="rounded-3xl bg-neutral-50 p-5">
                                        <p className="text-sm text-neutral-500">
                                            Statut commande
                                        </p>
                                        <p className="mt-2 text-lg font-black">
                                            {getOrderStatusLabel(
                                                order.orderStatus,
                                            )}
                                        </p>
                                    </div>

                                    <div className="rounded-3xl bg-neutral-50 p-5">
                                        <p className="text-sm text-neutral-500">
                                            Paiement
                                        </p>
                                        <p className="mt-2 text-lg font-black">
                                            {getPaymentStatusLabel(
                                                order.paymentStatus,
                                            )}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-neutral-500">
                                            {getPaymentMethodLabel(order)}
                                        </p>
                                    </div>

                                    <div className="rounded-3xl bg-neutral-50 p-5">
                                        <p className="text-sm text-neutral-500">
                                            Mode
                                        </p>
                                        <p className="mt-2 text-lg font-black">
                                            {getFulfillmentMethodLabel(order)}
                                        </p>
                                    </div>

                                    <div className="rounded-3xl bg-neutral-50 p-5">
                                        <p className="text-sm text-neutral-500">
                                            {isStorePickupOrder(order)
                                                ? "Magasin"
                                                : "Ville"}
                                        </p>
                                        <p className="mt-2 text-lg font-black">
                                            {getFulfillmentLocationLabel(order)}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-3xl bg-neutral-50 p-5">
                                    <p className="text-sm text-neutral-500">
                                        {isStorePickupOrder(order)
                                            ? "Information retrait"
                                            : "Adresse de livraison"}
                                    </p>
                                    <p className="mt-2 font-bold">
                                        {getFulfillmentDetails(order)}
                                    </p>
                                    {order.deliveryNotes && (
                                        <p className="mt-2 text-sm text-neutral-500">
                                            Note : {order.deliveryNotes}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {order.orderStatus !== "CANCELLED" && (
                                <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                                    <h3 className="text-2xl font-black">
                                        Progression
                                    </h3>

                                    <div className="mt-8 grid gap-4 md:grid-cols-5">
                                        {steps.map((step, index) => {
                                            const isActive =
                                                index <= activeStep;

                                            return (
                                                <div
                                                    key={step.key}
                                                    className={
                                                        isActive
                                                            ? "rounded-3xl bg-black p-5 text-white"
                                                            : "rounded-3xl bg-neutral-100 p-5 text-neutral-500"
                                                    }
                                                >
                                                    <p className="text-sm font-black">
                                                        {index + 1}
                                                    </p>
                                                    <p className="mt-2 text-sm font-bold">
                                                        {step.label}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                                <h3 className="text-2xl font-black">
                                    Articles commandés
                                </h3>

                                <div className="mt-5 space-y-3">
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
                                                        {item.productReference}{" "}
                                                        — {item.color} / Taille{" "}
                                                        {item.size}
                                                    </p>
                                                </div>

                                                <div className="text-left md:text-right">
                                                    <p className="font-bold">
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
                    )}
                </div>
            </section>

            <PublicFooter />
        </main>
    );
}
