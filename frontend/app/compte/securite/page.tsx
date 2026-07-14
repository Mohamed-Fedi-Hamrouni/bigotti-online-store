"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SessionManager } from "@/components/auth/SessionManager";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";

export default function CustomerSecurityPage() {
    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <PublicHeader />

            <section className="bg-neutral-950 text-white">
                <div className="mx-auto max-w-7xl px-6 py-14">
                    <Link
                        href="/compte"
                        className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-neutral-300 transition hover:text-white"
                    >
                        <ArrowLeft size={17} />
                        Retour au compte
                    </Link>

                    <p className="mt-8 text-sm uppercase tracking-[0.35em] text-neutral-400">
                        Sécurité
                    </p>

                    <h1 className="mt-4 text-5xl font-black uppercase leading-none md:text-7xl">
                        Mes appareils
                    </h1>

                    <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-300">
                        Gérez les appareils connectés à votre compte client et
                        révoquez immédiatement toute session inconnue.
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-12">
                <SessionManager scope="customer" />
            </section>

            <PublicFooter />
        </main>
    );
}
