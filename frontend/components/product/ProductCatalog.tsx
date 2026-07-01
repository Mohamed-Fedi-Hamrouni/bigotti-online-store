"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/types/product";

type ProductCatalogProps = {
    products: Product[];
};

type SortOption = "newest" | "price-asc" | "price-desc" | "stock-desc";

export function ProductCatalog({ products }: ProductCatalogProps) {
    const [search, setSearch] = useState("");
    const [categorySlug, setCategorySlug] = useState("");
    const [size, setSize] = useState("");
    const [color, setColor] = useState("");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [onlyPromotions, setOnlyPromotions] = useState(false);
    const [sort, setSort] = useState<SortOption>("newest");

    const categories = useMemo(() => {
        const map = new Map<string, string>();

        products.forEach((product) => {
            map.set(product.category.slug, product.category.name);
        });

        return Array.from(map.entries()).map(([slug, name]) => ({
            slug,
            name,
        }));
    }, [products]);

    const sizes = useMemo(() => {
        const values = new Set<string>();

        products.forEach((product) => {
            product.variants.forEach((variant) => {
                if (variant.stockQuantity > 0) {
                    values.add(variant.size);
                }
            });
        });

        return Array.from(values).sort();
    }, [products]);

    const colors = useMemo(() => {
        const values = new Set<string>();

        products.forEach((product) => {
            product.variants.forEach((variant) => {
                if (variant.stockQuantity > 0) {
                    values.add(variant.color);
                }
            });
        });

        return Array.from(values).sort();
    }, [products]);

    const filteredProducts = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const min = minPrice ? Number(minPrice) : null;
        const max = maxPrice ? Number(maxPrice) : null;

        const filtered = products.filter((product) => {
            const matchesSearch =
                !normalizedSearch ||
                product.name.toLowerCase().includes(normalizedSearch) ||
                product.reference.toLowerCase().includes(normalizedSearch) ||
                product.category.name.toLowerCase().includes(normalizedSearch);

            const matchesCategory =
                !categorySlug || product.category.slug === categorySlug;

            const matchesSize =
                !size ||
                product.variants.some(
                    (variant) =>
                        variant.size === size && variant.stockQuantity > 0,
                );

            const matchesColor =
                !color ||
                product.variants.some(
                    (variant) =>
                        variant.color === color && variant.stockQuantity > 0,
                );

            const matchesMinPrice = min === null || product.finalPrice >= min;
            const matchesMaxPrice = max === null || product.finalPrice <= max;

            const matchesPromotions =
                !onlyPromotions || product.isOnSale === true;

            return (
                matchesSearch &&
                matchesCategory &&
                matchesSize &&
                matchesColor &&
                matchesMinPrice &&
                matchesMaxPrice &&
                matchesPromotions
            );
        });

        return filtered.sort((a, b) => {
            if (sort === "price-asc") {
                return a.finalPrice - b.finalPrice;
            }

            if (sort === "price-desc") {
                return b.finalPrice - a.finalPrice;
            }

            if (sort === "stock-desc") {
                return b.totalStock - a.totalStock;
            }

            return (
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            );
        });
    }, [
        products,
        search,
        categorySlug,
        size,
        color,
        minPrice,
        maxPrice,
        onlyPromotions,
        sort,
    ]);

    function resetFilters() {
        setSearch("");
        setCategorySlug("");
        setSize("");
        setColor("");
        setMinPrice("");
        setMaxPrice("");
        setOnlyPromotions(false);
        setSort("newest");
    }

    const hasActiveFilters =
        search ||
        categorySlug ||
        size ||
        color ||
        minPrice ||
        maxPrice ||
        onlyPromotions ||
        sort !== "newest";

    return (
        <section className="mx-auto max-w-7xl px-6 py-12">
            <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                        Boutique
                    </p>

                    <h1 className="mt-3 text-5xl font-black uppercase tracking-tight">
                        Tous les produits
                    </h1>

                    <p className="mt-4 max-w-2xl text-neutral-600">
                        Recherchez un article, filtrez par catégorie, taille,
                        couleur, prix ou promotion.
                    </p>
                </div>

                <div className="rounded-full bg-white px-5 py-3 text-sm font-bold shadow-sm">
                    {filteredProducts.length} produit
                    {filteredProducts.length > 1 ? "s" : ""} trouvé
                    {filteredProducts.length > 1 ? "s" : ""}
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
                <aside className="h-fit rounded-[2rem] bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal size={20} />
                            <h2 className="text-xl font-black">Filtres</h2>
                        </div>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="flex items-center gap-1 text-sm font-semibold text-neutral-500 hover:text-black"
                            >
                                <X size={16} />
                                Reset
                            </button>
                        )}
                    </div>

                    <div className="mt-6 space-y-5">
                        <div>
                            <label className="text-sm font-bold">
                                Recherche
                            </label>

                            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-neutral-300 px-4 py-3">
                                <Search
                                    size={18}
                                    className="text-neutral-400"
                                />
                                <input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Chemise, costume..."
                                    className="w-full bg-transparent text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-bold">
                                Catégorie
                            </label>

                            <select
                                value={categorySlug}
                                onChange={(event) =>
                                    setCategorySlug(event.target.value)
                                }
                                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                            >
                                <option value="">Toutes les catégories</option>

                                {categories.map((category) => (
                                    <option
                                        key={category.slug}
                                        value={category.slug}
                                    >
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-bold">Taille</label>

                            <select
                                value={size}
                                onChange={(event) =>
                                    setSize(event.target.value)
                                }
                                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                            >
                                <option value="">Toutes les tailles</option>

                                {sizes.map((value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-bold">Couleur</label>

                            <select
                                value={color}
                                onChange={(event) =>
                                    setColor(event.target.value)
                                }
                                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                            >
                                <option value="">Toutes les couleurs</option>

                                {colors.map((value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-bold">
                                    Prix min
                                </label>

                                <input
                                    value={minPrice}
                                    onChange={(event) =>
                                        setMinPrice(event.target.value)
                                    }
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-bold">
                                    Prix max
                                </label>

                                <input
                                    value={maxPrice}
                                    onChange={(event) =>
                                        setMaxPrice(event.target.value)
                                    }
                                    type="number"
                                    min="0"
                                    placeholder="300"
                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
                                />
                            </div>
                        </div>

                        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-neutral-300 p-4">
                            <input
                                type="checkbox"
                                checked={onlyPromotions}
                                onChange={(event) =>
                                    setOnlyPromotions(event.target.checked)
                                }
                            />
                            <span className="text-sm font-bold">
                                Promotions seulement
                            </span>
                        </label>

                        <div>
                            <label className="text-sm font-bold">Tri</label>

                            <select
                                value={sort}
                                onChange={(event) =>
                                    setSort(event.target.value as SortOption)
                                }
                                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                            >
                                <option value="newest">Plus récents</option>
                                <option value="price-asc">
                                    Prix croissant
                                </option>
                                <option value="price-desc">
                                    Prix décroissant
                                </option>
                                <option value="stock-desc">
                                    Stock disponible
                                </option>
                            </select>
                        </div>
                    </div>
                </aside>

                <div>
                    {filteredProducts.length === 0 ? (
                        <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm">
                            <h2 className="text-2xl font-black">
                                Aucun produit trouvé.
                            </h2>

                            <p className="mt-3 text-neutral-500">
                                Essayez de modifier les filtres ou la recherche.
                            </p>

                            <button
                                type="button"
                                onClick={resetFilters}
                                className="mt-6 rounded-full bg-black px-6 py-3 text-sm font-bold text-white"
                            >
                                Réinitialiser les filtres
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            {filteredProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
