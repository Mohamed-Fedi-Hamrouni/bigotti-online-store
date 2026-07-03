"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    Check,
    ChevronDown,
    Heart,
    Minus,
    Plus,
    ShoppingBag,
    Truck,
} from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useFavorites } from "@/components/favorites/FavoritesProvider";
import type { Product, ProductImage, ProductVariant } from "@/types/product";

type ProductDetailClientProps = {
    product: Product;
};

type AccordionKey = "description" | "details" | "delivery";

function formatPrice(value: number | string | null | undefined) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return "0.000 TND";
    }

    return `${numericValue.toFixed(3)} TND`;
}

function getMainImage(images: ProductImage[]) {
    return images.find((image) => image.isMain) ?? images[0] ?? null;
}

function getAvailableColors(variants: ProductVariant[]) {
    return Array.from(
        new Set(
            variants
                .filter((variant) => variant.stockQuantity > 0)
                .map((variant) => variant.color),
        ),
    ).sort();
}

function getAvailableSizes(variants: ProductVariant[], selectedColor: string) {
    return Array.from(
        new Set(
            variants
                .filter(
                    (variant) =>
                        variant.color === selectedColor &&
                        variant.stockQuantity > 0,
                )
                .map((variant) => variant.size),
        ),
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function getStockForColor(variants: ProductVariant[], color: string) {
    return variants
        .filter((variant) => variant.color === color)
        .reduce((sum, variant) => sum + variant.stockQuantity, 0);
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
    const { addToCart } = useCart();
    const { isFavorite, toggleFavorite } = useFavorites();

    const productImages = product.images.length > 0 ? product.images : [];
    const firstImage = getMainImage(productImages);

    const [selectedImage, setSelectedImage] = useState<ProductImage | null>(
        firstImage,
    );

    const availableColors = useMemo(
        () => getAvailableColors(product.variants),
        [product.variants],
    );

    const [selectedColor, setSelectedColor] = useState(
        availableColors[0] ?? "",
    );

    const availableSizes = useMemo(
        () => getAvailableSizes(product.variants, selectedColor),
        [product.variants, selectedColor],
    );

    const [selectedSize, setSelectedSize] = useState("");

    const selectedVariant = useMemo(() => {
        return (
            product.variants.find(
                (variant) =>
                    variant.color === selectedColor &&
                    variant.size === selectedSize &&
                    variant.stockQuantity > 0,
            ) ?? null
        );
    }, [product.variants, selectedColor, selectedSize]);

    const [quantity, setQuantity] = useState(1);
    const [message, setMessage] = useState("");
    const [openAccordion, setOpenAccordion] =
        useState<AccordionKey>("description");

    const isProductFavorite = isFavorite(product.id);

    function handleColorChange(color: string) {
        setSelectedColor(color);
        setSelectedSize("");
        setQuantity(1);
        setMessage("");
    }

    function handleSizeChange(size: string) {
        setSelectedSize(size);
        setQuantity(1);
        setMessage("");
    }

    function incrementQuantity() {
        if (!selectedVariant) {
            return;
        }

        setQuantity((currentQuantity) =>
            Math.min(currentQuantity + 1, selectedVariant.stockQuantity),
        );
    }

    function decrementQuantity() {
        setQuantity((currentQuantity) => Math.max(1, currentQuantity - 1));
    }

    function handleAddToCart() {
        if (!selectedVariant) {
            setMessage("Sélectionnez une couleur et une taille disponibles.");
            return;
        }

        addToCart(product, selectedVariant, quantity);
        setMessage("Produit ajouté au panier.");
    }

    function toggleAccordion(key: AccordionKey) {
        setOpenAccordion((currentKey) => (currentKey === key ? "description" : key));
    }

    return (
        <section className="bg-white">
            <div className="mx-auto max-w-7xl px-6 py-8">
                <div className="mb-8 text-xs font-medium text-neutral-500">
                    <Link href="/" className="hover:text-black">
                        Accueil
                    </Link>
                    <span className="mx-2">/</span>
                    <Link href="/boutique" className="hover:text-black">
                        Boutique
                    </Link>
                    <span className="mx-2">/</span>
                    <Link
                        href={`/boutique?category=${encodeURIComponent(
                            product.category.slug,
                        )}`}
                        className="hover:text-black"
                    >
                        {product.category.name}
                    </Link>
                    <span className="mx-2">/</span>
                    <span className="text-black">{product.name}</span>
                </div>

                <div className="grid gap-12 lg:grid-cols-[1.55fr_0.85fr]">
                    <div className="space-y-5">
                        <div className="overflow-hidden bg-neutral-50">
                            {selectedImage ? (
                                <img
                                    src={selectedImage.url}
                                    alt={selectedImage.altText ?? product.name}
                                    className="h-[680px] w-full object-contain"
                                />
                            ) : (
                                <div className="flex h-[680px] items-center justify-center bg-neutral-100 text-neutral-400">
                                    Image produit
                                </div>
                            )}
                        </div>

                        {productImages.length > 1 && (
                            <div className="grid grid-cols-4 gap-4">
                                {productImages.map((image) => {
                                    const isSelected =
                                        selectedImage?.id === image.id;

                                    return (
                                        <button
                                            key={image.id}
                                            type="button"
                                            onClick={() =>
                                                setSelectedImage(image)
                                            }
                                            className={
                                                isSelected
                                                    ? "overflow-hidden border-2 border-black bg-neutral-50"
                                                    : "overflow-hidden border border-neutral-200 bg-neutral-50 transition hover:border-black"
                                            }
                                        >
                                            <img
                                                src={image.url}
                                                alt={
                                                    image.altText ??
                                                    product.name
                                                }
                                                className="aspect-square w-full object-cover"
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <aside className="lg:sticky lg:top-36 lg:h-fit">
                        <div className="border-l border-neutral-200 pl-0 lg:pl-10">
                            <div className="flex flex-wrap items-center gap-3">
                                {product.isNewArrival && (
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-black">
                                        Nouveau
                                    </span>
                                )}

                                {product.isOnSale &&
                                    product.discountPercentage > 0 && (
                                        <span className="rounded-full bg-black px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white">
                                            -{product.discountPercentage}%
                                        </span>
                                    )}

                                {product.totalStock <= 0 && (
                                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-neutral-600">
                                        Rupture
                                    </span>
                                )}
                            </div>

                            <h1 className="mt-4 text-3xl font-black uppercase tracking-tight md:text-4xl">
                                {product.name}
                            </h1>

                            <p className="mt-2 text-sm text-neutral-500">
                                Référence : {product.reference}
                            </p>

                            <p className="mt-1 text-sm text-neutral-500">
                                Catégorie : {product.category.name}
                            </p>

                            {product.collection && (
                                <p className="mt-1 text-sm text-neutral-500">
                                    Collection : {product.collection.name}
                                </p>
                            )}

                            <div className="mt-6">
                                {product.isOnSale &&
                                product.discountPercentage > 0 ? (
                                    <div>
                                        <p className="text-sm font-medium text-neutral-400 line-through">
                                            {formatPrice(product.price)}
                                        </p>

                                        <p className="mt-1 text-3xl font-black text-black">
                                            {formatPrice(product.finalPrice)}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-3xl font-black text-black">
                                        {formatPrice(product.price)}
                                    </p>
                                )}
                            </div>

                            {product.isOnSale && (
                                <div className="mt-8 bg-black px-5 py-4 text-sm font-bold text-white">
                                    Offre spéciale disponible sur ce produit.
                                </div>
                            )}

                            <div className="mt-8">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-black uppercase tracking-[0.18em]">
                                        Taille
                                    </p>

                                    {selectedSize && (
                                        <p className="text-xs font-semibold text-neutral-500">
                                            Taille sélectionnée :{" "}
                                            <span className="text-black">
                                                {selectedSize}
                                            </span>
                                        </p>
                                    )}
                                </div>

                                {availableSizes.length > 0 ? (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {availableSizes.map((size) => (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() =>
                                                    handleSizeChange(size)
                                                }
                                                className={
                                                    selectedSize === size
                                                        ? "flex h-11 min-w-11 items-center justify-center border border-black bg-black px-4 text-sm font-black text-white"
                                                        : "flex h-11 min-w-11 items-center justify-center border border-neutral-300 bg-white px-4 text-sm font-bold text-black transition hover:border-black"
                                                }
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-3 text-sm text-neutral-500">
                                        Aucune taille disponible pour cette
                                        couleur.
                                    </p>
                                )}
                            </div>

                            <div className="mt-8">
                                <p className="text-sm font-black uppercase tracking-[0.18em]">
                                    Couleur
                                </p>

                                {availableColors.length > 0 ? (
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        {availableColors.map((color) => {
                                            const isSelected =
                                                selectedColor === color;
                                            const colorStock = getStockForColor(
                                                product.variants,
                                                color,
                                            );

                                            return (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() =>
                                                        handleColorChange(color)
                                                    }
                                                    className={
                                                        isSelected
                                                            ? "border border-black bg-black px-4 py-3 text-sm font-black text-white"
                                                            : "border border-neutral-300 bg-white px-4 py-3 text-sm font-bold text-black transition hover:border-black"
                                                    }
                                                >
                                                    {color}
                                                    <span
                                                        className={
                                                            isSelected
                                                                ? "ml-2 text-xs text-neutral-300"
                                                                : "ml-2 text-xs text-neutral-500"
                                                        }
                                                    >
                                                        ({colorStock})
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="mt-3 text-sm text-neutral-500">
                                        Aucune couleur disponible.
                                    </p>
                                )}
                            </div>

                            <div className="mt-8">
                                <p className="text-sm font-black uppercase tracking-[0.18em]">
                                    Quantité
                                </p>

                                <div className="mt-4 inline-flex items-center border border-neutral-300">
                                    <button
                                        type="button"
                                        onClick={decrementQuantity}
                                        className="flex h-11 w-11 items-center justify-center transition hover:bg-neutral-100"
                                    >
                                        <Minus size={16} />
                                    </button>

                                    <div className="flex h-11 w-14 items-center justify-center border-x border-neutral-300 text-sm font-black">
                                        {quantity}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={incrementQuantity}
                                        disabled={!selectedVariant}
                                        className="flex h-11 w-11 items-center justify-center transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-300"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                {selectedVariant && (
                                    <p className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
                                        <Check size={16} />
                                        {selectedVariant.stockQuantity <= 3
                                            ? "Derniers articles en stock"
                                            : `${selectedVariant.stockQuantity} articles disponibles`}
                                    </p>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={!selectedVariant}
                                className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-black px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                            >
                                <ShoppingBag size={18} />
                                Ajouter au panier
                            </button>

                            <button
                                type="button"
                                onClick={() => toggleFavorite(product)}
                                className="mt-4 flex w-full items-center justify-center gap-3 rounded-full border border-neutral-300 px-6 py-4 text-sm font-bold transition hover:border-black"
                            >
                                <Heart
                                    size={18}
                                    className={
                                        isProductFavorite
                                            ? "fill-black text-black"
                                            : ""
                                    }
                                />
                                {isProductFavorite
                                    ? "Retirer des favoris"
                                    : "Ajouter à mes favoris"}
                            </button>

                            {message && (
                                <p className="mt-4 rounded-2xl bg-neutral-50 p-4 text-sm font-semibold text-neutral-700">
                                    {message}
                                </p>
                            )}

                            <div className="mt-8 space-y-0 border-t border-neutral-200">
                                <div className="border-b border-neutral-200">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            toggleAccordion("description")
                                        }
                                        className="flex w-full items-center justify-between py-5 text-left text-sm font-bold"
                                    >
                                        Description
                                        <ChevronDown
                                            size={18}
                                            className={
                                                openAccordion === "description"
                                                    ? "rotate-180 transition"
                                                    : "transition"
                                            }
                                        />
                                    </button>

                                    {openAccordion === "description" && (
                                        <div className="pb-5 text-sm leading-7 text-neutral-700">
                                            {product.description ||
                                                product.shortDescription ||
                                                "Description non disponible pour le moment."}
                                        </div>
                                    )}
                                </div>

                                <div className="border-b border-neutral-200">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            toggleAccordion("details")
                                        }
                                        className="flex w-full items-center justify-between py-5 text-left text-sm font-bold"
                                    >
                                        Détails du produit
                                        <ChevronDown
                                            size={18}
                                            className={
                                                openAccordion === "details"
                                                    ? "rotate-180 transition"
                                                    : "transition"
                                            }
                                        />
                                    </button>

                                    {openAccordion === "details" && (
                                        <div className="pb-5 text-sm leading-7 text-neutral-700">
                                            <p>Référence : {product.reference}</p>
                                            <p>Catégorie : {product.category.name}</p>
                                            <p>Stock total : {product.totalStock}</p>
                                            {product.collection && (
                                                <p>
                                                    Collection :{" "}
                                                    {product.collection.name}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="border-b border-neutral-200">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            toggleAccordion("delivery")
                                        }
                                        className="flex w-full items-center justify-between py-5 text-left text-sm font-bold"
                                    >
                                        Livraison & retour
                                        <ChevronDown
                                            size={18}
                                            className={
                                                openAccordion === "delivery"
                                                    ? "rotate-180 transition"
                                                    : "transition"
                                            }
                                        />
                                    </button>

                                    {openAccordion === "delivery" && (
                                        <div className="space-y-3 pb-5 text-sm leading-7 text-neutral-700">
                                            <p className="flex gap-2">
                                                <Truck
                                                    size={18}
                                                    className="mt-1 shrink-0"
                                                />
                                                Livraison à domicile en Tunisie.
                                            </p>
                                            <p>
                                                Paiement à la livraison
                                                disponible. Les détails de
                                                livraison seront confirmés après
                                                la validation de la commande.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </section>
    );
}
