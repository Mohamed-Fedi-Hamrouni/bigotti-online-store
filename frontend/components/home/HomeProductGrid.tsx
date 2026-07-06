"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/types/product";

type HomeProductGridProps = {
    products: Product[];
};

const PRODUCTS_PER_PAGE = 6;

function buildPaginationRange(currentPage: number, totalPages: number) {
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function HomeProductGrid({ products }: HomeProductGridProps) {
    const sectionRef = useRef<HTMLDivElement | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.max(
        1,
        Math.ceil(products.length / PRODUCTS_PER_PAGE),
    );

    const paginationRange = useMemo(
        () => buildPaginationRange(currentPage, totalPages),
        [currentPage, totalPages],
    );

    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
        const endIndex = startIndex + PRODUCTS_PER_PAGE;

        return products.slice(startIndex, endIndex);
    }, [products, currentPage]);

    const firstVisibleProductIndex =
        products.length === 0 ? 0 : (currentPage - 1) * PRODUCTS_PER_PAGE + 1;

    const lastVisibleProductIndex = Math.min(
        currentPage * PRODUCTS_PER_PAGE,
        products.length,
    );

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    function goToPage(page: number) {
        const nextPage = Math.min(Math.max(page, 1), totalPages);

        setCurrentPage(nextPage);

        sectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }

    if (products.length === 0) {
        return (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-10 text-center">
                <h3 className="text-xl font-semibold">
                    Aucun produit disponible pour le moment.
                </h3>

                <p className="mt-2 text-neutral-500">
                    Revenez bientôt pour découvrir la collection.
                </p>
            </div>
        );
    }

    return (
        <div ref={sectionRef}>
            <div className="mb-6 flex flex-col justify-between gap-3 rounded-[1.5rem] bg-white px-5 py-4 text-sm font-semibold text-neutral-600 shadow-sm md:flex-row md:items-center">
                <span>
                    Affichage de {firstVisibleProductIndex} à{" "}
                    {lastVisibleProductIndex} sur {products.length} produit
                    {products.length > 1 ? "s" : ""}
                </span>

                <span>
                    Page {currentPage} / {totalPages}
                </span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>

            {totalPages > 1 && (
                <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ChevronLeft size={16} />
                        Précédent
                    </button>

                    {paginationRange[0] > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={() => goToPage(1)}
                                className="h-11 min-w-11 rounded-full border border-neutral-300 bg-white px-4 text-sm font-black transition hover:border-black"
                            >
                                1
                            </button>

                            <span className="px-2 text-sm font-black text-neutral-400">
                                ...
                            </span>
                        </>
                    )}

                    {paginationRange.map((page) => (
                        <button
                            key={page}
                            type="button"
                            onClick={() => goToPage(page)}
                            className={
                                currentPage === page
                                    ? "h-11 min-w-11 rounded-full bg-black px-4 text-sm font-black text-white"
                                    : "h-11 min-w-11 rounded-full border border-neutral-300 bg-white px-4 text-sm font-black transition hover:border-black"
                            }
                        >
                            {page}
                        </button>
                    ))}

                    {paginationRange[paginationRange.length - 1] <
                        totalPages && (
                        <>
                            <span className="px-2 text-sm font-black text-neutral-400">
                                ...
                            </span>

                            <button
                                type="button"
                                onClick={() => goToPage(totalPages)}
                                className="h-11 min-w-11 rounded-full border border-neutral-300 bg-white px-4 text-sm font-black transition hover:border-black"
                            >
                                {totalPages}
                            </button>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Suivant
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
