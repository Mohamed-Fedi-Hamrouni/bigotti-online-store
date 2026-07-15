"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useFavorites } from "@/components/favorites/FavoritesProvider";
import { ProductCard } from "@/components/ProductCard";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";

const FAVORITES_PER_PAGE = 9;

function buildPaginationRange(currentPage: number, totalPages: number) {
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function FavoritesPage() {
    const { favorites, clearFavorites } = useFavorites();
    const favoritesSectionRef = useRef<HTMLElement | null>(null);

    const [currentPage, setCurrentPage] = useState(1);

    const sortedFavorites = useMemo(() => {
        return [...favorites].sort(
            (firstProduct, secondProduct) =>
                new Date(secondProduct.createdAt).getTime() -
                new Date(firstProduct.createdAt).getTime(),
        );
    }, [favorites]);

    const totalPages = Math.max(
        1,
        Math.ceil(sortedFavorites.length / FAVORITES_PER_PAGE),
    );

    const paginationRange = useMemo(
        () => buildPaginationRange(currentPage, totalPages),
        [currentPage, totalPages],
    );

    const paginatedFavorites = useMemo(() => {
        const startIndex = (currentPage - 1) * FAVORITES_PER_PAGE;
        const endIndex = startIndex + FAVORITES_PER_PAGE;

        return sortedFavorites.slice(startIndex, endIndex);
    }, [sortedFavorites, currentPage]);

    const firstVisibleFavoriteIndex =
        sortedFavorites.length === 0
            ? 0
            : (currentPage - 1) * FAVORITES_PER_PAGE + 1;

    const lastVisibleFavoriteIndex = Math.min(
        currentPage * FAVORITES_PER_PAGE,
        sortedFavorites.length,
    );

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            if (currentPage > totalPages) setCurrentPage(totalPages);
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [currentPage, totalPages]);

    function goToPage(page: number) {
        const nextPage = Math.min(Math.max(page, 1), totalPages);

        setCurrentPage(nextPage);

        favoritesSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }

    function handleClearFavorites() {
        clearFavorites();
        setCurrentPage(1);
    }

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <PublicHeader />

            <section className="bg-neutral-950 text-white">
                <div className="mx-auto max-w-7xl px-6 py-16">
                    <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">
                        Bigotti Collection
                    </p>

                    <h1 className="mt-5 max-w-4xl text-5xl font-black uppercase leading-none md:text-7xl">
                        Mes favoris
                    </h1>

                    <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
                        Retrouvez ici les articles que vous avez sauvegardés
                        pour les consulter plus tard.
                    </p>
                </div>
            </section>

            <section
                ref={favoritesSectionRef}
                className="mx-auto max-w-7xl px-6 py-12"
            >
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                            Sélection
                        </p>

                        <h2 className="mt-3 text-4xl font-black uppercase">
                            Produits favoris
                        </h2>

                        {sortedFavorites.length > 0 && (
                            <p className="mt-3 text-sm font-semibold text-neutral-500">
                                Affichage de {firstVisibleFavoriteIndex} à{" "}
                                {lastVisibleFavoriteIndex} sur{" "}
                                {sortedFavorites.length} produit
                                {sortedFavorites.length > 1 ? "s" : ""} favori
                                {sortedFavorites.length > 1 ? "s" : ""}
                            </p>
                        )}
                    </div>

                    {sortedFavorites.length > 0 && (
                        <button
                            type="button"
                            onClick={handleClearFavorites}
                            className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold transition hover:border-red-600 hover:text-red-600"
                        >
                            <Trash2 size={18} />
                            Vider les favoris
                        </button>
                    )}
                </div>

                {sortedFavorites.length === 0 ? (
                    <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm">
                        <h2 className="text-2xl font-black">
                            Aucun favori pour le moment.
                        </h2>

                        <p className="mt-3 text-neutral-500">
                            Ajoutez des produits à vos favoris depuis la
                            boutique.
                        </p>

                        <Link
                            href="/boutique"
                            className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-bold text-white"
                        >
                            Découvrir la boutique
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {paginatedFavorites.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                />
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
                    </>
                )}
            </section>

            <PublicFooter />
        </main>
    );
}
