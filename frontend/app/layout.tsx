import type { Metadata } from "next";
import { CartProvider } from "@/components/cart/CartProvider";
import { CustomerAuthProvider } from "@/components/customer-auth/CustomerAuthProvider";
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
                    <FavoritesProvider>
                        <CustomerAuthProvider>{children}</CustomerAuthProvider>
                    </FavoritesProvider>
                </CartProvider>
            </body>
        </html>
    );
}
