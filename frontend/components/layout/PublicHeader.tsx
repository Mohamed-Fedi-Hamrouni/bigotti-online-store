"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

export function PublicHeader() {
    const { itemsCount } = useCart();

    return (
        <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <Link href="/" className="flex items-center">
                    <img
                        src="/images/bigotti-logo.jpg"
                        alt="Bigotti Collection"
                        className="h-16 w-auto object-contain md:h-20"
                    />
                </Link>

                <nav className="hidden items-center gap-8 text-sm font-medium text-neutral-700 md:flex">
                    <Link href="/#boutique" className="hover:text-black">
                        Boutique
                    </Link>

                    <Link href="/#collections" className="hover:text-black">
                        Collections
                    </Link>

                    <Link href="/#services" className="hover:text-black">
                        Services
                    </Link>

                    <Link href="/#contact" className="hover:text-black">
                        Contact
                    </Link>
                </nav>

                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/login"
                        className="hidden rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-500 transition hover:border-black hover:text-black md:inline-flex"
                    >
                        Admin
                    </Link>

                    <Link
                        href="/panier"
                        className="relative rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-neutral-800"
                    >
                        Panier
                        {itemsCount > 0 && (
                            <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                                {itemsCount}
                            </span>
                        )}
                    </Link>
                </div>
            </div>
        </header>
    );
}
