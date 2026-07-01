"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createOrder } from "@/lib/api";
import { useCart } from "@/components/cart/CartProvider";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import type { CreatedOrder } from "@/types/order";

function formatPrice(value: number | string | null | undefined) {
    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
        return "0.000 TND";
    }

    return `${numericValue.toFixed(3)} TND`;
}

export default function CheckoutPage() {
    const { items, subtotal, deliveryFee, total, clearCart } = useCart();
    const { customer, isAuthenticated } = useCustomerAuth();

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

    useEffect(() => {
        if (customer) {
            setCustomerName(customer.fullName);
            setCustomerPhone(customer.phone);
            setCustomerEmail(customer.email ?? "");
        }
    }, [customer]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        if (items.length === 0) {
            setError("Votre panier est vide.");
            return;
        }

        const formData = new FormData(event.currentTarget);

        const payload = {
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerEmail: customerEmail.trim() || undefined,
            deliveryAddress: String(
                formData.get("deliveryAddress") ?? "",
            ).trim(),
            deliveryCity: String(formData.get("deliveryCity") ?? "").trim(),
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
                <PublicHeader />

                <section className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-6 py-12">
                    <div className="w-full rounded-[2rem] bg-white p-10 text-center shadow-sm">
                        <img
                            src="/images/bigotti-logo.jpg"
                            alt="Bigotti Collection"
                            className="mx-auto h-20 w-auto object-contain"
                        />

                        <h1 className="mt-8 text-4xl font-black">
                            Commande confirmée
                        </h1>

                        <p className="mt-4 text-neutral-600">
                            Votre commande a été enregistrée avec succès.
                        </p>

                        <div className="mt-8 rounded-3xl bg-neutral-50 p-6 text-left">
                            <p className="text-sm text-neutral-500">
                                Numéro de commande
                            </p>

                            <p className="mt-1 text-2xl font-black">
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

                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Link
                                href={`/suivi-commande?orderNumber=${encodeURIComponent(
                                    createdOrder.orderNumber,
                                )}&phone=${encodeURIComponent(
                                    createdOrder.customerPhone,
                                )}`}
                                className="rounded-full bg-black px-6 py-3 text-sm font-bold text-white"
                            >
                                Suivre ma commande
                            </Link>

                            <Link
                                href="/"
                                className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-bold hover:border-black"
                            >
                                Retour boutique
                            </Link>
                        </div>
                    </div>
                </section>

                <PublicFooter />
            </main>
        );
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
                        Finaliser la commande
                    </h1>

                    <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
                        Vérifiez vos informations, renseignez votre adresse et
                        confirmez votre commande.
                    </p>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1fr_380px]">
                <form
                    onSubmit={handleSubmit}
                    className="rounded-[2rem] bg-white p-8 shadow-sm"
                >
                    <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                        Livraison
                    </p>

                    <h2 className="mt-2 text-4xl font-black">
                        Informations client
                    </h2>

                    {isAuthenticated && customer && (
                        <div className="mt-6 rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-700">
                            Connecté en tant que {customer.fullName}. Vos
                            informations sont remplies automatiquement.
                        </div>
                    )}

                    {!isAuthenticated && (
                        <div className="mt-6 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
                            Vous pouvez commander sans compte.{" "}
                            <Link
                                href="/compte/login"
                                className="font-bold text-black underline"
                            >
                                Connectez-vous
                            </Link>{" "}
                            pour pré-remplir vos informations.
                        </div>
                    )}

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
                                value={customerName}
                                onChange={(event) =>
                                    setCustomerName(event.target.value)
                                }
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
                                value={customerPhone}
                                onChange={(event) =>
                                    setCustomerPhone(event.target.value)
                                }
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
                                value={customerEmail}
                                onChange={(event) =>
                                    setCustomerEmail(event.target.value)
                                }
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
                        className="mt-8 w-full rounded-full bg-black px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                    >
                        {isSubmitting
                            ? "Commande en cours..."
                            : "Confirmer la commande"}
                    </button>
                </form>

                <aside className="h-fit rounded-[2rem] bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-black">Résumé</h2>

                    {items.length === 0 ? (
                        <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-500">
                            Votre panier est vide.
                        </div>
                    ) : (
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
                    )}

                    <div className="mt-6 space-y-3 border-t border-neutral-200 pt-5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Sous-total</span>
                            <span>{formatPrice(subtotal)}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-neutral-500">Livraison</span>
                            <span>{formatPrice(deliveryFee)}</span>
                        </div>

                        <div className="flex justify-between pt-3 text-lg font-black">
                            <span>Total</span>
                            <span>{formatPrice(total)}</span>
                        </div>
                    </div>
                </aside>
            </section>

            <PublicFooter />
        </main>
    );
}
