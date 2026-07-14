import Link from "next/link";
import {
    ArrowRight,
    CreditCard,
    PackageCheck,
    Sparkles,
    Truck,
} from "lucide-react";
import type { Product } from "@/types/product";

type AnimatedHeroProps = {
    featuredProduct?: Product;
};

export function AnimatedHero({ featuredProduct }: AnimatedHeroProps) {
    const productHref = featuredProduct
        ? `/produit/${featuredProduct.slug}`
        : "/boutique";

    return (
        <section className="relative overflow-hidden bg-neutral-950 text-white">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[45%] top-0 h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-white/10 blur-[100px]" />
                <div className="absolute bottom-0 right-0 h-[220px] w-[220px] rounded-full bg-white/5 blur-[90px]" />
            </div>

            <div className="relative mx-auto max-w-7xl px-6 py-12 md:py-14">
                <div className="max-w-3xl">
                    <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.28em] text-neutral-300">
                        <Sparkles size={14} />
                        Bigotti Collection
                    </p>

                    <h1 className="mt-6 max-w-4xl text-4xl font-black uppercase leading-[0.95] tracking-tight md:text-6xl">
                        Nouvelle allure masculine
                    </h1>

                    <p className="mt-5 max-w-2xl text-sm leading-7 text-neutral-300 md:text-base">
                        Chemises, costumes, pantalons, chaussures et accessoires
                        pour un style moderne, élégant et affirmé.
                    </p>

                    <div className="mt-7 flex flex-wrap gap-3">
                        <Link
                            href="/boutique"
                            className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-neutral-200"
                        >
                            Découvrir
                            <ArrowRight size={15} />
                        </Link>

                        <Link
                            href="#promotions"
                            className="inline-flex items-center gap-3 rounded-full border border-white/20 px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:border-white hover:bg-white/5"
                        >
                            Promotions
                        </Link>

                        {featuredProduct && (
                            <Link
                                href={productHref}
                                className="inline-flex items-center gap-3 rounded-full border border-white/20 px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:border-white hover:bg-white/5"
                            >
                                Sélection
                            </Link>
                        )}
                    </div>

                    <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-5 text-xs text-neutral-400">
                        <div className="inline-flex items-center gap-2">
                            <Truck size={15} className="text-white" />
                            <span>Livraison à domicile</span>
                        </div>

                        <div className="inline-flex items-center gap-2">
                            <CreditCard size={15} className="text-white" />
                            <span>Paiement à la livraison</span>
                        </div>

                        <div className="inline-flex items-center gap-2">
                            <PackageCheck size={15} className="text-white" />
                            <span>Sélection Bigotti</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
