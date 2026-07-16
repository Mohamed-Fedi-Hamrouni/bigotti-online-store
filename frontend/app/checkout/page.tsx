"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createOrder } from "@/lib/api";
import { useCart } from "@/components/cart/CartProvider";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import type {
    CreateOrderPayload,
    CreatedOrder,
    FulfillmentMethod,
    PickupStore,
} from "@/types/order";
import { bigottiStores } from "@/data/stores";

const DELIVERY_FEE = 8;

const pickupStores = bigottiStores.flatMap((store) =>
    store.pickupStoreCode
        ? [
              {
                  value: store.pickupStoreCode,
                  label: store.name.replace("Bigotti ", ""),
                  address: store.address,
              },
          ]
        : [],
);

function formatPrice(value: number | string | null | undefined) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return "0.000 TND";
    }

    return `${numericValue.toFixed(3)} TND`;
}

function getPickupStoreLabel(store: PickupStore) {
    return pickupStores.find((currentStore) => currentStore.value === store)
        ?.label;
}

function splitFullName(fullName: string) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);

    return {
        firstName: parts[0] ?? "",
        lastName: parts.slice(1).join(" "),
    };
}

function CheckoutStep({
    number,
    title,
    children,
}: {
    number: number;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-center gap-4 border-b border-neutral-200 pb-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-black text-white">
                    {number}.
                </span>

                <h2 className="text-2xl font-black uppercase tracking-[0.18em] text-neutral-800">
                    {title}
                </h2>
            </div>

            <div className="pt-6">{children}</div>
        </section>
    );
}

export default function CheckoutPage() {
    const { items, subtotal, clearCart } = useCart();
    const { customer, token, isAuthenticated } = useCustomerAuth();

    const [customerFirstName, setCustomerFirstName] = useState("");
    const [customerLastName, setCustomerLastName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");

    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [deliveryCity, setDeliveryCity] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [deliveryNotes, setDeliveryNotes] = useState("");

    const [fulfillmentMethod, setFulfillmentMethod] =
        useState<FulfillmentMethod>("DELIVERY");
    const [pickupStore, setPickupStore] = useState<PickupStore>("NABEUL");
    const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

    useEffect(() => {
        if (customer) {
            const names = splitFullName(customer.fullName);

            const timeoutId = window.setTimeout(() => {
                setCustomerFirstName(names.firstName);
                setCustomerLastName(names.lastName);
                setCustomerPhone(customer.phone);
                setCustomerEmail(customer.email ?? "");
            }, 0);
            return () => window.clearTimeout(timeoutId);
        }
    }, [customer]);

    const checkoutDeliveryFee =
        fulfillmentMethod === "STORE_PICKUP" ? 0 : DELIVERY_FEE;
    const checkoutTotal = Number((subtotal + checkoutDeliveryFee).toFixed(3));

    const pickupStoreLabel = useMemo(
        () => getPickupStoreLabel(pickupStore) ?? "Nabeul",
        [pickupStore],
    );

    function validateForm() {
        if (items.length === 0) {
            return "Votre panier est vide.";
        }

        if (!customerFirstName.trim()) {
            return "Le prénom est obligatoire.";
        }

        if (!customerLastName.trim()) {
            return "Le nom est obligatoire.";
        }

        if (customerPhone.trim().length < 8) {
            return "Le téléphone doit contenir au moins 8 chiffres.";
        }

        if (fulfillmentMethod === "DELIVERY") {
            if (!deliveryAddress.trim()) {
                return "L’adresse de livraison est obligatoire.";
            }

            if (!deliveryCity.trim()) {
                return "La ville est obligatoire.";
            }
        }

        if (fulfillmentMethod === "STORE_PICKUP" && !pickupStore) {
            return "Sélectionnez un magasin de retrait.";
        }

        if (!hasAcceptedTerms) {
            return "Vous devez accepter les conditions générales de vente.";
        }

        return "";
    }

    function buildDeliveryNotes() {
        const notes: string[] = [];

        if (fulfillmentMethod === "STORE_PICKUP") {
            notes.push(`Retrait en magasin : ${pickupStoreLabel}`);
        }

        if (postalCode.trim() && fulfillmentMethod === "DELIVERY") {
            notes.push(`Code postal : ${postalCode.trim()}`);
        }

        if (deliveryNotes.trim()) {
            notes.push(deliveryNotes.trim());
        }

        return notes.join("\n") || undefined;
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        const validationError = validateForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        const customerName =
            `${customerFirstName.trim()} ${customerLastName.trim()}`.trim();

        const payload: CreateOrderPayload = {
            customerName,
            customerPhone: customerPhone.trim(),
            customerEmail: customerEmail.trim() || undefined,
            fulfillmentMethod,
            pickupStore:
                fulfillmentMethod === "STORE_PICKUP" ? pickupStore : undefined,
            deliveryAddress:
                fulfillmentMethod === "STORE_PICKUP"
                    ? "Retrait en magasin"
                    : deliveryAddress.trim(),
            deliveryCity:
                fulfillmentMethod === "STORE_PICKUP"
                    ? pickupStoreLabel
                    : deliveryCity.trim(),
            deliveryNotes: buildDeliveryNotes(),
            paymentMethod: "CASH_ON_DELIVERY",
            items: items.map((item) => ({
                variantId: item.variantId,
                quantity: item.quantity,
            })),
        };

        try {
            setIsSubmitting(true);
            const order = await createOrder(payload, token);
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
                                    <p className="text-neutral-500">
                                        Livraison
                                    </p>
                                    <p className="font-semibold">
                                        {createdOrder.deliveryAddress ===
                                        "Retrait en magasin"
                                            ? `Retrait ${createdOrder.deliveryCity}`
                                            : "Livraison à domicile"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-neutral-500">Paiement</p>
                                    <p className="font-semibold">
                                        {createdOrder.deliveryAddress ===
                                        "Retrait en magasin"
                                            ? "Paiement au retrait"
                                            : "Paiement à la livraison"}
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
                <div className="mx-auto max-w-7xl px-6 py-12">
                    <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">
                        Bigotti Collection
                    </p>

                    <h1 className="mt-5 max-w-4xl text-5xl font-black uppercase leading-none md:text-7xl">
                        Finaliser la commande
                    </h1>

                    <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
                        Commandez à domicile ou retirez votre sélection dans le
                        magasin Bigotti de votre choix.
                    </p>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1fr_410px]">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <CheckoutStep number={1} title="Informations personnelles">
                        {isAuthenticated && customer ? (
                            <div className="rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-700">
                                Connecté en tant que {customer.fullName}. Vos
                                informations sont préremplies.
                            </div>
                        ) : (
                            <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="font-bold text-black underline underline-offset-4">
                                        Commander en tant qu’invité
                                    </span>
                                    <span className="text-neutral-300">|</span>
                                    <Link
                                        href="/compte/login"
                                        className="font-bold text-neutral-500 transition hover:text-black"
                                    >
                                        S’identifier
                                    </Link>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 grid gap-5">
                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <label className="text-sm font-bold">
                                        Prénom *
                                    </label>
                                    <input
                                        value={customerFirstName}
                                        onChange={(event) =>
                                            setCustomerFirstName(
                                                event.target.value,
                                            )
                                        }
                                        className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        placeholder="Prénom"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-bold">
                                        Nom *
                                    </label>
                                    <input
                                        value={customerLastName}
                                        onChange={(event) =>
                                            setCustomerLastName(
                                                event.target.value,
                                            )
                                        }
                                        className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        placeholder="Nom"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <label className="text-sm font-bold">
                                        Téléphone *
                                    </label>
                                    <input
                                        value={customerPhone}
                                        onChange={(event) =>
                                            setCustomerPhone(event.target.value)
                                        }
                                        className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        placeholder="Téléphone"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-bold">
                                        E-mail
                                    </label>
                                    <input
                                        type="email"
                                        value={customerEmail}
                                        onChange={(event) =>
                                            setCustomerEmail(event.target.value)
                                        }
                                        className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        placeholder="E-mail"
                                    />
                                </div>
                            </div>
                        </div>
                    </CheckoutStep>

                    <CheckoutStep number={2} title="Adresses">
                        {fulfillmentMethod === "DELIVERY" ? (
                            <div className="grid gap-5">
                                <p className="text-sm leading-6 text-neutral-600">
                                    Cette adresse sera utilisée comme adresse de
                                    livraison.
                                </p>

                                <div>
                                    <label className="text-sm font-bold">
                                        Adresse *
                                    </label>
                                    <input
                                        value={deliveryAddress}
                                        onChange={(event) =>
                                            setDeliveryAddress(
                                                event.target.value,
                                            )
                                        }
                                        className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        placeholder="Adresse"
                                    />
                                </div>

                                <div className="grid gap-5 md:grid-cols-3">
                                    <div>
                                        <label className="text-sm font-bold">
                                            Code postal
                                        </label>
                                        <input
                                            value={postalCode}
                                            onChange={(event) =>
                                                setPostalCode(
                                                    event.target.value,
                                                )
                                            }
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                            placeholder="Code postal"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold">
                                            Ville *
                                        </label>
                                        <input
                                            value={deliveryCity}
                                            onChange={(event) =>
                                                setDeliveryCity(
                                                    event.target.value,
                                                )
                                            }
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                            placeholder="Ville"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold">
                                            Pays
                                        </label>
                                        <input
                                            value="Tunisie"
                                            disabled
                                            className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm leading-6 text-neutral-600">
                                    Sélectionnez le magasin dans lequel vous
                                    souhaitez récupérer votre commande.
                                </p>

                                <div className="mt-5 grid gap-3 md:grid-cols-2">
                                    {pickupStores.map((store) => {
                                        const isSelected =
                                            pickupStore === store.value;

                                        return (
                                            <label
                                                key={store.value}
                                                className={
                                                    isSelected
                                                        ? "cursor-pointer rounded-3xl border border-black bg-black p-5 text-white"
                                                        : "cursor-pointer rounded-3xl border border-neutral-200 bg-white p-5 transition hover:border-black"
                                                }
                                            >
                                                <input
                                                    type="radio"
                                                    name="pickupStore"
                                                    value={store.value}
                                                    checked={isSelected}
                                                    onChange={() =>
                                                        setPickupStore(
                                                            store.value,
                                                        )
                                                    }
                                                    className="sr-only"
                                                />

                                                <p className="text-lg font-black">
                                                    {store.label}
                                                </p>
                                                <p
                                                    className={
                                                        isSelected
                                                            ? "mt-2 text-sm text-white/70"
                                                            : "mt-2 text-sm text-neutral-500"
                                                    }
                                                >
                                                    {store.address}
                                                </p>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CheckoutStep>

                    <CheckoutStep number={3} title="Méthode d’expédition">
                        <div className="grid gap-4 md:grid-cols-2">
                            <label
                                className={
                                    fulfillmentMethod === "DELIVERY"
                                        ? "cursor-pointer rounded-3xl border border-black bg-black p-5 text-white"
                                        : "cursor-pointer rounded-3xl border border-neutral-200 bg-white p-5 transition hover:border-black"
                                }
                            >
                                <input
                                    type="radio"
                                    name="fulfillmentMethod"
                                    value="DELIVERY"
                                    checked={fulfillmentMethod === "DELIVERY"}
                                    onChange={() =>
                                        setFulfillmentMethod("DELIVERY")
                                    }
                                    className="sr-only"
                                />
                                <p className="text-lg font-black">
                                    Livraison à domicile
                                </p>
                                <p
                                    className={
                                        fulfillmentMethod === "DELIVERY"
                                            ? "mt-2 text-sm text-white/70"
                                            : "mt-2 text-sm text-neutral-500"
                                    }
                                >
                                    Frais fixes : {formatPrice(DELIVERY_FEE)}
                                </p>
                            </label>

                            <label
                                className={
                                    fulfillmentMethod === "STORE_PICKUP"
                                        ? "cursor-pointer rounded-3xl border border-black bg-black p-5 text-white"
                                        : "cursor-pointer rounded-3xl border border-neutral-200 bg-white p-5 transition hover:border-black"
                                }
                            >
                                <input
                                    type="radio"
                                    name="fulfillmentMethod"
                                    value="STORE_PICKUP"
                                    checked={
                                        fulfillmentMethod === "STORE_PICKUP"
                                    }
                                    onChange={() =>
                                        setFulfillmentMethod("STORE_PICKUP")
                                    }
                                    className="sr-only"
                                />
                                <p className="text-lg font-black">
                                    Retrait en magasin
                                </p>
                                <p
                                    className={
                                        fulfillmentMethod === "STORE_PICKUP"
                                            ? "mt-2 text-sm text-white/70"
                                            : "mt-2 text-sm text-neutral-500"
                                    }
                                >
                                    Gratuit — Nabeul, Sfax, Lac 2, Lafayette ou
                                    Soukra.
                                </p>
                            </label>
                        </div>

                        <div className="mt-6">
                            <label className="text-sm font-bold">
                                Commentaire commande
                            </label>
                            <textarea
                                rows={4}
                                value={deliveryNotes}
                                onChange={(event) =>
                                    setDeliveryNotes(event.target.value)
                                }
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                placeholder="Appeler avant la livraison, remarque sur la commande..."
                            />
                        </div>
                    </CheckoutStep>

                    <CheckoutStep number={4} title="Paiement">
                        <div className="rounded-3xl bg-neutral-50 p-5">
                            <div className="flex items-start gap-3">
                                <span className="mt-1 h-4 w-4 rounded-full border-4 border-black" />
                                <div>
                                    <p className="font-black">
                                        {fulfillmentMethod === "STORE_PICKUP"
                                            ? "Paiement au retrait magasin"
                                            : "Paiement comptant à la livraison"}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                                        {fulfillmentMethod === "STORE_PICKUP"
                                            ? `Vous payez lorsque vous récupérez votre commande au magasin ${pickupStoreLabel}.`
                                            : "Vous payez lors de la livraison de votre commande."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <label className="mt-6 flex items-start gap-3 text-sm font-semibold text-neutral-700">
                            <input
                                type="checkbox"
                                checked={hasAcceptedTerms}
                                onChange={(event) =>
                                    setHasAcceptedTerms(event.target.checked)
                                }
                                className="mt-1"
                            />
                            <span>
                                J’ai lu les conditions générales de vente et j’y
                                adhère sans réserve.
                            </span>
                        </label>

                        {error && (
                            <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || items.length === 0}
                            className="mt-6 rounded-full bg-black px-8 py-4 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                        >
                            {isSubmitting
                                ? "Commande en cours..."
                                : "Commander"}
                        </button>
                    </CheckoutStep>
                </form>

                <aside className="h-fit space-y-5 lg:sticky lg:top-32">
                    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-2xl font-black">Résumé</h2>
                            <span className="text-sm text-neutral-500">
                                {items.length} article
                                {items.length > 1 ? "s" : ""}
                            </span>
                        </div>

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
                                <span className="text-neutral-500">
                                    Sous-total
                                </span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-neutral-500">
                                    {fulfillmentMethod === "STORE_PICKUP"
                                        ? "Retrait magasin"
                                        : "Livraison"}
                                </span>
                                <span>{formatPrice(checkoutDeliveryFee)}</span>
                            </div>

                            <div className="flex justify-between pt-3 text-lg font-black">
                                <span>Total</span>
                                <span>{formatPrice(checkoutTotal)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                        <div className="space-y-4 text-sm">
                            <div className="rounded-2xl bg-neutral-50 p-4">
                                Livraison à domicile :{" "}
                                {formatPrice(DELIVERY_FEE)}
                            </div>

                            <div className="rounded-2xl bg-neutral-50 p-4">
                                Retrait gratuit en magasin.
                            </div>

                            <div className="rounded-2xl bg-neutral-50 p-4">
                                Échange ou retour possible sous 10 jours.
                            </div>
                        </div>
                    </div>
                </aside>
            </section>

            <PublicFooter />
        </main>
    );
}
