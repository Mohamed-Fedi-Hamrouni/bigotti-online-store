import Link from "next/link";
import type { CSSProperties } from "react";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import type { Product, ProductImage, ProductVariant } from "@/types/product";

type ProductCardProps = {
    product: Product;
};

type ProductColorOption = {
    name: string;
    hex: string | null;
};

function formatPrice(value: number) {
    return `${value.toFixed(3)} TND`;
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

function isValidHex(value: string | null | undefined) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value ?? "");
}

function getMainImage(images: ProductImage[]) {
    return images.find((image) => image.isMain) ?? images[0] ?? null;
}

function getImageForColor(images: ProductImage[], color: ProductColorOption) {
    if (color.hex) {
        const imageByHex = images.find(
            (image) => normalizeHex(image.colorHex) === normalizeHex(color.hex),
        );

        if (imageByHex) {
            return imageByHex;
        }
    }

    return (
        images.find(
            (image) =>
                normalizeColor(image.color) === normalizeColor(color.name),
        ) ?? null
    );
}

function getAvailableColors(variants: ProductVariant[]) {
    const colors = new Map<string, ProductColorOption>();

    variants
        .filter((variant) => variant.stockQuantity > 0)
        .forEach((variant) => {
            const name = variant.color.trim();

            if (!name) {
                return;
            }

            const hex = isValidHex(variant.colorHex)
                ? normalizeHex(variant.colorHex)
                : null;

            const key = `${normalizeColor(name)}-${hex ?? ""}`;

            if (!colors.has(key)) {
                colors.set(key, {
                    name,
                    hex,
                });
            }
        });

    return Array.from(colors.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
    );
}

function getFallbackImageColors(images: ProductImage[]) {
    const colors = new Map<string, ProductColorOption>();

    images.forEach((image) => {
        const imageColor = image.color?.trim() ?? "";
        const imageHex = isValidHex(image.colorHex)
            ? normalizeHex(image.colorHex)
            : null;

        if (!imageColor && !imageHex) {
            return;
        }

        const key = `${normalizeColor(imageColor)}-${imageHex ?? ""}`;

        if (!colors.has(key)) {
            colors.set(key, {
                name: imageColor || imageHex || "Couleur",
                hex: imageHex,
            });
        }
    });

    return Array.from(colors.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
    );
}

function getHoverImage(params: {
    images: ProductImage[];
    mainImage: ProductImage | null;
    colors: ProductColorOption[];
}) {
    const { images, mainImage, colors } = params;

    for (const color of colors) {
        const colorImage = getImageForColor(images, color);

        if (colorImage && colorImage.id !== mainImage?.id) {
            return colorImage;
        }
    }

    return images.find((image) => image.id !== mainImage?.id) ?? null;
}

function getSwatchStyle(color: ProductColorOption): CSSProperties {
    if (isValidHex(color.hex)) {
        return {
            backgroundColor: color.hex ?? undefined,
        };
    }

    return {
        background:
            "linear-gradient(135deg, #f5f5f5 0%, #d4d4d4 45%, #a3a3a3 100%)",
    };
}

export function ProductCard({ product }: ProductCardProps) {
    const productImages = [...product.images].sort(
        (firstImage, secondImage) => firstImage.position - secondImage.position,
    );

    const mainImage = getMainImage(productImages);

    const availableColors = getAvailableColors(product.variants);
    const fallbackImageColors = getFallbackImageColors(productImages);

    const displayedColors =
        availableColors.length > 0 ? availableColors : fallbackImageColors;

    const hoverImage = getHoverImage({
        images: productImages,
        mainImage,
        colors: displayedColors,
    });

    const hasDiscount = product.discountPercentage > 0;
    const hasHoverAnimation = Boolean(mainImage && hoverImage);

    return (
        <article className="group overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
                <Link
                    href={`/produit/${product.slug}`}
                    className="block h-full w-full"
                >
                    {mainImage ? (
                        <>
                            <img
                                src={mainImage.url}
                                alt={mainImage.altText ?? product.name}
                                className={
                                    hasHoverAnimation
                                        ? "absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105 group-hover:opacity-0"
                                        : "absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
                                }
                            />

                            {hoverImage && (
                                <img
                                    src={hoverImage.url}
                                    alt={hoverImage.altText ?? product.name}
                                    className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition duration-700 ease-out group-hover:scale-100 group-hover:opacity-100"
                                />
                            )}

                            {hasHoverAnimation && (
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/35 to-transparent px-4 pb-4 pt-16 transition duration-500 group-hover:translate-y-0">
                                    <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-black shadow-sm">
                                        Voir les couleurs
                                    </span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-400">
                            Image produit
                        </div>
                    )}
                </Link>

                <div className="absolute right-4 top-4">
                    <FavoriteButton product={product} />
                </div>

                {hasDiscount && (
                    <span className="absolute left-4 top-4 rounded-full bg-black px-3 py-1 text-sm font-semibold text-white">
                        -{product.discountPercentage}%
                    </span>
                )}

                {product.isNewArrival && (
                    <span className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1 text-sm font-semibold text-black">
                        Nouveau
                    </span>
                )}
            </div>

            <div className="space-y-3 p-5">
                <Link href={`/produit/${product.slug}`}>
                    <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                        {product.category.name}
                    </p>

                    <h3 className="mt-1 text-lg font-semibold text-neutral-950">
                        {product.name}
                    </h3>

                    <p className="mt-1 text-sm text-neutral-500">
                        Réf. {product.reference}
                    </p>
                </Link>

                {displayedColors.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        {displayedColors.slice(0, 8).map((color) => (
                            <span
                                key={`${color.name}-${color.hex ?? "nohex"}`}
                                title={color.name}
                                className="flex h-5 min-w-5 items-center justify-center rounded-md border border-neutral-300 bg-white p-[2px]"
                            >
                                <span
                                    style={getSwatchStyle(color)}
                                    className="h-full min-w-4 rounded-[4px] border border-black/10"
                                />
                            </span>
                        ))}

                        {displayedColors.length > 8 && (
                            <span className="text-xs font-bold text-neutral-500">
                                +{displayedColors.length - 8}
                            </span>
                        )}
                    </div>
                )}

                <div className="flex items-end justify-between gap-3">
                    <div>
                        {hasDiscount ? (
                            <div className="space-y-1">
                                <p className="text-sm text-neutral-400 line-through">
                                    {formatPrice(product.price)}
                                </p>

                                <p className="text-xl font-bold text-neutral-950">
                                    {formatPrice(product.finalPrice)}
                                </p>
                            </div>
                        ) : (
                            <p className="text-xl font-bold text-neutral-950">
                                {formatPrice(product.price)}
                            </p>
                        )}
                    </div>

                    <p className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700">
                        Stock {product.totalStock}
                    </p>
                </div>
            </div>
        </article>
    );
}
