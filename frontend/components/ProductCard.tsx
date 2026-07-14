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

const COLOR_NAME_FALLBACKS: Record<string, string> = {
    noir: "#111111",
    black: "#111111",

    blanc: "#ffffff",
    white: "#ffffff",

    bleu: "#1d4ed8",
    blue: "#1d4ed8",
    marine: "#0f172a",
    navy: "#0f172a",
    "bleu marine": "#0f172a",

    beige: "#d6c2a6",
    camel: "#c19a6b",

    marron: "#7c4a28",
    brown: "#7c4a28",

    gris: "#737373",
    gray: "#737373",
    grey: "#737373",

    rouge: "#dc2626",
    red: "#dc2626",

    vert: "#15803d",
    green: "#15803d",

    kaki: "#6b705c",
    khaki: "#6b705c",

    rose: "#f9a8d4",
    pink: "#f9a8d4",

    orange: "#f97316",

    jaune: "#facc15",
    yellow: "#facc15",

    violet: "#7c3aed",
    purple: "#7c3aed",

    bordeaux: "#7f1d1d",
};

function formatPrice(value: number) {
    return `${value.toFixed(3)} TND`;
}

function formatCompactMoney(value: number) {
    if (Number.isInteger(value)) {
        return `${value} TND`;
    }

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

function isDateRangeActive(startDate?: string | null, endDate?: string | null) {
    const now = new Date();

    if (startDate && new Date(startDate) > now) {
        return false;
    }

    if (endDate && new Date(endDate) < now) {
        return false;
    }

    return true;
}

function getFallbackHexFromName(colorName: string | null | undefined) {
    const normalizedName = normalizeColor(colorName);

    return COLOR_NAME_FALLBACKS[normalizedName] ?? null;
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

            const variantHex = isValidHex(variant.colorHex)
                ? normalizeHex(variant.colorHex)
                : null;

            const fallbackHex = getFallbackHexFromName(name);

            const hex = variantHex ?? fallbackHex;

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

        const fallbackHex = getFallbackHexFromName(imageColor);

        const hex = imageHex ?? fallbackHex;

        if (!imageColor && !hex) {
            return;
        }

        const key = `${normalizeColor(imageColor)}-${hex ?? ""}`;

        if (!colors.has(key)) {
            colors.set(key, {
                name: imageColor || hex || "Couleur",
                hex,
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

function getActiveCampaign(product: Product) {
    const campaign = product.saleCampaign;

    if (!campaign || !campaign.isActive) {
        return null;
    }

    if (!isDateRangeActive(campaign.startDate, campaign.endDate)) {
        return null;
    }

    return campaign;
}

function getCampaignOfferLabel(product: Product) {
    const campaign = getActiveCampaign(product);

    if (!campaign) {
        return null;
    }

    if (campaign.type === "REMISE_POURCENTAGE" && campaign.discountValue) {
        return `-${campaign.discountValue}%`;
    }

    if (campaign.type === "REMISE_MONTANT_FIXE" && campaign.discountValue) {
        return `-${formatCompactMoney(Number(campaign.discountValue))}`;
    }

    if (
        campaign.type === "ACHETEZ_X_OBTENEZ_Y" &&
        campaign.buyQuantity &&
        campaign.freeQuantity
    ) {
        return `Achetez ${campaign.buyQuantity} = ${campaign.freeQuantity} offert`;
    }

    return null;
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

    const activeCampaign = getActiveCampaign(product);
    const campaignOfferLabel = getCampaignOfferLabel(product);

    const hasDiscount = product.discountPercentage > 0;
    const hasHoverAnimation = Boolean(mainImage && hoverImage);

    return (
        <article className="group overflow-hidden rounded-3xl border border-neutral-200 bg-white text-neutral-950 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
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

                <div className="absolute left-4 top-4 flex max-w-[80%] flex-col items-start gap-2">
                    {hasDiscount && (
                        <span className="rounded-full bg-black px-3 py-1 text-xs font-black text-white shadow-sm">
                            {campaignOfferLabel ??
                                `-${product.discountPercentage}%`}
                        </span>
                    )}

                    {!hasDiscount && campaignOfferLabel && (
                        <span className="rounded-full bg-black px-3 py-1 text-xs font-black text-white shadow-sm">
                            {campaignOfferLabel}
                        </span>
                    )}

                    {activeCampaign && (
                        <span className="max-w-full truncate rounded-full bg-white px-3 py-1 text-xs font-black text-black shadow-sm">
                            {activeCampaign.name}
                        </span>
                    )}
                </div>

                {product.isNewArrival && (
                    <span className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1 text-sm font-semibold text-black shadow-sm">
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
