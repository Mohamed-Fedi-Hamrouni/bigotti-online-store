"use client";

import Link from "next/link";
import {
    ChevronDown,
    Heart,
    MapPin,
    Menu,
    Search,
    ShoppingBag,
    UserRound,
    X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { useFavorites } from "@/components/favorites/FavoritesProvider";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { getProducts } from "@/lib/api";
import type { Category, Product } from "@/types/product";

type AvailableCategory = Category & {
    productsCount: number;
};

type MenuProductPreview = {
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
    categoryName: string;
};

type StoreLocation = {
    city: "Tunis" | "Nabeul" | "Sfax";
    name: string;
    address: string;
    lat: number;
    lng: number;
};

const storeLocations: StoreLocation[] = [
    {
        city: "Tunis",
        name: "Bigotti Soukra Ariana",
        address: "Soukra Ariana, avant Monoprix, à droite",
        lat: 36.8787,
        lng: 10.2496,
    },
    {
        city: "Tunis",
        name: "Bigotti Lafayette",
        address: "Lafayette, devant Champion",
        lat: 36.8145,
        lng: 10.1818,
    },
    {
        city: "Tunis",
        name: "Bigotti Lac 2",
        address: "Lac 2, Jinan Al Bouhayra, à côté de Tunisia Mall",
        lat: 36.8483,
        lng: 10.2778,
    },
    {
        city: "Nabeul",
        name: "Bigotti Nabeul",
        address:
            "Avenue Habib Thameur, à côté de l’Institut Supérieur des Langues",
        lat: 36.4561,
        lng: 10.7376,
    },
    {
        city: "Sfax",
        name: "Bigotti Sfax",
        address: "Nasria, Avenue Med Chaabouni, Immeuble El Habib",
        lat: 34.7526,
        lng: 10.7397,
    },
];

function buildOpenStreetMapEmbedUrl(location: StoreLocation) {
    const delta = location.city === "Tunis" ? 0.055 : 0.075;

    const left = location.lng - delta;
    const bottom = location.lat - delta * 0.65;
    const right = location.lng + delta;
    const top = location.lat + delta * 0.65;

    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${location.lat}%2C${location.lng}`;
}

function buildOpenStreetMapExternalUrl(location: StoreLocation) {
    return `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=15/${location.lat}/${location.lng}`;
}

function getCategoryHref(category: AvailableCategory) {
    return `/boutique?category=${encodeURIComponent(category.slug)}`;
}

function getSearchHref(search: string) {
    return `/boutique?search=${encodeURIComponent(search)}`;
}

function getMainImage(product: Product) {
    const mainImage =
        product.images.find((image) => image.isMain) ?? product.images[0];

    return mainImage?.url ?? "";
}

export function PublicHeader() {
    const { itemsCount } = useCart();
    const { favoritesCount } = useFavorites();
    const { isAuthenticated } = useCustomerAuth();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isCollectionOpen, setIsCollectionOpen] = useState(false);
    const [isLocationOpen, setIsLocationOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<StoreLocation>(
        storeLocations[0],
    );
    const [availableCategories, setAvailableCategories] = useState<
        AvailableCategory[]
    >([]);
    const [menuProducts, setMenuProducts] = useState<MenuProductPreview[]>([]);

    useEffect(() => {
        getProducts()
            .then((products) => {
                const categoriesMap = new Map<string, AvailableCategory>();

                for (const product of products) {
                    if (!product.category || !product.category.isActive) {
                        continue;
                    }

                    const existingCategory = categoriesMap.get(
                        product.category.id,
                    );

                    if (existingCategory) {
                        existingCategory.productsCount += 1;
                    } else {
                        categoriesMap.set(product.category.id, {
                            ...product.category,
                            productsCount: 1,
                        });
                    }
                }

                const categories = Array.from(categoriesMap.values()).sort(
                    (a, b) => a.name.localeCompare(b.name),
                );

                const previews = products
                    .filter((product) => getMainImage(product))
                    .slice(0, 2)
                    .map((product) => ({
                        id: product.id,
                        name: product.name,
                        slug: product.slug,
                        imageUrl: getMainImage(product),
                        categoryName: product.category.name,
                    }));

                setAvailableCategories(categories);
                setMenuProducts(previews);
            })
            .catch(() => {
                setAvailableCategories([]);
                setMenuProducts([]);
            });
    }, []);

    const groupedStoreLocations = useMemo(() => {
        return storeLocations.reduce<Record<string, StoreLocation[]>>(
            (groups, location) => {
                if (!groups[location.city]) {
                    groups[location.city] = [];
                }

                groups[location.city].push(location);
                return groups;
            },
            {},
        );
    }, []);

    const categoryColumns = useMemo(() => {
        const middle = Math.ceil(availableCategories.length / 2);

        return [
            availableCategories.slice(0, middle),
            availableCategories.slice(middle),
        ];
    }, [availableCategories]);

    const hasAvailableCategories = availableCategories.length > 0;

    const costumesHref =
        availableCategories.find((category) =>
            category.slug.toLowerCase().includes("costume"),
        ) ||
        availableCategories.find((category) =>
            category.name.toLowerCase().includes("costume"),
        );

    const chaussuresHref =
        availableCategories.find((category) =>
            category.slug.toLowerCase().includes("chaussure"),
        ) ||
        availableCategories.find((category) =>
            category.name.toLowerCase().includes("chaussure"),
        );

    const mobileCollectionLabel = useMemo(() => {
        if (availableCategories.length === 0) {
            return "Collection";
        }

        return `Collection (${availableCategories.length})`;
    }, [availableCategories.length]);

    return (
        <>
            <header className="sticky top-0 z-50 bg-white text-neutral-950 shadow-sm">
                <div className="bg-neutral-950 px-6 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.35em] text-white">
                    Livraison à domicile — Paiement à la livraison disponible
                </div>

                <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen(true)}
                        className="rounded-full border border-neutral-200 p-3 transition hover:border-black lg:hidden"
                        aria-label="Ouvrir le menu"
                    >
                        <Menu size={21} />
                    </button>

                    <Link
                        href="/"
                        className="flex shrink-0 items-center"
                        aria-label="Bigotti Collection"
                    >
                        <img
                            src="/images/bigotti-logo.jpg"
                            alt="Bigotti Collection"
                            className="h-20 w-auto object-contain md:h-24 lg:h-28"
                        />
                    </Link>

                    <nav className="hidden flex-1 items-center justify-center gap-8 text-sm font-black uppercase tracking-[0.18em] text-neutral-700 lg:flex">
                        <Link
                            href="/#nouveautes"
                            className="relative py-3 transition after:absolute after:bottom-1 after:left-0 after:h-px after:w-0 after:bg-black after:transition-all hover:text-black hover:after:w-full"
                        >
                            Nouveautés
                        </Link>

                        <div className="group/collection relative">
                            <button
                                type="button"
                                className="flex items-center gap-2 py-3 transition hover:text-black"
                                aria-label="Ouvrir la collection"
                            >
                                Collection
                                <ChevronDown
                                    size={16}
                                    className="transition group-hover/collection:rotate-180"
                                />
                            </button>

                            <div className="invisible absolute left-1/2 top-full z-50 w-[min(1120px,calc(100vw-3rem))] -translate-x-1/2 translate-y-4 rounded-[2rem] border border-neutral-100 bg-white p-8 opacity-0 shadow-2xl transition-all duration-200 group-hover/collection:visible group-hover/collection:translate-y-0 group-hover/collection:opacity-100">
                                <div className="grid gap-8 lg:grid-cols-[1.1fr_1.1fr_1.2fr]">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.28em] text-neutral-400">
                                            Promotions
                                        </p>

                                        <Link
                                            href="/boutique?promo=true"
                                            className="mt-5 block rounded-3xl bg-neutral-950 p-6 text-white transition hover:bg-black"
                                        >
                                            <p className="text-2xl font-black uppercase">
                                                Offres du moment
                                            </p>

                                            <p className="mt-3 text-sm font-medium normal-case tracking-normal text-neutral-300">
                                                Découvrez les articles en
                                                promotion disponibles dans la
                                                boutique.
                                            </p>
                                        </Link>

                                        <Link
                                            href="/#nouveautes"
                                            className="mt-4 block rounded-3xl border border-neutral-200 p-5 transition hover:border-black"
                                        >
                                            <p className="text-sm font-black uppercase tracking-[0.18em] text-black">
                                                Nouveautés
                                            </p>

                                            <p className="mt-2 text-sm font-medium normal-case tracking-normal text-neutral-500">
                                                Les dernières pièces ajoutées à
                                                la collection.
                                            </p>
                                        </Link>
                                    </div>

                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.28em] text-neutral-400">
                                            Collection
                                        </p>

                                        {hasAvailableCategories ? (
                                            <div className="mt-5 grid max-h-[360px] gap-6 overflow-y-auto pr-3 md:grid-cols-2">
                                                {categoryColumns.map(
                                                    (column, columnIndex) => (
                                                        <div
                                                            key={columnIndex}
                                                            className="space-y-4"
                                                        >
                                                            {column.map(
                                                                (category) => (
                                                                    <Link
                                                                        key={
                                                                            category.id
                                                                        }
                                                                        href={getCategoryHref(
                                                                            category,
                                                                        )}
                                                                        className="block rounded-2xl p-3 transition hover:bg-neutral-50"
                                                                    >
                                                                        <div className="flex items-center justify-between gap-4">
                                                                            <p className="text-sm font-black uppercase tracking-[0.16em] text-black">
                                                                                {
                                                                                    category.name
                                                                                }
                                                                            </p>

                                                                            <span className="shrink-0 text-xs font-black text-neutral-400">
                                                                                {
                                                                                    category.productsCount
                                                                                }
                                                                            </span>
                                                                        </div>

                                                                        {category.description && (
                                                                            <p className="mt-2 line-clamp-2 text-sm font-medium normal-case tracking-normal text-neutral-500">
                                                                                {
                                                                                    category.description
                                                                                }
                                                                            </p>
                                                                        )}
                                                                    </Link>
                                                                ),
                                                            )}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        ) : (
                                            <div className="mt-5 rounded-3xl bg-neutral-50 p-5 text-sm font-semibold normal-case tracking-normal text-neutral-500">
                                                Aucune catégorie disponible pour
                                                le moment.
                                            </div>
                                        )}

                                        <Link
                                            href="/boutique"
                                            className="mt-6 block rounded-full bg-black px-5 py-3 text-center text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-neutral-800"
                                        >
                                            Voir toute la boutique
                                        </Link>
                                    </div>

                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.28em] text-neutral-400">
                                            Sélection
                                        </p>

                                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                                            {menuProducts.length > 0 ? (
                                                menuProducts.map((product) => (
                                                    <Link
                                                        key={product.id}
                                                        href={`/produit/${product.slug}`}
                                                        className="group/product block overflow-hidden rounded-3xl bg-neutral-50"
                                                    >
                                                        <div className="aspect-[3/4] overflow-hidden bg-neutral-100">
                                                            <img
                                                                src={
                                                                    product.imageUrl
                                                                }
                                                                alt={
                                                                    product.name
                                                                }
                                                                className="h-full w-full object-cover transition duration-500 group-hover/product:scale-105"
                                                            />
                                                        </div>

                                                        <div className="p-4">
                                                            <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
                                                                {
                                                                    product.categoryName
                                                                }
                                                            </p>

                                                            <p className="mt-2 text-sm font-black normal-case tracking-normal text-black">
                                                                {product.name}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                ))
                                            ) : (
                                                <div className="col-span-2 rounded-3xl bg-neutral-50 p-6 text-sm font-semibold normal-case tracking-normal text-neutral-500">
                                                    Ajoutez des produits avec
                                                    images pour afficher une
                                                    sélection ici.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Link
                            href={
                                costumesHref
                                    ? getCategoryHref(costumesHref)
                                    : getSearchHref("costume")
                            }
                            className="relative py-3 transition after:absolute after:bottom-1 after:left-0 after:h-px after:w-0 after:bg-black after:transition-all hover:text-black hover:after:w-full"
                        >
                            Costumes
                        </Link>

                        <Link
                            href={
                                chaussuresHref
                                    ? getCategoryHref(chaussuresHref)
                                    : getSearchHref("chaussure")
                            }
                            className="relative py-3 transition after:absolute after:bottom-1 after:left-0 after:h-px after:w-0 after:bg-black after:transition-all hover:text-black hover:after:w-full"
                        >
                            Chaussures
                        </Link>

                        <Link
                            href="/suivi-commande"
                            className="relative py-3 transition after:absolute after:bottom-1 after:left-0 after:h-px after:w-0 after:bg-black after:transition-all hover:text-black hover:after:w-full"
                        >
                            Suivi
                        </Link>
                    </nav>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsLocationOpen(true)}
                            className="hidden rounded-full border border-neutral-200 p-3.5 transition hover:border-black hover:bg-neutral-50 md:inline-flex"
                            aria-label="Nos boutiques"
                        >
                            <MapPin size={20} />
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsSearchOpen(true)}
                            className="hidden rounded-full border border-neutral-200 p-3.5 transition hover:border-black hover:bg-neutral-50 md:inline-flex"
                            aria-label="Recherche"
                        >
                            <Search size={20} />
                        </button>

                        <Link
                            href="/favoris"
                            className="relative hidden rounded-full border border-neutral-200 p-3.5 transition hover:border-black hover:bg-neutral-50 md:inline-flex"
                            aria-label="Favoris"
                        >
                            <Heart size={20} />

                            {favoritesCount > 0 && (
                                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                                    {favoritesCount}
                                </span>
                            )}
                        </Link>

                        <Link
                            href={isAuthenticated ? "/compte" : "/compte/login"}
                            className="hidden rounded-full border border-neutral-200 p-3.5 transition hover:border-black hover:bg-neutral-50 md:inline-flex"
                            aria-label="Mon compte"
                        >
                            <UserRound size={20} />
                        </Link>

                        <Link
                            href="/panier"
                            className="relative rounded-full bg-black p-3.5 text-white transition hover:bg-neutral-800"
                            aria-label="Panier"
                        >
                            <ShoppingBag size={21} />

                            {itemsCount > 0 && (
                                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                                    {itemsCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                {isMenuOpen && (
                    <div className="fixed inset-0 z-50 bg-black/50 lg:hidden">
                        <div className="h-full w-[86%] max-w-sm overflow-y-auto bg-white p-6 shadow-2xl">
                            <div className="flex items-center justify-between">
                                <img
                                    src="/images/bigotti-logo.jpg"
                                    alt="Bigotti Collection"
                                    className="h-24 w-auto object-contain"
                                />

                                <button
                                    type="button"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="rounded-full border border-neutral-200 p-3"
                                    aria-label="Fermer le menu"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <nav className="mt-8 space-y-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setIsLocationOpen(true);
                                    }}
                                    className="block w-full rounded-2xl bg-neutral-50 px-5 py-4 text-left text-sm font-black uppercase tracking-[0.16em]"
                                >
                                    Nos boutiques
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setIsSearchOpen(true);
                                    }}
                                    className="block w-full rounded-2xl bg-neutral-50 px-5 py-4 text-left text-sm font-black uppercase tracking-[0.16em]"
                                >
                                    Recherche
                                </button>

                                <Link
                                    href="/#nouveautes"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block rounded-2xl bg-neutral-50 px-5 py-4 text-sm font-black uppercase tracking-[0.16em]"
                                >
                                    Nouveautés
                                </Link>

                                <div className="rounded-2xl bg-neutral-50">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsCollectionOpen(
                                                (currentValue) => !currentValue,
                                            )
                                        }
                                        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-black uppercase tracking-[0.16em]"
                                    >
                                        {mobileCollectionLabel}
                                        <ChevronDown
                                            size={18}
                                            className={
                                                isCollectionOpen
                                                    ? "rotate-180 transition"
                                                    : "transition"
                                            }
                                        />
                                    </button>

                                    {isCollectionOpen && (
                                        <div className="max-h-72 overflow-y-auto border-t border-neutral-200 px-4 py-3">
                                            {hasAvailableCategories ? (
                                                <div className="space-y-2">
                                                    {availableCategories.map(
                                                        (category) => (
                                                            <Link
                                                                key={
                                                                    category.id
                                                                }
                                                                href={getCategoryHref(
                                                                    category,
                                                                )}
                                                                onClick={() =>
                                                                    setIsMenuOpen(
                                                                        false,
                                                                    )
                                                                }
                                                                className="block rounded-2xl bg-white px-4 py-4"
                                                            >
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <p className="text-sm font-black uppercase tracking-[0.16em]">
                                                                        {
                                                                            category.name
                                                                        }
                                                                    </p>

                                                                    <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs font-black">
                                                                        {
                                                                            category.productsCount
                                                                        }
                                                                    </span>
                                                                </div>

                                                                {category.description && (
                                                                    <p className="mt-2 text-sm text-neutral-500">
                                                                        {
                                                                            category.description
                                                                        }
                                                                    </p>
                                                                )}
                                                            </Link>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-neutral-500">
                                                    Aucune catégorie disponible.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <Link
                                    href={
                                        costumesHref
                                            ? getCategoryHref(costumesHref)
                                            : getSearchHref("costume")
                                    }
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block rounded-2xl bg-neutral-50 px-5 py-4 text-sm font-black uppercase tracking-[0.16em]"
                                >
                                    Costumes
                                </Link>

                                <Link
                                    href={
                                        chaussuresHref
                                            ? getCategoryHref(chaussuresHref)
                                            : getSearchHref("chaussure")
                                    }
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block rounded-2xl bg-neutral-50 px-5 py-4 text-sm font-black uppercase tracking-[0.16em]"
                                >
                                    Chaussures
                                </Link>

                                <Link
                                    href="/suivi-commande"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block rounded-2xl bg-neutral-50 px-5 py-4 text-sm font-black uppercase tracking-[0.16em]"
                                >
                                    Suivi
                                </Link>

                                <Link
                                    href="/favoris"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block rounded-2xl bg-neutral-50 px-5 py-4 text-sm font-black uppercase tracking-[0.16em]"
                                >
                                    Favoris ({favoritesCount})
                                </Link>

                                <Link
                                    href={
                                        isAuthenticated
                                            ? "/compte"
                                            : "/compte/login"
                                    }
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block rounded-2xl bg-neutral-50 px-5 py-4 text-sm font-black uppercase tracking-[0.16em]"
                                >
                                    Mon compte
                                </Link>

                                <Link
                                    href="/admin/login"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block pt-4 text-sm font-black uppercase tracking-[0.16em] text-neutral-500"
                                >
                                    Espace admin
                                </Link>
                            </nav>
                        </div>
                    </div>
                )}
            </header>

            {isLocationOpen && (
                <div className="fixed inset-0 z-[70] bg-black/60 px-4 py-6 backdrop-blur-sm">
                    <div className="mx-auto flex max-h-[92vh] max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-5">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.28em] text-neutral-400">
                                    Bigotti Collection
                                </p>

                                <h2 className="mt-2 text-3xl font-black">
                                    Nos points de vente
                                </h2>

                                <p className="mt-2 max-w-2xl text-sm text-neutral-500">
                                    La carte est centrée par défaut sur les
                                    boutiques de Tunis. Cliquez sur un point de
                                    vente pour déplacer le zoom.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsLocationOpen(false)}
                                className="rounded-full border border-neutral-200 p-3 transition hover:border-black"
                                aria-label="Fermer la carte"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_380px]">
                            <div className="min-h-[420px] bg-neutral-100 lg:min-h-[620px]">
                                <iframe
                                    title={`Carte ${selectedLocation.name}`}
                                    src={buildOpenStreetMapEmbedUrl(
                                        selectedLocation,
                                    )}
                                    className="h-full min-h-[420px] w-full border-0 lg:min-h-[620px]"
                                    loading="lazy"
                                />
                            </div>

                            <aside className="max-h-[620px] overflow-y-auto border-l border-neutral-200 p-6">
                                <div className="rounded-3xl bg-neutral-950 p-5 text-white">
                                    <p className="text-xs font-black uppercase tracking-[0.22em] text-neutral-400">
                                        Boutique sélectionnée
                                    </p>

                                    <h3 className="mt-3 text-xl font-black">
                                        {selectedLocation.name}
                                    </h3>

                                    <p className="mt-2 text-sm leading-6 text-neutral-300">
                                        {selectedLocation.address}
                                    </p>

                                    <a
                                        href={buildOpenStreetMapExternalUrl(
                                            selectedLocation,
                                        )}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:bg-neutral-200"
                                    >
                                        Ouvrir sur OpenStreetMap
                                    </a>
                                </div>

                                <div className="mt-6 space-y-6">
                                    {Object.entries(groupedStoreLocations).map(
                                        ([city, locations]) => (
                                            <div key={city}>
                                                <p className="text-sm font-black uppercase tracking-[0.22em] text-neutral-400">
                                                    {city}
                                                </p>

                                                <div className="mt-3 space-y-3">
                                                    {locations.map(
                                                        (location) => {
                                                            const isSelected =
                                                                selectedLocation.name ===
                                                                location.name;

                                                            return (
                                                                <button
                                                                    key={
                                                                        location.name
                                                                    }
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSelectedLocation(
                                                                            location,
                                                                        )
                                                                    }
                                                                    className={
                                                                        isSelected
                                                                            ? "w-full rounded-3xl border border-black bg-black p-5 text-left text-white"
                                                                            : "w-full rounded-3xl border border-neutral-200 bg-neutral-50 p-5 text-left transition hover:border-black hover:bg-white"
                                                                    }
                                                                >
                                                                    <div className="flex items-start gap-3">
                                                                        <MapPin
                                                                            size={
                                                                                20
                                                                            }
                                                                            className="mt-0.5 shrink-0"
                                                                        />

                                                                        <div>
                                                                            <p className="font-black">
                                                                                {
                                                                                    location.name
                                                                                }
                                                                            </p>

                                                                            <p
                                                                                className={
                                                                                    isSelected
                                                                                        ? "mt-1 text-sm leading-6 text-neutral-300"
                                                                                        : "mt-1 text-sm leading-6 text-neutral-500"
                                                                                }
                                                                            >
                                                                                {
                                                                                    location.address
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>

                                <p className="mt-6 rounded-2xl bg-yellow-50 p-4 text-xs font-semibold leading-6 text-yellow-800">
                                    Les positions sont placées sur les zones des
                                    adresses disponibles. Pour une précision
                                    parfaite, on peut ensuite remplacer ces
                                    points par les coordonnées exactes GPS de
                                    chaque boutique.
                                </p>
                            </aside>
                        </div>
                    </div>
                </div>
            )}

            <SearchOverlay
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
            />
        </>
    );
}
