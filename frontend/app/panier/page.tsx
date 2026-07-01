"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";

function formatPrice(value: number) {
    return `${value.toFixed(3)} TND`;
}

export default function CartPage() {
    const {
        items,
        subtotal,
        deliveryFee,
        total,
        updateQuantity,
        removeFromCart,
    } = useCart();

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <PublicHeader />

            <section className="mx-auto max-w-7xl px-6 py-12">
                <div className="mb-8">
                    <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                        Votre sélection
                    </p>
                    <h1 className="mt-2 text-4xl font-bold">Panier</h1>
                </div>

                {items.length === 0 ? (
                    <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
                        <h2 className="text-2xl font-bold">
                            Votre panier est vide.
                        </h2>
                        <p className="mt-3 text-neutral-500">
                            Découvrez la collection Bigotti et ajoutez vos
                            articles préférés.
                        </p>

                        <Link
                            href="/#boutique"
                            className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-bold text-white"
                        >
                            Retour boutique
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
                        <div className="space-y-4">
                            {items.map((item) => (
                                <div
                                    key={item.variantId}
                                    className="grid gap-4 rounded-3xl bg-white p-5 shadow-sm md:grid-cols-[120px_1fr_auto]"
                                >
                                    <div className="overflow-hidden rounded-2xl bg-neutral-100">
                                        {item.imageUrl ? (
                                            <img
                                                src={item.imageUrl}
                                                alt={item.productName}
                                                className="h-32 w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-32 items-center justify-center text-neutral-400">
                                                Image
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <Link
                                            href={`/produit/${item.productSlug}`}
                                            className="text-xl font-bold hover:underline"
                                        >
                                            {item.productName}
                                        </Link>

                                        <p className="mt-1 text-sm text-neutral-500">
                                            Réf. {item.productReference}
                                        </p>

                                        <p className="mt-3 text-neutral-700">
                                            {item.color} / Taille {item.size}
                                        </p>

                                        <p className="mt-1 text-sm text-neutral-500">
                                            Stock disponible :{" "}
                                            {item.stockQuantity}
                                        </p>
                                    </div>

                                    <div className="flex flex-col items-start gap-4 md:items-end">
                                        <p className="text-lg font-bold">
                                            {formatPrice(item.unitPrice)}
                                        </p>

                                        <select
                                            value={item.quantity}
                                            onChange={(event) =>
                                                updateQuantity(
                                                    item.variantId,
                                                    Number(event.target.value),
                                                )
                                            }
                                            className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm"
                                        >
                                            {Array.from({
                                                length: item.stockQuantity,
                                            }).map((_, index) => (
                                                <option
                                                    key={index + 1}
                                                    value={index + 1}
                                                >
                                                    {index + 1}
                                                </option>
                                            ))}
                                        </select>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeFromCart(item.variantId)
                                            }
                                            className="text-sm font-medium text-red-600 hover:underline"
                                        >
                                            Supprimer
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm">
                            <h2 className="text-2xl font-bold">
                                Résumé commande
                            </h2>

                            <div className="mt-6 space-y-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">
                                        Sous-total
                                    </span>
                                    <span className="font-semibold">
                                        {formatPrice(subtotal)}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-neutral-500">
                                        Livraison
                                    </span>
                                    <span className="font-semibold">
                                        {formatPrice(deliveryFee)}
                                    </span>
                                </div>

                                <div className="border-t border-neutral-200 pt-4">
                                    <div className="flex justify-between text-lg">
                                        <span className="font-bold">Total</span>
                                        <span className="font-bold">
                                            {formatPrice(total)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Link
                                href="/checkout"
                                className="mt-6 flex w-full justify-center rounded-full bg-black px-6 py-4 text-sm font-bold text-white transition hover:bg-neutral-800"
                            >
                                Passer commande
                            </Link>

                            <p className="mt-4 text-center text-xs text-neutral-500">
                                Paiement à la livraison ou paiement carte
                                simulé.
                            </p>
                        </aside>
                    </div>
                )}
            </section>

            <PublicFooter />
        </main>
    );
}
