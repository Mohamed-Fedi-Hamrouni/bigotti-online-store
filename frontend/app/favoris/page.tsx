"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useFavorites } from "@/components/favorites/FavoritesProvider";
import { ProductCard } from "@/components/ProductCard";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";

export default function FavoritesPage() {
    const { favorites, clearFavorites } = useFavorites();

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

            <section className="mx-auto max-w-7xl px-6 py-12">
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                            Sélection
                        </p>

                        <h2 className="mt-3 text-4xl font-black uppercase">
                            Produits favoris
                        </h2>
                    </div>

                    {favorites.length > 0 && (
                        <button
                            type="button"
                            onClick={clearFavorites}
                            className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold transition hover:border-red-600 hover:text-red-600"
                        >
                            <Trash2 size={18} />
                            Vider les favoris
                        </button>
                    )}
                </div>

                {favorites.length === 0 ? (
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
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {favorites.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </section>

            <PublicFooter />
        </main>
    );
}
