"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const categories = [
    {
        title: "Chemises",
        subtitle: "Élégance quotidienne",
        href: "/#boutique",
        image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c",
    },
    {
        title: "Costumes",
        subtitle: "Business & cérémonie",
        href: "/#boutique",
        image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35",
    },
    {
        title: "Chaussures",
        subtitle: "Finition du look",
        href: "/#boutique",
        image: "https://images.unsplash.com/photo-1549298916-b41d501d3772",
    },
];

export function CategoryShowcase() {
    return (
        <section id="collections" className="bg-white">
            <div className="mx-auto max-w-7xl px-6 py-16">
                <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                            Collections
                        </p>
                        <h2 className="mt-3 text-4xl font-black uppercase">
                            Explorer par style
                        </h2>
                    </div>

                    <Link
                        href="/#boutique"
                        className="text-sm font-bold uppercase tracking-[0.16em] text-neutral-600 hover:text-black"
                    >
                        Voir tous les produits
                    </Link>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                    {categories.map((category, index) => (
                        <motion.div
                            key={category.title}
                            initial={{ y: 50, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.65, delay: index * 0.12 }}
                        >
                            <Link
                                href={category.href}
                                className="group relative block h-[420px] overflow-hidden rounded-[2rem] bg-neutral-900"
                            >
                                <img
                                    src={category.image}
                                    alt={category.title}
                                    className="h-full w-full object-cover opacity-75 transition duration-700 group-hover:scale-110 group-hover:opacity-90"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                                <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
                                    <p className="text-sm uppercase tracking-[0.25em] text-neutral-300">
                                        {category.subtitle}
                                    </p>
                                    <h3 className="mt-3 text-3xl font-black uppercase">
                                        {category.title}
                                    </h3>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
