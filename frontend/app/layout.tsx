import type { Metadata } from "next";
import { CartProvider } from "@/components/cart/CartProvider";
import { FavoritesProvider } from "@/components/favorites/FavoritesProvider";
import "./globals.css";

export const metadata: Metadata = {
    title: "Bigotti Collection | Boutique en ligne",
    description: "Boutique en ligne Bigotti Collection pour homme.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr" suppressHydrationWarning>
            <body suppressHydrationWarning>
                <CartProvider>
                    <FavoritesProvider>{children}</FavoritesProvider>
                </CartProvider>
            </body>
        </html>
    );
}
