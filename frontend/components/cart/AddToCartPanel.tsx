"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import type { Product } from "@/types/product";

type AddToCartPanelProps = {
    product: Product;
};

export function AddToCartPanel({ product }: AddToCartPanelProps) {
    const availableVariants = product.variants.filter(
        (variant) => variant.isActive && variant.stockQuantity > 0,
    );

    const [selectedVariantId, setSelectedVariantId] = useState(
        availableVariants[0]?.id ?? "",
    );
    const [quantity, setQuantity] = useState(1);
    const [isAdded, setIsAdded] = useState(false);

    const { addToCart, itemsCount } = useCart();

    const selectedVariant = useMemo(
        () =>
            availableVariants.find(
                (variant) => variant.id === selectedVariantId,
            ),
        [availableVariants, selectedVariantId],
    );

    function handleAddToCart() {
        if (!selectedVariant) {
            return;
        }

        addToCart(product, selectedVariant, quantity);
        setIsAdded(true);
    }

    return (
        <div className="mt-8">
            <h2 className="text-lg font-bold">Choisir votre taille</h2>

            {availableVariants.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                    Produit actuellement indisponible.
                </div>
            ) : (
                <>
                    <div className="mt-4 grid gap-3">
                        {availableVariants.map((variant) => (
                            <label
                                key={variant.id}
                                className={
                                    selectedVariantId === variant.id
                                        ? "cursor-pointer rounded-2xl border border-black bg-black p-4 text-white"
                                        : "cursor-pointer rounded-2xl border border-neutral-200 p-4 transition hover:border-black"
                                }
                            >
                                <input
                                    type="radio"
                                    name="variant"
                                    value={variant.id}
                                    checked={selectedVariantId === variant.id}
                                    onChange={() => {
                                        setSelectedVariantId(variant.id);
                                        setQuantity(1);
                                        setIsAdded(false);
                                    }}
                                    className="sr-only"
                                />

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">
                                            {variant.color} / Taille{" "}
                                            {variant.size}
                                        </p>
                                        <p
                                            className={
                                                selectedVariantId === variant.id
                                                    ? "text-sm text-neutral-300"
                                                    : "text-sm text-neutral-500"
                                            }
                                        >
                                            Stock {variant.stockQuantity}
                                        </p>
                                    </div>

                                    <span className="text-sm font-medium">
                                        {variant.sku}
                                    </span>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="mt-6 flex items-center gap-4">
                        <label className="text-sm font-medium">Quantité</label>

                        <select
                            value={quantity}
                            onChange={(event) =>
                                setQuantity(Number(event.target.value))
                            }
                            className="rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm"
                        >
                            {Array.from({
                                length: selectedVariant?.stockQuantity ?? 1,
                            }).map((_, index) => (
                                <option key={index + 1} value={index + 1}>
                                    {index + 1}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={handleAddToCart}
                        className="mt-8 w-full rounded-full bg-black px-6 py-4 text-sm font-bold text-white transition hover:bg-neutral-800"
                    >
                        Ajouter au panier
                    </button>

                    {isAdded && (
                        <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-700">
                            Produit ajouté au panier.{" "}
                            <Link
                                href="/panier"
                                className="font-bold underline"
                            >
                                Voir le panier ({itemsCount})
                            </Link>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
