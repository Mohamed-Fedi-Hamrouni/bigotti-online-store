import Link from "next/link";
import type { Product } from "@/types/product";

type ProductCardProps = {
    product: Product;
};

function formatPrice(value: number) {
    return `${value.toFixed(3)} TND`;
}

export function ProductCard({ product }: ProductCardProps) {
    const mainImage =
        product.images.find((image) => image.isMain) ?? product.images[0];

    return (
        <Link
            href={`/produit/${product.slug}`}
            className="group overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
        >
            <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
                {mainImage ? (
                    <img
                        src={mainImage.url}
                        alt={mainImage.altText ?? product.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-400">
                        Image produit
                    </div>
                )}

                {product.isOnSale && product.discountPercentage > 0 && (
                    <span className="absolute left-4 top-4 rounded-full bg-black px-3 py-1 text-sm font-semibold text-white">
                        -{product.discountPercentage}%
                    </span>
                )}

                {product.isNewArrival && (
                    <span className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-sm font-semibold text-black">
                        Nouveau
                    </span>
                )}
            </div>

            <div className="space-y-3 p-5">
                <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                        {product.category.name}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-neutral-950">
                        {product.name}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                        Réf. {product.reference}
                    </p>
                </div>

                <div className="flex items-end justify-between gap-3">
                    <div>
                        {product.isOnSale ? (
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
        </Link>
    );
}
