"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import type { Product } from "@/types/product";

type ProductCarouselProps = {
    products: Product[];
    title: string;
    eyebrow: string;
    id?: string;
};

function formatPrice(value: number) {
    return `${value.toFixed(3)} TND`;
}

export function ProductCarousel({
    products,
    title,
    eyebrow,
    id,
}: ProductCarouselProps) {
    return (
        <section id={id} className="bg-neutral-50">
            <div className="mx-auto max-w-7xl px-6 py-16">
                <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                            {eyebrow}
                        </p>
                        <h2 className="mt-3 text-4xl font-black uppercase">
                            {title}
                        </h2>
                    </div>

                    <Link
                        href="/boutique"
                        className="group inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-neutral-600 hover:text-black"
                    >
                        Voir plus
                        <ArrowRight
                            size={17}
                            className="transition group-hover:translate-x-1"
                        />
                    </Link>
                </div>

                {products.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-10 text-center">
                        <h3 className="text-xl font-bold">
                            Aucun produit disponible.
                        </h3>
                    </div>
                ) : (
                    <div className="flex gap-5 overflow-x-auto pb-4">
                        {products.map((product, index) => {
                            const mainImage =
                                product.images.find((image) => image.isMain) ??
                                product.images[0];

                            return (
                                <motion.article
                                    key={product.id}
                                    initial={{ y: 40, opacity: 0 }}
                                    whileInView={{ y: 0, opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{
                                        duration: 0.55,
                                        delay: index * 0.08,
                                    }}
                                    className="group min-w-[280px] overflow-hidden rounded-[2rem] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl md:min-w-[340px]"
                                >
                                    <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
                                        <Link href={`/produit/${product.slug}`}>
                                            {mainImage ? (
                                                <img
                                                    src={mainImage.url}
                                                    alt={
                                                        mainImage.altText ??
                                                        product.name
                                                    }
                                                    className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-neutral-400">
                                                    Image produit
                                                </div>
                                            )}
                                        </Link>

                                        <div className="absolute right-4 top-4">
                                            <FavoriteButton product={product} />
                                        </div>

                                        {product.isOnSale &&
                                            product.discountPercentage > 0 && (
                                                <span className="absolute left-4 top-4 rounded-full bg-black px-3 py-1 text-sm font-bold text-white">
                                                    -
                                                    {product.discountPercentage}
                                                    %
                                                </span>
                                            )}
                                    </div>

                                    <Link href={`/produit/${product.slug}`}>
                                        <div className="p-5">
                                            <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                                                {product.category.name}
                                            </p>

                                            <h3 className="mt-2 text-lg font-black">
                                                {product.name}
                                            </h3>

                                            <div className="mt-4 flex items-end justify-between gap-3">
                                                {product.isOnSale ? (
                                                    <div>
                                                        <p className="text-sm text-neutral-400 line-through">
                                                            {formatPrice(
                                                                product.price,
                                                            )}
                                                        </p>
                                                        <p className="text-xl font-black">
                                                            {formatPrice(
                                                                product.finalPrice,
                                                            )}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-xl font-black">
                                                        {formatPrice(
                                                            product.price,
                                                        )}
                                                    </p>
                                                )}

                                                <p className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-700">
                                                    Stock {product.totalStock}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.article>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
