"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createOrder } from "@/lib/api";
import { useCart } from "@/components/cart/CartProvider";
import type { CreatedOrder } from "@/types/order";

function formatPrice(value: number) {
    return `${value.toFixed(3)} TND`;
}

export default function CheckoutPage() {
    const { items, subtotal, deliveryFee, total, clearCart } = useCart();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        if (items.length === 0) {
            setError("Votre panier est vide.");
            return;
        }

        const formData = new FormData(event.currentTarget);

        const payload = {
            customerName: String(formData.get("customerName") ?? ""),
            customerPhone: String(formData.get("customerPhone") ?? ""),
            customerEmail:
                String(formData.get("customerEmail") ?? "").trim() || undefined,
            deliveryAddress: String(formData.get("deliveryAddress") ?? ""),
            deliveryCity: String(formData.get("deliveryCity") ?? ""),
            deliveryNotes:
                String(formData.get("deliveryNotes") ?? "").trim() || undefined,
            paymentMethod: String(formData.get("paymentMethod")) as
                | "CASH_ON_DELIVERY"
                | "CARD",
            items: items.map((item) => ({
                variantId: item.variantId,
                quantity: item.quantity,
            })),
        };

        try {
            setIsSubmitting(true);
            const order = await createOrder(payload);
            setCreatedOrder(order);
            clearCart();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la commande.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    if (createdOrder) {
        return (
            <main className="min-h-screen bg-neutral-50 text-neutral-950">
                <section className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
                    <div className="w-full rounded-[2rem] bg-white p-10 text-center shadow-sm">
                        <img
                            src="/images/bigotti-logo.jpg"
                            alt="Bigotti Collection"
                            className="mx-auto h-20 w-auto object-contain"
                        />

                        <h1 className="mt-8 text-4xl font-bold">
                            Commande confirmée
                        </h1>

                        <p className="mt-4 text-neutral-600">
                            Votre commande a été enregistrée avec succès.
                        </p>

                        <div className="mt-8 rounded-3xl bg-neutral-50 p-6 text-left">
                            <p className="text-sm text-neutral-500">
                                Numéro de commande
                            </p>
                            <p className="mt-1 text-2xl font-bold">
                                {createdOrder.orderNumber}
                            </p>

                            <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                                <div>
                                    <p className="text-neutral-500">Client</p>
                                    <p className="font-semibold">
                                        {createdOrder.customerName}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-neutral-500">Total</p>
                                    <p className="font-semibold">
                                        {formatPrice(createdOrder.total)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-neutral-500">Paiement</p>
                                    <p className="font-semibold">
                                        {createdOrder.paymentMethod ===
                                        "CASH_ON_DELIVERY"
                                            ? "Paiement à la livraison"
                                            : "Paiement carte"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-neutral-500">Statut</p>
                                    <p className="font-semibold">
                                        {createdOrder.orderStatus}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Link
                            href="/"
                            className="mt-8 inline-flex rounded-full bg-black px-6 py-3 text-sm font-bold text-white"
                        >
                            Retour boutique
                        </Link>
                    </div>
                </section>
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

                    <Link
                        href="/panier"
                        className="text-sm font-medium text-neutral-600 hover:text-black"
                    >
                        Retour panier
                    </Link>
                </div>
            </header>

            <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1fr_380px]">
                <form
                    onSubmit={handleSubmit}
                    className="rounded-[2rem] bg-white p-8 shadow-sm"
                >
                    <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                        Finaliser la commande
                    </p>

                    <h1 className="mt-2 text-4xl font-bold">
                        Informations de livraison
                    </h1>

                    {error && (
                        <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="mt-8 grid gap-5">
                        <div>
                            <label className="text-sm font-semibold">
                                Nom complet
                            </label>
                            <input
                                name="customerName"
                                required
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                placeholder="Ahmed Ben Ali"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold">
                                Téléphone
                            </label>
                            <input
                                name="customerPhone"
                                required
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                placeholder="22000000"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold">
                                Email
                            </label>
                            <input
                                name="customerEmail"
                                type="email"
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                placeholder="client@email.com"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold">
                                Ville
                            </label>
                            <input
                                name="deliveryCity"
                                required
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                placeholder="Tunis"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold">
                                Adresse
                            </label>
                            <input
                                name="deliveryAddress"
                                required
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                placeholder="Rue principale, La Marsa"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold">
                                Notes de livraison
                            </label>
                            <textarea
                                name="deliveryNotes"
                                rows={4}
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                placeholder="Appeler avant la livraison..."
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold">
                                Méthode de paiement
                            </label>

                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <label className="cursor-pointer rounded-2xl border border-neutral-300 p-4">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="CASH_ON_DELIVERY"
                                        defaultChecked
                                    />
                                    <span className="ml-2 font-semibold">
                                        Paiement à la livraison
                                    </span>
                                </label>

                                <label className="cursor-pointer rounded-2xl border border-neutral-300 p-4">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="CARD"
                                    />
                                    <span className="ml-2 font-semibold">
                                        Carte bancaire simulée
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || items.length === 0}
                        className="mt-8 w-full rounded-full bg-black px-6 py-4 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                    >
                        {isSubmitting
                            ? "Commande en cours..."
                            : "Confirmer la commande"}
                    </button>
                </form>

                <aside className="h-fit rounded-[2rem] bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-bold">Résumé</h2>

                    <div className="mt-6 space-y-4">
                        {items.map((item) => (
                            <div
                                key={item.variantId}
                                className="flex justify-between gap-4 text-sm"
                            >
                                <div>
                                    <p className="font-semibold">
                                        {item.productName}
                                    </p>
                                    <p className="text-neutral-500">
                                        {item.color} / {item.size} ×{" "}
                                        {item.quantity}
                                    </p>
                                </div>

                                <p className="font-semibold">
                                    {formatPrice(
                                        item.unitPrice * item.quantity,
                                    )}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 space-y-3 border-t border-neutral-200 pt-5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Sous-total</span>
                            <span>{formatPrice(subtotal)}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-neutral-500">Livraison</span>
                            <span>{formatPrice(deliveryFee)}</span>
                        </div>

                        <div className="flex justify-between pt-3 text-lg font-bold">
                            <span>Total</span>
                            <span>{formatPrice(total)}</span>
                        </div>
                    </div>
                </aside>
            </section>
        </main>
    );
}
