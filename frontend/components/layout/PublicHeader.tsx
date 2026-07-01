"use client";

import Link from "next/link";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { useFavorites } from "@/components/favorites/FavoritesProvider";
import { SearchOverlay } from "@/components/search/SearchOverlay";

const menuItems = [
    { label: "Nouveautés", href: "/#nouveautes" },
    { label: "Boutique", href: "/boutique" },
    { label: "Haut", href: "/boutique" },
    { label: "Bas", href: "/boutique" },
    { label: "Costumes", href: "/boutique" },
    { label: "Chaussures", href: "/boutique" },
    { label: "Accessoires", href: "/boutique" },
    { label: "Promotions", href: "/#promotions" },
];

export function PublicHeader() {
    const { itemsCount } = useCart();
    const { favoritesCount } = useFavorites();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    return (
        <>
            <header className="sticky top-0 z-50 bg-white text-neutral-950 shadow-sm">
                <div className="bg-neutral-950 px-6 py-2 text-center text-xs font-medium uppercase tracking-[0.2em] text-white">
                    Livraison à domicile — Paiement à la livraison disponible
                </div>

                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen(true)}
                        className="rounded-full border border-neutral-200 p-3 md:hidden"
                        aria-label="Ouvrir le menu"
                    >
                        <Menu size={20} />
                    </button>

                    <Link href="/" className="flex items-center">
                        <img
                            src="/images/bigotti-logo.jpg"
                            alt="Bigotti Collection"
                            className="h-14 w-auto object-contain md:h-20"
                        />
                    </Link>

                    <nav className="hidden items-center gap-7 text-sm font-semibold uppercase tracking-[0.12em] text-neutral-700 lg:flex">
                        {menuItems.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="transition hover:text-black"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsSearchOpen(true)}
                            className="hidden rounded-full border border-neutral-200 p-3 transition hover:border-black md:inline-flex"
                            aria-label="Recherche"
                        >
                            <Search size={19} />
                        </button>

                        <Link
                            href="/favoris"
                            className="relative hidden rounded-full border border-neutral-200 p-3 transition hover:border-black md:inline-flex"
                            aria-label="Favoris"
                        >
                            <Heart size={19} />

                            {favoritesCount > 0 && (
                                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                                    {favoritesCount}
                                </span>
                            )}
                        </Link>

                        <Link
                            href="/admin/login"
                            className="hidden rounded-full border border-neutral-200 p-3 transition hover:border-black md:inline-flex"
                            aria-label="Compte"
                        >
                            <UserRound size={19} />
                        </Link>

                        <Link
                            href="/panier"
                            className="relative rounded-full bg-black p-3 text-white transition hover:bg-neutral-800"
                            aria-label="Panier"
                        >
                            <ShoppingBag size={20} />

                            {itemsCount > 0 && (
                                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                                    {itemsCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                {isMenuOpen && (
                    <div className="fixed inset-0 z-50 bg-black/40 lg:hidden">
                        <div className="h-full w-80 bg-white p-6 shadow-2xl">
                            <div className="flex items-center justify-between">
                                <img
                                    src="/images/bigotti-logo.jpg"
                                    alt="Bigotti Collection"
                                    className="h-16 w-auto object-contain"
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

                            <nav className="mt-8 space-y-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setIsSearchOpen(true);
                                    }}
                                    className="block w-full border-b border-neutral-100 pb-4 text-left text-sm font-bold uppercase tracking-[0.14em]"
                                >
                                    Recherche
                                </button>

                                {menuItems.map((item) => (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        onClick={() => setIsMenuOpen(false)}
                                        className="block border-b border-neutral-100 pb-4 text-sm font-bold uppercase tracking-[0.14em]"
                                    >
                                        {item.label}
                                    </Link>
                                ))}

                                <Link
                                    href="/favoris"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block border-b border-neutral-100 pb-4 text-sm font-bold uppercase tracking-[0.14em]"
                                >
                                    Favoris ({favoritesCount})
                                </Link>

                                <Link
                                    href="/admin/login"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block pt-4 text-sm font-bold uppercase tracking-[0.14em] text-neutral-500"
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
