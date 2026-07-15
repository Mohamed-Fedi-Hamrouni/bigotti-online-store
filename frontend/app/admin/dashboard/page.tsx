"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    Clock3,
    CreditCard,
    Package,
    PackageCheck,
    ShoppingBag,
    TrendingUp,
    Users,
    XCircle,
} from "lucide-react";
import { getManagerDashboard } from "@/lib/api";
import type { ManagerDashboard } from "@/types/dashboard";

function formatPrice(value: number | string | null | undefined) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return "0.000 TND";
    }

    return `${numericValue.toFixed(3)} TND`;
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
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

function getOrderStatusClassName(status: string) {
    if (status === "CANCELLED") {
        return "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700";
    }

    if (status === "DELIVERED") {
        return "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700";
    }

    if (status === "PENDING") {
        return "rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700";
    }

    return "rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-700";
}

function getPaymentStatusClassName(status: string) {
    if (status === "PAID") {
        return "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700";
    }

    if (status === "UNPAID") {
        return "rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700";
    }

    if (status === "FAILED") {
        return "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700";
    }

    return "rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-700";
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
            const timeoutId = window.setTimeout(() => {
                setError("Accès réservé au manager ou au super administrateur.");
                setIsLoading(false);
            }, 0);
            return () => window.clearTimeout(timeoutId);
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
                            type="button"
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

                        <h1 className="mt-2 text-4xl font-black">
                            Dashboard boutique
                        </h1>

                        <p className="mt-3 text-neutral-600">
                            Vue globale des ventes, commandes, clients, stocks
                            et produits.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/admin"
                            className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold hover:border-black"
                        >
                            Retour administration
                        </Link>

                        <Link
                            href="/admin/commandes"
                            className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
                        >
                            Commandes
                        </Link>
                    </div>
                </div>

                {isLoading && (
                    <div className="rounded-3xl bg-white p-8 shadow-sm">
                        Chargement du dashboard...
                    </div>
                )}

                {error && (
                    <div className="rounded-3xl bg-red-50 p-8 text-sm font-semibold text-red-700">
                        {error}
                    </div>
                )}

                {!isLoading && !error && dashboard && (
                    <div className="space-y-8">
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-3xl bg-black p-6 text-white shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-neutral-300">
                                        CA hors annulation
                                    </p>

                                    <TrendingUp size={26} />
                                </div>

                                <p className="mt-3 text-3xl font-black">
                                    {formatPrice(
                                        dashboard.summary.totalRevenue,
                                    )}
                                </p>
                            </div>

                            <div className="rounded-3xl bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-neutral-500">
                                        Commandes
                                    </p>

                                    <ShoppingBag size={26} />
                                </div>

                                <p className="mt-3 text-3xl font-black">
                                    {dashboard.summary.ordersCount}
                                </p>

                                <p className="mt-2 text-sm text-neutral-500">
                                    {dashboard.summary.pendingOrdersCount} en
                                    attente
                                </p>
                            </div>

                            <div className="rounded-3xl bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-neutral-500">
                                        Clients
                                    </p>

                                    <Users size={26} />
                                </div>

                                <p className="mt-3 text-3xl font-black">
                                    {dashboard.summary.customersCount}
                                </p>

                                <p className="mt-2 text-sm text-neutral-500">
                                    {dashboard.summary.activeCustomersCount}{" "}
                                    actifs /{" "}
                                    {dashboard.summary.inactiveCustomersCount}{" "}
                                    désactivés
                                </p>
                            </div>

                            <div className="rounded-3xl bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-neutral-500">
                                        Produits
                                    </p>

                                    <Package size={26} />
                                </div>

                                <p className="mt-3 text-3xl font-black">
                                    {dashboard.summary.publishedProductsCount}/
                                    {dashboard.summary.productsCount}
                                </p>

                                <p className="mt-2 text-sm text-neutral-500">
                                    publiés / total
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                            <Link
                                href="/admin/commandes"
                                className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-neutral-500">
                                        En attente
                                    </p>

                                    <Clock3 size={25} />
                                </div>

                                <p className="mt-3 text-3xl font-black text-yellow-700">
                                    {dashboard.summary.pendingOrdersCount}
                                </p>
                            </Link>

                            <Link
                                href="/admin/commandes"
                                className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-neutral-500">
                                        Livrées
                                    </p>

                                    <CheckCircle2 size={25} />
                                </div>

                                <p className="mt-3 text-3xl font-black text-green-700">
                                    {dashboard.summary.deliveredOrdersCount}
                                </p>
                            </Link>

                            <Link
                                href="/admin/commandes"
                                className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-neutral-500">
                                        Annulées
                                    </p>

                                    <XCircle size={25} />
                                </div>

                                <p className="mt-3 text-3xl font-black text-red-700">
                                    {dashboard.summary.cancelledOrdersCount}
                                </p>
                            </Link>

                            <Link
                                href="/admin/produits"
                                className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-neutral-500">
                                        Stock faible / rupture
                                    </p>

                                    <AlertTriangle size={25} />
                                </div>

                                <p className="mt-3 text-3xl font-black text-red-700">
                                    {dashboard.summary.lowStockVariantsCount +
                                        dashboard.summary
                                            .outOfStockVariantsCount}
                                </p>
                            </Link>
                        </div>

                        <div className="grid gap-8 xl:grid-cols-[1fr_420px]">
                            <div className="space-y-8">
                                <section className="rounded-[2rem] bg-white p-6 shadow-sm">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-2xl font-black">
                                                Pipeline commandes
                                            </h2>

                                            <p className="mt-1 text-sm text-neutral-500">
                                                Répartition opérationnelle des
                                                commandes.
                                            </p>
                                        </div>

                                        <BarChart3 size={28} />
                                    </div>

                                    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        <div className="rounded-2xl bg-yellow-50 p-4 text-yellow-800">
                                            <p className="text-sm font-bold">
                                                En attente
                                            </p>

                                            <p className="mt-1 text-2xl font-black">
                                                {
                                                    dashboard.summary
                                                        .pendingOrdersCount
                                                }
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-neutral-50 p-4">
                                            <p className="text-sm font-bold">
                                                Confirmées
                                            </p>

                                            <p className="mt-1 text-2xl font-black">
                                                {
                                                    dashboard.summary
                                                        .confirmedOrdersCount
                                                }
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-neutral-50 p-4">
                                            <p className="text-sm font-bold">
                                                Préparation
                                            </p>

                                            <p className="mt-1 text-2xl font-black">
                                                {
                                                    dashboard.summary
                                                        .preparingOrdersCount
                                                }
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-neutral-50 p-4">
                                            <p className="text-sm font-bold">
                                                Expédiées
                                            </p>

                                            <p className="mt-1 text-2xl font-black">
                                                {
                                                    dashboard.summary
                                                        .shippedOrdersCount
                                                }
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-green-50 p-4 text-green-800">
                                            <p className="text-sm font-bold">
                                                Livrées
                                            </p>

                                            <p className="mt-1 text-2xl font-black">
                                                {
                                                    dashboard.summary
                                                        .deliveredOrdersCount
                                                }
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-red-50 p-4 text-red-800">
                                            <p className="text-sm font-bold">
                                                Annulées
                                            </p>

                                            <p className="mt-1 text-2xl font-black">
                                                {
                                                    dashboard.summary
                                                        .cancelledOrdersCount
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-[2rem] bg-white p-6 shadow-sm">
                                    <h2 className="text-2xl font-black">
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
                                                    <Link
                                                        key={
                                                            product.productReference
                                                        }
                                                        href={`/admin/produits/${product.productId}/modifier`}
                                                        className="flex flex-col justify-between gap-4 rounded-2xl bg-neutral-50 p-4 transition hover:bg-neutral-100 md:flex-row md:items-center"
                                                    >
                                                        <div>
                                                            <p className="font-black">
                                                                {
                                                                    product.productName
                                                                }
                                                            </p>

                                                            <p className="mt-1 text-sm text-neutral-500">
                                                                Réf.{" "}
                                                                {
                                                                    product.productReference
                                                                }{" "}
                                                                —{" "}
                                                                {
                                                                    product.categoryName
                                                                }
                                                            </p>
                                                        </div>

                                                        <div className="text-left md:text-right">
                                                            <p className="font-black">
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
                                                    </Link>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </section>

                                <section className="rounded-[2rem] bg-white p-6 shadow-sm">
                                    <h2 className="text-2xl font-black">
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
                                                            <p className="font-black">
                                                                {
                                                                    category.categoryName
                                                                }
                                                            </p>

                                                            <p className="font-black">
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
                                    <h2 className="text-2xl font-black">
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
                                                    <Link
                                                        key={order.id}
                                                        href={`/admin/commandes/${order.id}`}
                                                        className={
                                                            order.orderStatus ===
                                                            "CANCELLED"
                                                                ? "block rounded-2xl border border-red-100 bg-red-50 p-4 text-red-900 transition hover:bg-red-100"
                                                                : "block rounded-2xl bg-neutral-50 p-4 transition hover:bg-neutral-100"
                                                        }
                                                    >
                                                        <div className="flex items-center justify-between gap-4">
                                                            <p className="font-black">
                                                                {
                                                                    order.orderNumber
                                                                }
                                                            </p>

                                                            <p
                                                                className={
                                                                    order.orderStatus ===
                                                                    "CANCELLED"
                                                                        ? "font-black line-through"
                                                                        : "font-black"
                                                                }
                                                            >
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

                                                        <p className="mt-1 text-xs text-neutral-500">
                                                            {formatDate(
                                                                order.createdAt,
                                                            )}
                                                        </p>

                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <span
                                                                className={getOrderStatusClassName(
                                                                    order.orderStatus,
                                                                )}
                                                            >
                                                                {getOrderStatusLabel(
                                                                    order.orderStatus,
                                                                )}
                                                            </span>

                                                            <span
                                                                className={getPaymentStatusClassName(
                                                                    order.paymentStatus,
                                                                )}
                                                            >
                                                                {getPaymentStatusLabel(
                                                                    order.paymentStatus,
                                                                )}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </section>

                                <section className="rounded-[2rem] bg-white p-6 shadow-sm">
                                    <div className="flex items-center justify-between gap-4">
                                        <h2 className="text-2xl font-black">
                                            Paiements
                                        </h2>

                                        <CreditCard size={26} />
                                    </div>

                                    <div className="mt-5 grid gap-4">
                                        <div className="rounded-2xl bg-green-50 p-5 text-green-800">
                                            <p className="text-sm font-bold">
                                                Payées
                                            </p>

                                            <p className="mt-1 text-3xl font-black">
                                                {
                                                    dashboard.summary
                                                        .paidOrdersCount
                                                }
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-yellow-50 p-5 text-yellow-800">
                                            <p className="text-sm font-bold">
                                                Non payées
                                            </p>

                                            <p className="mt-1 text-3xl font-black">
                                                {
                                                    dashboard.summary
                                                        .unpaidOrdersCount
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-[2rem] bg-white p-6 shadow-sm">
                                    <div className="flex items-center justify-between gap-4">
                                        <h2 className="text-2xl font-black">
                                            Catalogue
                                        </h2>

                                        <PackageCheck size={26} />
                                    </div>

                                    <div className="mt-5 grid gap-4">
                                        <div className="rounded-2xl bg-green-50 p-5 text-green-800">
                                            <p className="text-sm font-bold">
                                                Publiés
                                            </p>

                                            <p className="mt-1 text-3xl font-black">
                                                {
                                                    dashboard.summary
                                                        .publishedProductsCount
                                                }
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-yellow-50 p-5 text-yellow-800">
                                            <p className="text-sm font-bold">
                                                Brouillons
                                            </p>

                                            <p className="mt-1 text-3xl font-black">
                                                {
                                                    dashboard.summary
                                                        .draftProductsCount
                                                }
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-red-50 p-5 text-red-800">
                                            <p className="text-sm font-bold">
                                                Archivés
                                            </p>

                                            <p className="mt-1 text-3xl font-black">
                                                {
                                                    dashboard.summary
                                                        .archivedProductsCount
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-[2rem] bg-white p-6 shadow-sm">
                                    <h2 className="text-2xl font-black">
                                        Alertes stock
                                    </h2>

                                    {dashboard.lowStockProducts.length === 0 ? (
                                        <p className="mt-4 text-neutral-500">
                                            Aucun produit en stock faible.
                                        </p>
                                    ) : (
                                        <div className="mt-5 space-y-3">
                                            {dashboard.lowStockProducts.map(
                                                (product) => (
                                                    <Link
                                                        key={product.variantId}
                                                        href={`/admin/produits/${product.productId}/modifier`}
                                                        className={
                                                            product.stockQuantity <=
                                                            0
                                                                ? "block rounded-2xl bg-red-50 p-4 text-red-800 transition hover:bg-red-100"
                                                                : "block rounded-2xl bg-orange-50 p-4 text-orange-800 transition hover:bg-orange-100"
                                                        }
                                                    >
                                                        <p className="font-black">
                                                            {
                                                                product.productName
                                                            }
                                                        </p>

                                                        <p className="mt-1 text-sm">
                                                            {product.color} /
                                                            Taille{" "}
                                                            {product.size} —
                                                            Stock{" "}
                                                            {
                                                                product.stockQuantity
                                                            }
                                                        </p>

                                                        <p className="mt-1 text-xs opacity-80">
                                                            Réf.{" "}
                                                            {
                                                                product.productReference
                                                            }{" "}
                                                            —{" "}
                                                            {
                                                                product.categoryName
                                                            }
                                                        </p>
                                                    </Link>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}
