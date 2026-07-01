"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, PackageCheck, UserRound } from "lucide-react";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";

export default function CustomerAccountPage() {
    const router = useRouter();
    const { customer, isLoading, isAuthenticated, logoutCustomer } =
        useCustomerAuth();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/compte/login");
        }
    }, [isLoading, isAuthenticated, router]);

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
                                    utiliser votre numéro de commande et votre
                                    téléphone pour suivre vos commandes.
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
                        </div>
                    </div>
                )}
            </section>

            <PublicFooter />
        </main>
    );
}
