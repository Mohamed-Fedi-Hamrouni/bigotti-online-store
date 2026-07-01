"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getManagerDashboard } from "@/lib/api";
import type { ManagerDashboard } from "@/types/dashboard";

function formatPrice(value: number) {
    return `${value.toFixed(3)} TND`;
}

function getOrderStatusLabel(status: string) {
    const labels: Record<string, string> = {
        PENDING: "En attente",
        CONFIRMED: "Confirmée",
        PREPARING: "En préparation",
        SHIPPED: "Expédiée",
        DELIVERED: "Livrée",
        CANCELLED: "Annulée",
    };

    return labels[status] ?? status;
}

function getPaymentStatusLabel(status: string) {
    const labels: Record<string, string> = {
        UNPAID: "Non payé",
        PAID: "Payé",
        FAILED: "Échoué",
        REFUNDED: "Remboursé",
    };

    return labels[status] ?? status;
}

export default function ManagerDashboardPage() {
    const router = useRouter();

    const [dashboard, setDashboard] = useState<ManagerDashboard | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = window.localStorage.getItem("bigotti-admin-token");
        const rawUser = window.localStorage.getItem("bigotti-admin-user");

        if (!token || !rawUser) {
            router.push("/admin/login");
            return;
        }

        const user = JSON.parse(rawUser);

        if (user.role !== "MANAGER" && user.role !== "SUPER_ADMIN") {
            setError("Accès réservé au manager ou au super administrateur.");
            setIsLoading(false);
            return;
        }

        getManagerDashboard(token)
            .then(setDashboard)
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Erreur de chargement du dashboard.",
                );
            })
            .finally(() => setIsLoading(false));
    }, [router]);

    function logout() {
        window.localStorage.removeItem("bigotti-admin-token");
        window.localStorage.removeItem("bigotti-admin-user");
        router.push("/admin/login");
    }

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <header className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <Link href="/admin" className="flex items-center">
                        <img
                            src="/images/bigotti-logo.jpg"
                            alt="Bigotti Collection"
                            className="h-20 w-auto object-contain"
                        />
                    </Link>

                    <div className="flex items-center gap-6">
                        <Link
                            href="/"
                            className="text-sm font-medium text-neutral-600 hover:text-black"
                        >
                            Boutique
                        </Link>

                        <button
                            onClick={logout}
                            className="text-sm font-medium text-neutral-600 hover:text-black"
                        >
                            Déconnexion
                        </button>
                    </div>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-6 py-12">
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                            Manager
                        </p>

                        <h1 className="mt-2 text-4xl font-bold">
                            Dashboard boutique
                        </h1>

                        <p className="mt-3 text-neutral-600">
                            Vue globale des ventes, commandes et produits.
                        </p>
                    </div>

                    <Link
                        href="/admin"
                        className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold hover:border-black"
                    >
                        Retour administration
                    </Link>
                </div>

                {isLoading && (
                    <div className="rounded-3xl bg-white p-8 shadow-sm">
                        Chargement du dashboard...
                    </div>
                )}

                {error && (
                    <div className="rounded-3xl bg-red-50 p-8 text-red-700">
                        {error}
                    </div>
                )}

                {!isLoading && !error && dashboard && (
                    <>
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-3xl bg-white p-6 shadow-sm">
                                <p className="text-sm text-neutral-500">
                                    Chiffre d’affaires
                                </p>
                                <p className="mt-3 text-3xl font-bold">
                                    {formatPrice(
                                        dashboard.summary.totalRevenue,
                                    )}
                                </p>
                            </div>

                            <div className="rounded-3xl bg-white p-6 shadow-sm">
                                <p className="text-sm text-neutral-500">
                                    Commandes
                                </p>
                                <p className="mt-3 text-3xl font-bold">
                                    {dashboard.summary.ordersCount}
                                </p>
                            </div>

                            <div className="rounded-3xl bg-white p-6 shadow-sm">
                                <p className="text-sm text-neutral-500">
                                    Commandes en attente
                                </p>
                                <p className="mt-3 text-3xl font-bold">
                                    {dashboard.summary.pendingOrdersCount}
                                </p>
                            </div>

                            <div className="rounded-3xl bg-white p-6 shadow-sm">
                                <p className="text-sm text-neutral-500">
                                    Produits publiés
                                </p>
                                <p className="mt-3 text-3xl font-bold">
                                    {dashboard.summary.publishedProductsCount}/
                                    {dashboard.summary.productsCount}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_420px]">
                            <div className="space-y-8">
                                <section className="rounded-[2rem] bg-white p-6 shadow-sm">
                                    <h2 className="text-2xl font-bold">
                                        Meilleures ventes
                                    </h2>

                                    {dashboard.bestSellers.length === 0 ? (
                                        <p className="mt-4 text-neutral-500">
                                            Aucune vente pour le moment.
                                        </p>
                                    ) : (
                                        <div className="mt-5 space-y-3">
                                            {dashboard.bestSellers.map(
                                                (product) => (
                                                    <div
                                                        key={
                                                            product.productReference
                                                        }
                                                        className="flex items-center justify-between rounded-2xl bg-neutral-50 p-4"
                                                    >
                                                        <div>
                                                            <p className="font-bold">
                                                                {
                                                                    product.productName
                                                                }
                                                            </p>
                                                            <p className="mt-1 text-sm text-neutral-500">
                                                                Réf.{" "}
                                                                {
                                                                    product.productReference
                                                                }
                                                            </p>
                                                        </div>

                                                        <div className="text-right">
                                                            <p className="font-bold">
                                                                {
                                                                    product.quantitySold
                                                                }{" "}
                                                                vendu(s)
                                                            </p>
                                                            <p className="mt-1 text-sm text-neutral-500">
                                                                {formatPrice(
                                                                    product.revenue,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </section>

                                <section className="rounded-[2rem] bg-white p-6 shadow-sm">
                                    <h2 className="text-2xl font-bold">
                                        Ventes par catégorie
                                    </h2>

                                    {dashboard.salesByCategory.length === 0 ? (
                                        <p className="mt-4 text-neutral-500">
                                            Aucune donnée par catégorie.
                                        </p>
                                    ) : (
                                        <div className="mt-5 space-y-3">
                                            {dashboard.salesByCategory.map(
                                                (category) => (
                                                    <div
                                                        key={
                                                            category.categorySlug
                                                        }
                                                        className="rounded-2xl bg-neutral-50 p-4"
                                                    >
                                                        <div className="flex items-center justify-between gap-4">
                                                            <p className="font-bold">
                                                                {
                                                                    category.categoryName
                                                                }
                                                            </p>

                                                            <p className="font-bold">
                                                                {formatPrice(
                                                                    category.revenue,
                                                                )}
                                                            </p>
                                                        </div>

                                                        <p className="mt-1 text-sm text-neutral-500">
                                                            {
                                                                category.quantitySold
                                                            }{" "}
                                                            article(s) vendu(s)
                                                        </p>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </section>
                            </div>

                            <div className="space-y-8">
                                <section className="rounded-[2rem] bg-white p-6 shadow-sm">
                                    <h2 className="text-2xl font-bold">
                                        Dernières commandes
                                    </h2>

                                    {dashboard.latestOrders.length === 0 ? (
                                        <p className="mt-4 text-neutral-500">
                                            Aucune commande récente.
                                        </p>
                                    ) : (
                                        <div className="mt-5 space-y-3">
                                            {dashboard.latestOrders.map(
                                                (order) => (
                                                    <div
                                                        key={order.orderNumber}
                                                        className="rounded-2xl bg-neutral-50 p-4"
                                                    >
                                                        <div className="flex items-center justify-between gap-4">
                                                            <p className="font-bold">
                                                                {
                                                                    order.orderNumber
                                                                }
                                                            </p>

                                                            <p className="font-bold">
                                                                {formatPrice(
                                                                    order.total,
                                                                )}
                                                            </p>
                                                        </div>

                                                        <p className="mt-2 text-sm text-neutral-600">
                                                            {order.customerName}{" "}
                                                            — {order.itemsCount}{" "}
                                                            article(s)
                                                        </p>

                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700">
                                                                {getOrderStatusLabel(
                                                                    order.orderStatus,
                                                                )}
                                                            </span>

                                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700">
                                                                {getPaymentStatusLabel(
                                                                    order.paymentStatus,
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </section>

                                <section className="rounded-[2rem] bg-white p-6 shadow-sm">
                                    <h2 className="text-2xl font-bold">
                                        Faible stock
                                    </h2>

                                    {dashboard.lowStockProducts.length === 0 ? (
                                        <p className="mt-4 text-neutral-500">
                                            Aucun produit en faible stock.
                                        </p>
                                    ) : (
                                        <div className="mt-5 space-y-3">
                                            {dashboard.lowStockProducts.map(
                                                (product, index) => (
                                                    <div
                                                        key={`${product.productReference}-${product.size}-${index}`}
                                                        className="rounded-2xl bg-red-50 p-4 text-red-800"
                                                    >
                                                        <p className="font-bold">
                                                            {product.productName ??
                                                                "Produit"}
                                                        </p>

                                                        <p className="mt-1 text-sm">
                                                            Taille{" "}
                                                            {product.size} —
                                                            Stock{" "}
                                                            {
                                                                product.stockQuantity
                                                            }
                                                        </p>

                                                        {product.productReference && (
                                                            <p className="mt-1 text-xs opacity-80">
                                                                Réf.{" "}
                                                                {
                                                                    product.productReference
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}
