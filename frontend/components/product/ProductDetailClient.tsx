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
    X,
} from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useFavorites } from "@/components/favorites/FavoritesProvider";
import { ProductCard } from "@/components/ProductCard";
import type { Product, ProductImage, ProductVariant } from "@/types/product";

type ProductDetailClientProps = {
    product: Product;
    similarProducts: Product[];
};

type AccordionKey = "description" | "details" | "delivery";

const sizeOrder = [
    "UNIQUE",
    "ONE SIZE",
    "TU",

    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "2XL",
    "3XL",
    "XXXL",
    "4XL",

    "30",
    "32",
    "34",
    "36",
    "38",

    "40",
    "41",
    "42",
    "43",
    "44",
    "45",

    "46",
    "48",
    "50",
    "52",
    "54",
    "56",

    "80",
    "85",
    "90",
    "95",
    "100",
    "105",
    "110",
    "115",
    "120",

    "SLIM",
    "CLASSIQUE",
    "LARGE",
];

function formatPrice(value: number | string | null | undefined) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return "0.000 TND";
    }

    return `${numericValue.toFixed(3)} TND`;
}

function normalizeColor(value: string | null | undefined) {
    return (value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function normalizeHex(value: string | null | undefined) {
    return (value ?? "").trim().toUpperCase();
}

function normalizeSize(value: string | null | undefined) {
    return (value ?? "").trim().toUpperCase();
}

function compareSizes(sizeA: string, sizeB: string) {
    const normalizedSizeA = normalizeSize(sizeA);
    const normalizedSizeB = normalizeSize(sizeB);

    const indexA = sizeOrder.indexOf(normalizedSizeA);
    const indexB = sizeOrder.indexOf(normalizedSizeB);

    if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
    }

    if (indexA !== -1) {
        return -1;
    }

    if (indexB !== -1) {
        return 1;
    }

    const numericA = Number(normalizedSizeA);
    const numericB = Number(normalizedSizeB);

    if (Number.isFinite(numericA) && Number.isFinite(numericB)) {
        return numericA - numericB;
    }

    return normalizedSizeA.localeCompare(normalizedSizeB);
}

function isValidHex(value: string | null | undefined) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value ?? "");
}

function getMainImage(images: ProductImage[]) {
    return images.find((image) => image.isMain) ?? images[0] ?? null;
}

function getColorHexForColor(variants: ProductVariant[], color: string) {
    return (
        variants.find(
            (variant) =>
                variant.color === color &&
                variant.stockQuantity > 0 &&
                variant.colorHex,
        )?.colorHex ?? null
    );
}

function getImageForColor(
    images: ProductImage[],
    color: string,
    colorHex?: string | null,
) {
    const normalizedHex = normalizeHex(colorHex);

    if (normalizedHex) {
        const imageByHex = images.find(
            (image) => normalizeHex(image.colorHex) === normalizedHex,
        );

        if (imageByHex) {
            return imageByHex;
        }
    }

    const normalizedColor = normalizeColor(color);

    if (!normalizedColor) {
        return null;
    }

    return (
        images.find(
            (image) => normalizeColor(image.color) === normalizedColor,
        ) ?? null
    );
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
    ).sort(compareSizes);
}

function getStockForColor(variants: ProductVariant[], color: string) {
    return variants
        .filter((variant) => variant.color === color)
        .reduce((sum, variant) => sum + variant.stockQuantity, 0);
}

function getColorButtonStyle(colorHex: string | null | undefined) {
    if (!isValidHex(colorHex)) {
        return {
            background:
                "linear-gradient(135deg, #f5f5f5 0%, #d4d4d4 45%, #a3a3a3 100%)",
        };
    }

    return {
        backgroundColor: colorHex ?? undefined,
    };
}

function getMatchingColorFromImage(
    image: ProductImage,
    availableColors: string[],
    variants: ProductVariant[],
) {
    if (image.colorHex) {
        const matchingByHex = availableColors.find((color) => {
            const colorHex = getColorHexForColor(variants, color);

            return normalizeHex(colorHex) === normalizeHex(image.colorHex);
        });

        if (matchingByHex) {
            return matchingByHex;
        }
    }

    if (image.color) {
        const matchingByName = availableColors.find(
            (color) => normalizeColor(color) === normalizeColor(image.color),
        );

        if (matchingByName) {
            return matchingByName;
        }
    }

    return null;
}

export function ProductDetailClient({
    product,
    similarProducts,
}: ProductDetailClientProps) {
    const { addToCart, itemsCount, subtotal, deliveryFee, total } = useCart();
    const { isFavorite, toggleFavorite } = useFavorites();

    const productImages = useMemo(
        () => (product.images.length > 0 ? product.images : []),
        [product.images],
    );

    const firstImage = useMemo(
        () => getMainImage(productImages),
        [productImages],
    );

    const availableColors = useMemo(
        () => getAvailableColors(product.variants),
        [product.variants],
    );

    const [selectedColor, setSelectedColor] = useState(
        availableColors[0] ?? "",
    );

    const selectedColorHex = useMemo(
        () => getColorHexForColor(product.variants, selectedColor),
        [product.variants, selectedColor],
    );

    const [selectedImage, setSelectedImage] = useState<ProductImage | null>(
        null,
    );

    const colorImage = useMemo(
        () => getImageForColor(productImages, selectedColor, selectedColorHex),
        [productImages, selectedColor, selectedColorHex],
    );

    const displayedImage = selectedImage ?? colorImage ?? firstImage;

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
    const [isCartPopupOpen, setIsCartPopupOpen] = useState(false);
    const [lastAddedVariant, setLastAddedVariant] =
        useState<ProductVariant | null>(null);
    const [lastAddedQuantity, setLastAddedQuantity] = useState(1);
    const [openAccordion, setOpenAccordion] =
        useState<AccordionKey>("description");

    const isProductFavorite = isFavorite(product.id);
    const hasDiscount = product.discountPercentage > 0;

    const popupImage = displayedImage;
    const popupUnitPrice = Number(product.finalPrice);
    const popupLineTotal = popupUnitPrice * lastAddedQuantity;

    function handleColorChange(color: string) {
        const colorHex = getColorHexForColor(product.variants, color);

        setSelectedColor(color);
        setSelectedSize("");
        setQuantity(1);
        setMessage("");
        setSelectedImage(getImageForColor(productImages, color, colorHex));
    }

    function handleThumbnailClick(image: ProductImage) {
        setSelectedImage(image);

        const matchingColor = getMatchingColorFromImage(
            image,
            availableColors,
            product.variants,
        );

        if (matchingColor) {
            setSelectedColor(matchingColor);
            setSelectedSize("");
            setQuantity(1);
            setMessage("");
        }
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
        setLastAddedVariant(selectedVariant);
        setLastAddedQuantity(quantity);
        setMessage("");
        setIsCartPopupOpen(true);
    }

    function toggleAccordion(key: AccordionKey) {
        setOpenAccordion((currentKey) =>
            currentKey === key ? "description" : key,
        );
    }

    return (
        <>
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
                                {displayedImage ? (
                                    <img
                                        src={displayedImage.url}
                                        alt={
                                            displayedImage.altText ??
                                            product.name
                                        }
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
                                            displayedImage?.id === image.id;

                                        return (
                                            <button
                                                key={image.id}
                                                type="button"
                                                onClick={() =>
                                                    handleThumbnailClick(image)
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

                                                {image.color && (
                                                    <span className="block truncate bg-white px-2 py-2 text-xs font-bold text-neutral-700">
                                                        {image.color}
                                                    </span>
                                                )}
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

                                    {hasDiscount && (
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

                                {product.categoryType && (
                                    <p className="mt-1 text-sm text-neutral-500">
                                        Type : {product.categoryType.name}
                                    </p>
                                )}

                                {product.collection && (
                                    <p className="mt-1 text-sm text-neutral-500">
                                        Collection : {product.collection.name}
                                    </p>
                                )}

                                <div className="mt-6">
                                    {hasDiscount ? (
                                        <div>
                                            <p className="text-sm font-medium text-neutral-400 line-through">
                                                {formatPrice(product.price)}
                                            </p>

                                            <p className="mt-1 text-3xl font-black text-black">
                                                {formatPrice(
                                                    product.finalPrice,
                                                )}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-3xl font-black text-black">
                                            {formatPrice(product.price)}
                                        </p>
                                    )}
                                </div>

                                {hasDiscount && (
                                    <div className="mt-8 bg-black px-5 py-4 text-sm font-bold text-white">
                                        Offre spéciale disponible sur ce
                                        produit.
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
                                                const colorStock =
                                                    getStockForColor(
                                                        product.variants,
                                                        color,
                                                    );
                                                const colorHex =
                                                    getColorHexForColor(
                                                        product.variants,
                                                        color,
                                                    );

                                                return (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        onClick={() =>
                                                            handleColorChange(
                                                                color,
                                                            )
                                                        }
                                                        className={
                                                            isSelected
                                                                ? "flex items-center gap-2 border border-black bg-black px-4 py-3 text-sm font-black text-white"
                                                                : "flex items-center gap-2 border border-neutral-300 bg-white px-4 py-3 text-sm font-bold text-black transition hover:border-black"
                                                        }
                                                    >
                                                        <span
                                                            style={getColorButtonStyle(
                                                                colorHex,
                                                            )}
                                                            className={
                                                                isSelected
                                                                    ? "h-4 w-4 rounded border border-white/60"
                                                                    : "h-4 w-4 rounded border border-black/20"
                                                            }
                                                        />

                                                        <span>{color}</span>

                                                        <span
                                                            className={
                                                                isSelected
                                                                    ? "text-xs text-neutral-300"
                                                                    : "text-xs text-neutral-500"
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
                                                    openAccordion ===
                                                    "description"
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
                                                <p>
                                                    Référence :{" "}
                                                    {product.reference}
                                                </p>

                                                <p>
                                                    Catégorie :{" "}
                                                    {product.category.name}
                                                </p>

                                                {product.categoryType && (
                                                    <p>
                                                        Type :{" "}
                                                        {
                                                            product.categoryType
                                                                .name
                                                        }
                                                    </p>
                                                )}

                                                <p>
                                                    Stock total :{" "}
                                                    {product.totalStock}
                                                </p>

                                                {product.collection && (
                                                    <p>
                                                        Collection :{" "}
                                                        {
                                                            product.collection
                                                                .name
                                                        }
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
                                                    Livraison à domicile en
                                                    Tunisie.
                                                </p>

                                                <p>
                                                    Paiement à la livraison
                                                    disponible. Les détails de
                                                    livraison seront confirmés
                                                    après la validation de la
                                                    commande.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>

                    {similarProducts.length > 0 && (
                        <section className="mt-20 border-t border-neutral-200 pt-14">
                            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                                <div>
                                    <p className="text-sm uppercase tracking-[0.35em] text-neutral-500">
                                        Sélection
                                    </p>

                                    <h2 className="mt-3 text-4xl font-black uppercase tracking-tight md:text-5xl">
                                        Dans le même style{" "}
                                        <span className="text-neutral-400">
                                            ×
                                        </span>
                                    </h2>

                                    <p className="mt-4 max-w-2xl text-neutral-600">
                                        Découvrez d’autres articles dans la
                                        catégorie {product.category.name}.
                                    </p>
                                </div>

                                <Link
                                    href={`/boutique?category=${encodeURIComponent(
                                        product.category.slug,
                                    )}`}
                                    className="text-sm font-black uppercase tracking-[0.2em] text-neutral-500 transition hover:text-black"
                                >
                                    Voir toute la catégorie
                                </Link>
                            </div>

                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                {similarProducts.map((similarProduct) => (
                                    <ProductCard
                                        key={similarProduct.id}
                                        product={similarProduct}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </section>

            {isCartPopupOpen && lastAddedVariant && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm">
                    <div className="relative w-full max-w-5xl bg-white p-6 shadow-2xl md:p-8">
                        <button
                            type="button"
                            onClick={() => setIsCartPopupOpen(false)}
                            className="absolute right-6 top-6 text-neutral-400 transition hover:text-black"
                            aria-label="Fermer"
                        >
                            <X size={26} />
                        </button>

                        <h2 className="border-b border-neutral-200 pb-5 pr-10 text-xl font-medium text-neutral-950">
                            Produit ajouté avec succès à votre panier d'achat
                        </h2>

                        <div className="grid gap-8 py-6 md:grid-cols-[1.25fr_0.9fr]">
                            <div className="grid gap-6 sm:grid-cols-[210px_1fr]">
                                <div className="bg-neutral-50">
                                    {popupImage ? (
                                        <img
                                            src={popupImage.url}
                                            alt={
                                                popupImage.altText ??
                                                product.name
                                            }
                                            className="h-64 w-full object-contain"
                                        />
                                    ) : (
                                        <div className="flex h-64 items-center justify-center text-neutral-400">
                                            Image produit
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-2xl font-medium">
                                        {product.name}
                                    </h3>

                                    <p className="mt-5 text-sm font-black">
                                        {formatPrice(popupLineTotal)}
                                    </p>

                                    <div className="mt-5 space-y-1 text-sm text-neutral-700">
                                        <p>
                                            Couleur :{" "}
                                            <span className="font-semibold text-black">
                                                {lastAddedVariant.color}
                                            </span>
                                        </p>

                                        <p>
                                            Taille :{" "}
                                            <span className="font-semibold text-black">
                                                {lastAddedVariant.size}
                                            </span>
                                        </p>

                                        <p>
                                            Quantité :{" "}
                                            <span className="font-semibold text-black">
                                                {lastAddedQuantity}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-neutral-200 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                                <p className="font-black">
                                    Il y a {itemsCount} article
                                    {itemsCount > 1 ? "s" : ""} dans votre
                                    panier.
                                </p>

                                <div className="mt-6 space-y-2 text-sm">
                                    <div className="flex items-center justify-between gap-4 border-b border-dotted border-neutral-300 pb-1">
                                        <span className="text-neutral-600">
                                            Sous-total
                                        </span>

                                        <span className="font-black">
                                            {formatPrice(subtotal)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 border-b border-dotted border-neutral-300 pb-1">
                                        <span className="text-neutral-600">
                                            Expédition
                                        </span>

                                        <span className="font-black">
                                            {formatPrice(deliveryFee)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-neutral-600">
                                            Total TTC
                                        </span>

                                        <span className="font-black">
                                            {formatPrice(total)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-7 flex flex-col gap-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsCartPopupOpen(false)
                                        }
                                        className="w-full bg-neutral-950 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-neutral-800 md:w-fit"
                                    >
                                        Continuer votre shopping
                                    </button>

                                    <Link
                                        href="/checkout"
                                        className="w-full bg-black px-6 py-3 text-center text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-neutral-800 md:w-fit"
                                    >
                                        Commander
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
