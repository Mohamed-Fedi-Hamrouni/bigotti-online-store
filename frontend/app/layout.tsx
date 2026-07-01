import type { Metadata } from "next";
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
        <html lang="fr">
            <body>{children}</body>
        </html>
    );
}
