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
import { getCategories } from "@/lib/api";
import type {
    Category,
    CategoryMenuGroup,
    CategoryType,
} from "@/types/product";

type CollectionGroup = {
    value: CategoryMenuGroup;
    label: string;
};

type TypeMenuItem = {
    id: string;
    label: string;
    href: string;
    position: number;
};

const collectionGroups: CollectionGroup[] = [
    {
        value: "HAUT",
        label: "Haut",
    },
    {
        value: "BAS",
        label: "Bas",
    },
];

function normalizeText(value: string | null | undefined) {
    return (value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function getCategoryHref(category: Category) {
    return `/boutique?category=${encodeURIComponent(category.slug)}`;
}

function getCategoryTypeHref(category: Category, type: CategoryType) {
    return `/boutique?category=${encodeURIComponent(
        category.slug,
    )}&categoryType=${encodeURIComponent(type.slug)}`;
}

function getSearchHref(search: string) {
    return `/boutique?search=${encodeURIComponent(search)}`;
}

function groupCollectionCategories(categories: Category[]) {
    return collectionGroups
        .map((group) => ({
            ...group,
            categories: categories.filter(
                (category) => category.menuGroup === group.value,
            ),
        }))
        .filter((group) => group.categories.length > 0);
}

function findFirstCategoryByGroup(
    categories: Category[],
    group: CategoryMenuGroup,
) {
    return categories.find((category) => category.menuGroup === group) ?? null;
}

function findFirstCategoryByKeyword(
    categories: Category[],
    keywords: string[],
) {
    return (
        categories.find((category) => {
            const normalizedValue = normalizeText(
                `${category.name} ${category.slug}`,
            );

            return keywords.some((keyword) =>
                normalizedValue.includes(normalizeText(keyword)),
            );
        }) ?? null
    );
}

function buildCategoryLink(category: Category | null, fallbackSearch: string) {
    return category ? getCategoryHref(category) : getSearchHref(fallbackSearch);
}

function buildTypeMenuItems(
    categories: Category[],
    menuGroup: CategoryMenuGroup,
): TypeMenuItem[] {
    return categories
        .filter((category) => category.menuGroup === menuGroup)
        .flatMap((category) => {
            const activeTypes = (category.types ?? [])
                .filter((type) => type.isActive)
                .sort(
                    (a, b) =>
                        Number(a.position ?? 0) - Number(b.position ?? 0) ||
                        a.name.localeCompare(b.name),
                );

            if (activeTypes.length > 0) {
                return activeTypes.map((type) => ({
                    id: type.id,
                    label: type.name,
                    href: getCategoryTypeHref(category, type),
                    position: Number(type.position ?? 0),
                }));
            }

            return [
                {
                    id: category.id,
                    label: category.name,
                    href: getCategoryHref(category),
                    position: 0,
                },
            ];
        })
        .sort(
            (a, b) =>
                Number(a.position ?? 0) - Number(b.position ?? 0) ||
                a.label.localeCompare(b.label),
        );
}

export function PublicHeader() {
    const { itemsCount } = useCart();
    const { favoritesCount } = useFavorites();
    const { isAuthenticated } = useCustomerAuth();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMobileCollectionOpen, setIsMobileCollectionOpen] = useState(false);
    const [isMobileShoesOpen, setIsMobileShoesOpen] = useState(false);
    const [isMobileAccessoriesOpen, setIsMobileAccessoriesOpen] =
        useState(false);
    const [availableCategories, setAvailableCategories] = useState<Category[]>(
        [],
    );

    useEffect(() => {
        getCategories()
            .then((categories) => {
                setAvailableCategories(
                    categories
                        .filter((category) => category.isActive)
                        .map((category) => ({
                            ...category,
                            types: (category.types ?? []).filter(
                                (type) => type.isActive,
                            ),
                        })),
                );
            })
            .catch(() => {
                setAvailableCategories([]);
            });
    }, []);

    const groupedCollectionCategories = useMemo(() => {
        return groupCollectionCategories(availableCategories);
    }, [availableCategories]);

    const shoesMenuItems = useMemo(() => {
        return buildTypeMenuItems(availableCategories, "CHAUSSURES");
    }, [availableCategories]);

    const accessoriesMenuItems = useMemo(() => {
        return buildTypeMenuItems(availableCategories, "ACCESSOIRES");
    }, [availableCategories]);

    const hasCollectionCategories = groupedCollectionCategories.length > 0;
    const hasShoesMenuItems = shoesMenuItems.length > 0;
    const hasAccessoriesMenuItems = accessoriesMenuItems.length > 0;

    const costumeCategory =
        findFirstCategoryByGroup(availableCategories, "COSTUME_CEREMONIE") ??
        findFirstCategoryByKeyword(availableCategories, [
            "costume",
            "ceremonie",
            "cérémonie",
        ]);

    const mobileCollectionLabel = useMemo(() => {
        const count = availableCategories.filter(
            (category) =>
                category.menuGroup === "HAUT" || category.menuGroup === "BAS",
        ).length;

        if (count === 0) {
            return "Collection";
        }

        return `Collection (${count})`;
    }, [availableCategories]);

    const mobileShoesLabel = useMemo(() => {
        if (shoesMenuItems.length === 0) {
            return "Chaussures";
        }

        return `Chaussures (${shoesMenuItems.length})`;
    }, [shoesMenuItems.length]);

    const mobileAccessoriesLabel = useMemo(() => {
        if (accessoriesMenuItems.length === 0) {
            return "Accessoires";
        }

        return `Accessoires (${accessoriesMenuItems.length})`;
    }, [accessoriesMenuItems.length]);

    return (
        <>
            <header className="sticky top-0 z-50 bg-white text-neutral-950 shadow-sm">
                <div className="bg-neutral-950 px-6 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.35em] text-white">
                    Livraison à domicile — Paiement à la livraison disponible
                </div>

                <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
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
                        className="flex shrink-0 items-center text-xl font-black uppercase tracking-[0.22em]"
                        aria-label="Bigotti Collection"
                    >
                        Bigotti
                    </Link>

                    <nav className="hidden flex-1 items-center justify-center gap-7 text-sm font-black uppercase tracking-[0.16em] text-neutral-700 lg:flex">
                        <Link
                            href="/#promotions"
                            className="relative py-3 transition after:absolute after:bottom-1 after:left-0 after:h-px after:w-0 after:bg-black after:transition-all hover:text-black hover:after:w-full"
                        >
                            Promotions
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

                            <div className="invisible absolute left-1/2 top-full z-50 w-[min(720px,calc(100vw-3rem))] -translate-x-1/2 translate-y-4 rounded-[2rem] border border-neutral-100 bg-white p-8 opacity-0 shadow-2xl transition-all duration-200 group-hover/collection:visible group-hover/collection:translate-y-0 group-hover/collection:opacity-100">
                                <p className="text-xs font-black uppercase tracking-[0.28em] text-neutral-400">
                                    Collection
                                </p>

                                {hasCollectionCategories ? (
                                    <div className="mt-6 grid gap-10 md:grid-cols-2">
                                        {groupedCollectionCategories.map(
                                            (group) => (
                                                <div
                                                    key={group.value}
                                                    className="min-w-0"
                                                >
                                                    <div className="mb-4 border-b border-neutral-200 pb-3">
                                                        <p className="text-base font-black uppercase tracking-[0.22em] text-black">
                                                            {group.label}
                                                        </p>
                                                    </div>

                                                    <div className="space-y-1">
                                                        {group.categories.map(
                                                            (category) => (
                                                                <Link
                                                                    key={
                                                                        category.id
                                                                    }
                                                                    href={getCategoryHref(
                                                                        category,
                                                                    )}
                                                                    className="block rounded-2xl px-3 py-3 text-sm font-black uppercase tracking-[0.14em] text-neutral-700 transition hover:bg-neutral-50 hover:text-black"
                                                                >
                                                                    {
                                                                        category.name
                                                                    }
                                                                </Link>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <div className="mt-6 rounded-3xl bg-neutral-50 p-5 text-sm font-semibold normal-case tracking-normal text-neutral-500">
                                        Aucune catégorie Haut/Bas disponible.
                                    </div>
                                )}
                            </div>
                        </div>

                        <Link
                            href={buildCategoryLink(
                                costumeCategory,
                                "costume ceremonie",
                            )}
                            className="relative py-3 transition after:absolute after:bottom-1 after:left-0 after:h-px after:w-0 after:bg-black after:transition-all hover:text-black hover:after:w-full"
                        >
                            Costume & cérémonie
                        </Link>

                        <div className="group/chaussures relative">
                            <button
                                type="button"
                                className="flex items-center gap-2 py-3 transition hover:text-black"
                                aria-label="Ouvrir les chaussures"
                            >
                                Chaussures
                                <ChevronDown
                                    size={16}
                                    className="transition group-hover/chaussures:rotate-180"
                                />
                            </button>

                            <div className="invisible absolute left-1/2 top-full z-50 w-[min(430px,calc(100vw-3rem))] -translate-x-1/2 translate-y-4 rounded-[2rem] border border-neutral-100 bg-white p-7 opacity-0 shadow-2xl transition-all duration-200 group-hover/chaussures:visible group-hover/chaussures:translate-y-0 group-hover/chaussures:opacity-100">
                                <p className="text-xs font-black uppercase tracking-[0.28em] text-neutral-400">
                                    Chaussures
                                </p>

                                {hasShoesMenuItems ? (
                                    <div className="mt-5 space-y-1">
                                        {shoesMenuItems.map((item) => (
                                            <Link
                                                key={item.id}
                                                href={item.href}
                                                className="block rounded-2xl px-3 py-3 text-sm font-black uppercase tracking-[0.14em] text-neutral-700 transition hover:bg-neutral-50 hover:text-black"
                                            >
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-5 rounded-3xl bg-neutral-50 p-5 text-sm font-semibold normal-case tracking-normal text-neutral-500">
                                        Aucun type de chaussure disponible.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="group/accessoires relative">
                            <button
                                type="button"
                                className="flex items-center gap-2 py-3 transition hover:text-black"
                                aria-label="Ouvrir les accessoires"
                            >
                                Accessoires
                                <ChevronDown
                                    size={16}
                                    className="transition group-hover/accessoires:rotate-180"
                                />
                            </button>

                            <div className="invisible absolute left-1/2 top-full z-50 w-[min(430px,calc(100vw-3rem))] -translate-x-1/2 translate-y-4 rounded-[2rem] border border-neutral-100 bg-white p-7 opacity-0 shadow-2xl transition-all duration-200 group-hover/accessoires:visible group-hover/accessoires:translate-y-0 group-hover/accessoires:opacity-100">
                                <p className="text-xs font-black uppercase tracking-[0.28em] text-neutral-400">
                                    Accessoires
                                </p>

                                {hasAccessoriesMenuItems ? (
                                    <div className="mt-5 space-y-1">
                                        {accessoriesMenuItems.map((item) => (
                                            <Link
                                                key={item.id}
                                                href={item.href}
                                                className="block rounded-2xl px-3 py-3 text-sm font-black uppercase tracking-[0.14em] text-neutral-700 transition hover:bg-neutral-50 hover:text-black"
                                            >
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-5 rounded-3xl bg-neutral-50 p-5 text-sm font-semibold normal-case tracking-normal text-neutral-500">
                                        Aucun type d’accessoire disponible.
                                    </div>
                                )}
                            </div>
                        </div>
                    </nav>

                    <div className="flex shrink-0 items-center gap-2">
                        <Link
                            href="/points-de-vente"
                            className="hidden rounded-full border border-neutral-200 p-3.5 transition hover:border-black hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black md:inline-flex"
                            aria-label="Trouver un point de vente"
                        >
                            <MapPin size={20} />
                        </Link>

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
                                <Link
                                    href="/"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="text-xl font-black uppercase tracking-[0.22em]"
                                >
                                    Bigotti
                                </Link>

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
                                <Link
                                    href="/points-de-vente"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                >
                                    <MapPin size={19} aria-hidden="true" />
                                    Points de vente
                                </Link>

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
                                    href="/#promotions"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block rounded-2xl bg-neutral-50 px-5 py-4 text-sm font-black uppercase tracking-[0.16em]"
                                >
                                    Promotions
                                </Link>

                                <div className="rounded-2xl bg-neutral-50">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsMobileCollectionOpen(
                                                (currentValue) => !currentValue,
                                            )
                                        }
                                        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-black uppercase tracking-[0.16em]"
                                    >
                                        {mobileCollectionLabel}
                                        <ChevronDown
                                            size={18}
                                            className={
                                                isMobileCollectionOpen
                                                    ? "rotate-180 transition"
                                                    : "transition"
                                            }
                                        />
                                    </button>

                                    {isMobileCollectionOpen && (
                                        <div className="max-h-80 overflow-y-auto border-t border-neutral-200 px-4 py-3">
                                            {hasCollectionCategories ? (
                                                <div className="space-y-5">
                                                    {groupedCollectionCategories.map(
                                                        (group) => (
                                                            <div
                                                                key={
                                                                    group.value
                                                                }
                                                            >
                                                                <p className="px-1 text-xs font-black uppercase tracking-[0.22em] text-neutral-400">
                                                                    {
                                                                        group.label
                                                                    }
                                                                </p>

                                                                <div className="mt-2 space-y-2">
                                                                    {group.categories.map(
                                                                        (
                                                                            category,
                                                                        ) => (
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
                                                                                className="block rounded-2xl bg-white px-4 py-4 text-sm font-black uppercase tracking-[0.16em]"
                                                                            >
                                                                                {
                                                                                    category.name
                                                                                }
                                                                            </Link>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-neutral-500">
                                                    Aucune catégorie Haut/Bas
                                                    disponible.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <Link
                                    href={buildCategoryLink(
                                        costumeCategory,
                                        "costume ceremonie",
                                    )}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block rounded-2xl bg-neutral-50 px-5 py-4 text-sm font-black uppercase tracking-[0.16em]"
                                >
                                    Costume & cérémonie
                                </Link>

                                <div className="rounded-2xl bg-neutral-50">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsMobileShoesOpen(
                                                (currentValue) => !currentValue,
                                            )
                                        }
                                        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-black uppercase tracking-[0.16em]"
                                    >
                                        {mobileShoesLabel}
                                        <ChevronDown
                                            size={18}
                                            className={
                                                isMobileShoesOpen
                                                    ? "rotate-180 transition"
                                                    : "transition"
                                            }
                                        />
                                    </button>

                                    {isMobileShoesOpen && (
                                        <div className="max-h-80 overflow-y-auto border-t border-neutral-200 px-4 py-3">
                                            {hasShoesMenuItems ? (
                                                <div className="space-y-2">
                                                    {shoesMenuItems.map(
                                                        (item) => (
                                                            <Link
                                                                key={item.id}
                                                                href={item.href}
                                                                onClick={() =>
                                                                    setIsMenuOpen(
                                                                        false,
                                                                    )
                                                                }
                                                                className="block rounded-2xl bg-white px-4 py-4 text-sm font-black uppercase tracking-[0.16em]"
                                                            >
                                                                {item.label}
                                                            </Link>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-neutral-500">
                                                    Aucun type de chaussure
                                                    disponible.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-2xl bg-neutral-50">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsMobileAccessoriesOpen(
                                                (currentValue) => !currentValue,
                                            )
                                        }
                                        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-black uppercase tracking-[0.16em]"
                                    >
                                        {mobileAccessoriesLabel}
                                        <ChevronDown
                                            size={18}
                                            className={
                                                isMobileAccessoriesOpen
                                                    ? "rotate-180 transition"
                                                    : "transition"
                                            }
                                        />
                                    </button>

                                    {isMobileAccessoriesOpen && (
                                        <div className="max-h-80 overflow-y-auto border-t border-neutral-200 px-4 py-3">
                                            {hasAccessoriesMenuItems ? (
                                                <div className="space-y-2">
                                                    {accessoriesMenuItems.map(
                                                        (item) => (
                                                            <Link
                                                                key={item.id}
                                                                href={item.href}
                                                                onClick={() =>
                                                                    setIsMenuOpen(
                                                                        false,
                                                                    )
                                                                }
                                                                className="block rounded-2xl bg-white px-4 py-4 text-sm font-black uppercase tracking-[0.16em]"
                                                            >
                                                                {item.label}
                                                            </Link>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-neutral-500">
                                                    Aucun type d’accessoire
                                                    disponible.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <Link
                                    href="/#nouveautes"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block rounded-2xl bg-neutral-50 px-5 py-4 text-sm font-black uppercase tracking-[0.16em]"
                                >
                                    Nouveautés
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

            <SearchOverlay
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
            />
        </>
    );
}
