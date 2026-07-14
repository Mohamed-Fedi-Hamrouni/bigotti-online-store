"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SessionManager } from "@/components/auth/SessionManager";

export default function AdminSecurityPage() {
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

                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-3 text-sm font-black transition hover:border-black"
                    >
                        <ArrowLeft size={17} />
                        Administration
                    </Link>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-6 py-12">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-neutral-500">
                    Sécurité administrateur
                </p>

                <h1 className="mt-3 text-4xl font-black md:text-5xl">
                    Sessions et appareils
                </h1>

                <p className="mt-4 max-w-2xl text-neutral-600">
                    Contrôlez les appareils connectés à votre compte
                    d’administration et révoquez toute session suspecte.
                </p>

                <div className="mt-10">
                    <SessionManager scope="admin" />
                </div>
            </section>
        </main>
    );
}
