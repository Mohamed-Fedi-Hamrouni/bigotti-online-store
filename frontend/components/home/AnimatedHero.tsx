"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BadgePercent, CreditCard, Truck } from "lucide-react";
import type { Product } from "@/types/product";

type AnimatedHeroProps = {
    featuredProduct?: Product;
};

export function AnimatedHero({ featuredProduct }: AnimatedHeroProps) {
    const featuredImage =
        featuredProduct?.images.find((image) => image.isMain) ??
        featuredProduct?.images[0];

    return (
        <section className="relative overflow-hidden bg-neutral-950 text-white">
            <motion.div
                initial={{ scale: 1.12, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.18 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,white,transparent_35%)]"
            />

            <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="z-10">
                    <motion.p
                        initial={{ y: 24, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6 }}
                        className="text-sm uppercase tracking-[0.4em] text-neutral-400"
                    >
                        Bigotti Collection
                    </motion.p>

                    <motion.h1
                        initial={{ y: 32, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.75, delay: 0.1 }}
                        className="mt-6 max-w-4xl text-5xl font-black uppercase leading-[0.9] tracking-tight md:text-7xl xl:text-8xl"
                    >
                        Nouvelle allure masculine
                    </motion.h1>

                    <motion.p
                        initial={{ y: 28, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.75, delay: 0.2 }}
                        className="mt-7 max-w-2xl text-lg leading-8 text-neutral-300"
                    >
                        Chemises, costumes, pantalons, chaussures et accessoires
                        pour un style moderne, élégant et affirmé.
                    </motion.p>

                    <motion.div
                        initial={{ y: 28, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.75, delay: 0.3 }}
                        className="mt-9 flex flex-wrap gap-4"
                    >
                        <Link
                            href="/#boutique"
                            className="group inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-black transition hover:bg-neutral-200"
                        >
                            Découvrir
                            <ArrowRight
                                size={18}
                                className="transition group-hover:translate-x-1"
                            />
                        </Link>

                        <Link
                            href="/#promotions"
                            className="inline-flex items-center gap-3 rounded-full border border-white/20 px-7 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:border-white hover:bg-white hover:text-black"
                        >
                            Promotions
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ y: 28, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.75, delay: 0.42 }}
                        className="mt-12 grid max-w-2xl gap-4 sm:grid-cols-3"
                    >
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                            <Truck size={24} />
                            <p className="mt-3 font-bold">Livraison</p>
                            <p className="mt-1 text-sm text-neutral-400">
                                à domicile
                            </p>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                            <CreditCard size={24} />
                            <p className="mt-3 font-bold">Paiement</p>
                            <p className="mt-1 text-sm text-neutral-400">
                                à la livraison
                            </p>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                            <BadgePercent size={24} />
                            <p className="mt-3 font-bold">Offres</p>
                            <p className="mt-1 text-sm text-neutral-400">
                                selon collection
                            </p>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ x: 80, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
                    className="relative"
                >
                    <div className="absolute -left-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

                    <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-white/5 p-4 shadow-2xl">
                        <motion.div
                            animate={{ scale: [1, 1.04, 1] }}
                            transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                            className="overflow-hidden rounded-[2.4rem] bg-neutral-900"
                        >
                            {featuredImage ? (
                                <img
                                    src={featuredImage.url}
                                    alt={
                                        featuredImage.altText ??
                                        featuredProduct?.name ??
                                        "Bigotti Collection"
                                    }
                                    className="h-[620px] w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-[620px] items-center justify-center text-neutral-500">
                                    Bigotti Collection
                                </div>
                            )}
                        </motion.div>

                        {featuredProduct && (
                            <motion.div
                                initial={{ y: 40, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.7, delay: 0.65 }}
                                className="absolute bottom-8 left-8 right-8 rounded-3xl bg-white/95 p-5 text-black shadow-xl backdrop-blur"
                            >
                                <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                                    Sélection du moment
                                </p>

                                <div className="mt-2 flex items-end justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-black">
                                            {featuredProduct.name}
                                        </h2>
                                        <p className="mt-1 text-sm text-neutral-500">
                                            Réf. {featuredProduct.reference}
                                        </p>
                                    </div>

                                    <p className="shrink-0 text-lg font-black">
                                        {featuredProduct.finalPrice.toFixed(3)}{" "}
                                        TND
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
