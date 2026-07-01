"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, PackageCheck, UserRound } from "lucide-react";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { getCustomerOrders } from "@/lib/api";
import type { AdminOrder } from "@/types/order";

function formatPrice(value: number | string | null | undefined) {
    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
        return "0.000 TND";
    }

    return `${numericValue.toFixed(3)} TND`;
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

export default function CustomerAccountPage() {
    const router = useRouter();
    const { customer, token, isLoading, isAuthenticated, logoutCustomer } =
        useCustomerAuth();

    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError] = useState("");

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/compte/login");
        }
    }, [isLoading, isAuthenticated, router]);

    useEffect(() => {
        if (!token || !isAuthenticated) {
            return;
        }

        setOrdersLoading(true);
        setOrdersError("");

        getCustomerOrders(token)
            .then(setOrders)
            .catch((err) => {
                setOrdersError(
                    err instanceof Error
                        ? err.message
                        : "Erreur lors du chargement des commandes.",
                );
            })
            .finally(() => setOrdersLoading(false));
    }, [token, isAuthenticated]);

    function handleLogout() {
        logoutCustomer();
        router.push("/");
    }

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <PublicHeader />

            <section className="bg-neutral-950 text-white">
                <div className="mx-auto max-w-7xl px-6 py-16">
                    <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">
                        Bigotti Collection
                    </p>

                    <h1 className="mt-5 max-w-4xl text-5xl font-black uppercase leading-none md:text-7xl">
                        Mon compte
                    </h1>

                    <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
                        Retrouvez vos informations client et suivez vos
                        commandes Bigotti.
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-12">
                {isLoading && (
                    <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                        Chargement du compte...
                    </div>
                )}

                {!isLoading && customer && (
                    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
                        <aside className="h-fit rounded-[2rem] bg-white p-8 shadow-sm">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
                                <UserRound size={30} />
                            </div>

                            <h2 className="mt-6 text-3xl font-black">
                                {customer.fullName}
                            </h2>

                            <p className="mt-2 text-neutral-500">
                                {customer.email}
                            </p>

                            <p className="mt-1 text-neutral-500">
                                {customer.phone}
                            </p>

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-neutral-300 px-6 py-3 text-sm font-bold transition hover:border-red-600 hover:text-red-600"
                            >
                                <LogOut size={18} />
                                Déconnexion
                            </button>
                        </aside>

                        <div className="space-y-6">
                            <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                                <h2 className="text-3xl font-black">
                                    Bienvenue, {customer.fullName}
                                </h2>

                                <p className="mt-3 text-neutral-600">
                                    Votre compte client est actif. Vous pouvez
                                    consulter vos commandes et suivre leur état.
                                </p>
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <Link
                                    href="/suivi-commande"
                                    className="rounded-[2rem] bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <PackageCheck size={34} />

                                    <h3 className="mt-5 text-2xl font-black">
                                        Suivre une commande
                                    </h3>

                                    <p className="mt-3 text-neutral-600">
                                        Consultez l’état d’une commande avec son
                                        numéro et votre téléphone.
                                    </p>
                                </Link>

                                <Link
                                    href="/favoris"
                                    className="rounded-[2rem] bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <UserRound size={34} />

                                    <h3 className="mt-5 text-2xl font-black">
                                        Mes favoris
                                    </h3>

                                    <p className="mt-3 text-neutral-600">
                                        Retrouvez les articles que vous avez
                                        sauvegardés.
                                    </p>
                                </Link>
                            </div>

                            <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                                    <div>
                                        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                                            Historique
                                        </p>

                                        <h2 className="mt-2 text-3xl font-black">
                                            Mes commandes
                                        </h2>
                                    </div>

                                    <Link
                                        href="/boutique"
                                        className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
                                    >
                                        Commander encore
                                    </Link>
                                </div>

                                {ordersLoading && (
                                    <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-neutral-500">
                                        Chargement des commandes...
                                    </div>
                                )}

                                {ordersError && (
                                    <div className="mt-6 rounded-2xl bg-red-50 p-5 text-sm font-semibold text-red-700">
                                        {ordersError}
                                    </div>
                                )}

                                {!ordersLoading &&
                                    !ordersError &&
                                    orders.length === 0 && (
                                        <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-neutral-500">
                                            Vous n’avez pas encore de commande.
                                        </div>
                                    )}

                                {!ordersLoading &&
                                    !ordersError &&
                                    orders.length > 0 && (
                                        <div className="mt-6 space-y-4">
                                            {orders.map((order) => (
                                                <div
                                                    key={order.id}
                                                    className="rounded-3xl border border-neutral-200 p-5"
                                                >
                                                    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                                                        <div>
                                                            <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                                                                Commande
                                                            </p>

                                                            <h3 className="mt-1 text-2xl font-black">
                                                                {
                                                                    order.orderNumber
                                                                }
                                                            </h3>

                                                            <p className="mt-2 text-sm text-neutral-500">
                                                                {
                                                                    order.items
                                                                        .length
                                                                }{" "}
                                                                article(s) —
                                                                Statut :{" "}
                                                                <span className="font-bold text-neutral-950">
                                                                    {getOrderStatusLabel(
                                                                        order.orderStatus,
                                                                    )}
                                                                </span>
                                                            </p>
                                                        </div>

                                                        <div className="text-left md:text-right">
                                                            <p className="text-2xl font-black">
                                                                {formatPrice(
                                                                    order.total,
                                                                )}
                                                            </p>

                                                            <p className="mt-1 text-sm text-neutral-500">
                                                                {new Date(
                                                                    order.createdAt,
                                                                ).toLocaleDateString(
                                                                    "fr-FR",
                                                                )}
                                                            </p>

                                                            <Link
                                                                href={`/suivi-commande?orderNumber=${encodeURIComponent(
                                                                    order.orderNumber,
                                                                )}&phone=${encodeURIComponent(
                                                                    order.customerPhone,
                                                                )}`}
                                                                className="mt-4 inline-flex rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
                                                            >
                                                                Suivre
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <PublicFooter />
        </main>
    );
}
