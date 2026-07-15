"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getProducts } from "@/lib/api";
import type { Product } from "@/types/product";

type SearchOverlayProps = {
    isOpen: boolean;
    onClose: () => void;
};

function formatPrice(value: number) {
    return `${value.toFixed(3)} TND`;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setIsLoading(true);
            setError("");
        }, 0);

        getProducts()
            .then(setProducts)
            .catch((err) => {
                setError(
                    err instanceof Error ? err.message : "Erreur de recherche.",
                );
            })
            .finally(() => setIsLoading(false));
        return () => window.clearTimeout(timeoutId);
    }, [isOpen]);

    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        if (isOpen) {
            window.addEventListener("keydown", handleEscape);
        }

        return () => {
            window.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen, onClose]);

    const filteredProducts = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        if (!normalizedQuery) {
            return products.slice(0, 6);
        }

        return products
            .filter((product) => {
                return (
                    product.name.toLowerCase().includes(normalizedQuery) ||
                    product.reference.toLowerCase().includes(normalizedQuery) ||
                    product.category.name
                        .toLowerCase()
                        .includes(normalizedQuery)
                );
            })
            .slice(0, 8);
    }, [products, query]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: -80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -80, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        onClick={(event) => event.stopPropagation()}
                        className="mx-auto mt-6 w-[calc(100%-24px)] max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl"
                    >
                        <div className="border-b border-neutral-200 p-5">
                            <div className="flex items-center gap-4">
                                <Search
                                    className="text-neutral-400"
                                    size={24}
                                />

                                <input
                                    autoFocus
                                    value={query}
                                    onChange={(event) =>
                                        setQuery(event.target.value)
                                    }
                                    placeholder="Rechercher une chemise, costume, chaussure..."
                                    className="w-full bg-transparent text-lg font-medium outline-none placeholder:text-neutral-400"
                                />

                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-full border border-neutral-200 p-3 transition hover:border-black"
                                    aria-label="Fermer la recherche"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto p-5">
                            {isLoading && (
                                <div className="rounded-3xl bg-neutral-50 p-8 text-center text-neutral-500">
                                    Recherche en cours...
                                </div>
                            )}

                            {error && (
                                <div className="rounded-3xl bg-red-50 p-8 text-center text-red-700">
                                    {error}
                                </div>
                            )}

                            {!isLoading && !error && (
                                <>
                                    <div className="mb-5 flex flex-wrap gap-3">
                                        <Link
                                            href="/boutique"
                                            onClick={onClose}
                                            className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
                                        >
                                            Toute la boutique
                                        </Link>

                                        <Link
                                            href="/#promotions"
                                            onClick={onClose}
                                            className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold hover:border-black"
                                        >
                                            Promotions
                                        </Link>

                                        <Link
                                            href="/#nouveautes"
                                            onClick={onClose}
                                            className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold hover:border-black"
                                        >
                                            Nouveautés
                                        </Link>
                                    </div>

                                    {filteredProducts.length === 0 ? (
                                        <div className="rounded-3xl bg-neutral-50 p-8 text-center">
                                            <h3 className="text-xl font-black">
                                                Aucun produit trouvé.
                                            </h3>

                                            <p className="mt-2 text-neutral-500">
                                                Essayez avec un autre mot-clé ou
                                                consultez toute la boutique.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {filteredProducts.map((product) => {
                                                const mainImage =
                                                    product.images.find(
                                                        (image) => image.isMain,
                                                    ) ?? product.images[0];

                                                return (
                                                    <Link
                                                        key={product.id}
                                                        href={`/produit/${product.slug}`}
                                                        onClick={onClose}
                                                        className="grid gap-4 rounded-3xl border border-neutral-200 p-4 transition hover:border-black hover:bg-neutral-50 sm:grid-cols-[100px_1fr_auto]"
                                                    >
                                                        <div className="overflow-hidden rounded-2xl bg-neutral-100">
                                                            {mainImage ? (
                                                                <img
                                                                    src={
                                                                        mainImage.url
                                                                    }
                                                                    alt={
                                                                        mainImage.altText ??
                                                                        product.name
                                                                    }
                                                                    className="h-28 w-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex h-28 items-center justify-center text-neutral-400">
                                                                    Image
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                                                                {
                                                                    product
                                                                        .category
                                                                        .name
                                                                }
                                                            </p>

                                                            <h3 className="mt-2 text-xl font-black">
                                                                {product.name}
                                                            </h3>

                                                            <p className="mt-1 text-sm text-neutral-500">
                                                                Réf.{" "}
                                                                {
                                                                    product.reference
                                                                }
                                                            </p>
                                                        </div>

                                                        <div className="flex items-end sm:items-center sm:justify-end">
                                                            <p className="text-lg font-black">
                                                                {formatPrice(
                                                                    product.finalPrice,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
