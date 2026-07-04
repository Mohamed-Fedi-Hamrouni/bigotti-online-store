import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatedHero } from "@/components/home/AnimatedHero";
import { CategoryShowcase } from "@/components/home/CategoryShowcase";
import { ProductCarousel } from "@/components/home/ProductCarousel";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { ProductCard } from "@/components/ProductCard";
import { getHomepageSaleCampaigns, getProducts } from "@/lib/api";
import type { SaleCampaign } from "@/types/product";

function formatMoney(value: number) {
    if (Number.isInteger(value)) {
        return `${value} TND`;
    }

    return `${value.toFixed(3)} TND`;
}

function getCampaignOfferLabel(campaign: SaleCampaign) {
    if (campaign.type === "REMISE_POURCENTAGE" && campaign.discountValue) {
        return `-${campaign.discountValue}%`;
    }

    if (campaign.type === "REMISE_MONTANT_FIXE" && campaign.discountValue) {
        return `-${formatMoney(Number(campaign.discountValue))}`;
    }

    if (
        campaign.type === "ACHETEZ_X_OBTENEZ_Y" &&
        campaign.buyQuantity &&
        campaign.freeQuantity
    ) {
        return `Achetez ${campaign.buyQuantity}, obtenez ${campaign.freeQuantity} offert`;
    }

    return "Événement spécial";
}

function getCampaignSmallLabel(campaign: SaleCampaign) {
    if (campaign.type === "REMISE_POURCENTAGE") {
        return "Remise immédiate";
    }

    if (campaign.type === "REMISE_MONTANT_FIXE") {
        return "Remise fixe";
    }

    if (campaign.type === "ACHETEZ_X_OBTENEZ_Y") {
        return "Offre spéciale";
    }

    return "Campagne Bigotti";
}

function CampaignMedia({
    campaign,
    offerLabel,
}: {
    campaign: SaleCampaign;
    offerLabel: string;
}) {
    if (!campaign.mediaUrl) {
        return (
            <div className="relative flex aspect-video h-full min-h-[320px] items-center justify-center rounded-[2rem] bg-white/10 text-sm font-bold uppercase tracking-[0.3em] text-white/60">
                Campagne Bigotti
                <div className="absolute left-5 top-5 rounded-2xl bg-white px-4 py-3 text-black shadow-2xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-500">
                        Offre
                    </p>

                    <p className="mt-1 text-2xl font-black leading-none">
                        {offerLabel}
                    </p>
                </div>
            </div>
        );
    }

    if (campaign.mediaType === "VIDEO") {
        return (
            <div className="relative">
                <video
                    src={campaign.mediaUrl}
                    className="h-full min-h-[320px] w-full rounded-[2rem] object-cover shadow-2xl"
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls={false}
                    suppressHydrationWarning
                />

                <div className="absolute left-5 top-5 rounded-2xl bg-white px-4 py-3 text-black shadow-2xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-500">
                        Offre
                    </p>

                    <p className="mt-1 text-2xl font-black leading-none">
                        {offerLabel}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            <img
                src={campaign.mediaUrl}
                alt={campaign.heroTitle ?? campaign.name}
                className="h-full min-h-[320px] w-full rounded-[2rem] object-cover shadow-2xl"
            />

            <div className="absolute left-5 top-5 rounded-2xl bg-white px-4 py-3 text-black shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-500">
                    Offre
                </p>

                <p className="mt-1 text-2xl font-black leading-none">
                    {offerLabel}
                </p>
            </div>
        </div>
    );
}

function CampaignShowcase({ campaign }: { campaign: SaleCampaign }) {
    const products = campaign.products ?? [];
    const offerLabel = getCampaignOfferLabel(campaign);
    const smallLabel = getCampaignSmallLabel(campaign);

    return (
        <section
            id={`campagne-${campaign.slug}`}
            className="overflow-hidden bg-neutral-950 text-white"
        >
            <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
                <div className="animate-[campaignFadeUp_700ms_ease-out_both]">
                    <div className="inline-flex flex-col rounded-[1.6rem] bg-white px-5 py-4 text-black shadow-2xl md:px-6 md:py-5">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">
                            {smallLabel}
                        </span>

                        <span className="mt-2 text-4xl font-black leading-none tracking-tight md:text-5xl">
                            {offerLabel}
                        </span>
                    </div>

                    <h2 className="mt-7 max-w-3xl text-5xl font-black uppercase leading-none md:text-7xl">
                        {campaign.heroTitle || campaign.name}
                    </h2>

                    <p className="mt-6 max-w-xl text-lg text-neutral-300">
                        {campaign.heroSubtitle ||
                            campaign.description ||
                            "Découvrez une sélection spéciale pensée pour vous."}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href={`#campagne-produits-${campaign.slug}`}
                            className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-4 text-sm font-black text-black transition hover:bg-neutral-200"
                        >
                            Voir la sélection
                            <ArrowRight size={16} />
                        </Link>

                        <Link
                            href="/boutique"
                            className="rounded-full border border-white/30 px-6 py-4 text-sm font-black text-white transition hover:border-white"
                        >
                            Voir toute la boutique
                        </Link>
                    </div>
                </div>

                <div className="animate-[campaignMediaZoom_900ms_ease-out_both]">
                    <CampaignMedia
                        campaign={campaign}
                        offerLabel={offerLabel}
                    />
                </div>
            </div>

            {products.length > 0 && (
                <div
                    id={`campagne-produits-${campaign.slug}`}
                    className="mx-auto max-w-7xl px-6 pb-14"
                >
                    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                        <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-neutral-400">
                                Sélection campagne
                            </p>

                            <h3 className="mt-3 text-3xl font-black uppercase">
                                Articles liés à {campaign.name}
                            </h3>
                        </div>

                        <p className="max-w-lg text-neutral-400">
                            Les articles affichés ici sont associés à cette
                            campagne depuis l’administration.
                        </p>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {products.slice(0, 8).map((product, index) => (
                            <div
                                key={product.id}
                                className="animate-[campaignFadeUp_650ms_ease-out_both]"
                                style={{
                                    animationDelay: `${index * 90}ms`,
                                }}
                            >
                                <ProductCard product={product} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

export default async function HomePage() {
    const [products, homepageCampaigns] = await Promise.all([
        getProducts(),
        getHomepageSaleCampaigns(),
    ]);

    const featuredProducts = products.filter((product) => product.isFeatured);
    const newProducts = products.filter((product) => product.isNewArrival);
    const promoProducts = products.filter(
        (product) => product.discountPercentage > 0,
    );

    const heroProduct = featuredProducts[0] ?? products[0];

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <style>{`
                @keyframes campaignFadeUp {
                    from {
                        opacity: 0;
                        transform: translateY(28px);
                    }

                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes campaignMediaZoom {
                    from {
                        opacity: 0;
                        transform: scale(1.04);
                    }

                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
            `}</style>

            <PublicHeader />

            {homepageCampaigns.map((campaign) => (
                <CampaignShowcase key={campaign.id} campaign={campaign} />
            ))}

            <AnimatedHero featuredProduct={heroProduct} />

            <CategoryShowcase />

            <ProductCarousel
                id="nouveautes"
                eyebrow="Nouveautés"
                title="Nouvelle collection"
                products={newProducts.length > 0 ? newProducts : products}
            />

            <section className="bg-neutral-950 text-white">
                <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                    <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-neutral-400">
                            Sélection Bigotti
                        </p>

                        <h2 className="mt-4 text-5xl font-black uppercase leading-none">
                            Élégance, confort et présence.
                        </h2>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                            <h3 className="text-xl font-black">Business</h3>

                            <p className="mt-3 text-neutral-300">
                                Des pièces adaptées aux journées de travail et
                                aux rendez-vous.
                            </p>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                            <h3 className="text-xl font-black">Cérémonie</h3>

                            <p className="mt-3 text-neutral-300">
                                Une allure soignée pour les occasions spéciales.
                            </p>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                            <h3 className="text-xl font-black">Casual</h3>

                            <p className="mt-3 text-neutral-300">
                                Des essentiels modernes pour le quotidien.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <ProductCarousel
                id="promotions"
                eyebrow="Promotions"
                title="Offres du moment"
                products={promoProducts}
            />

            <section id="boutique" className="mx-auto max-w-7xl px-6 py-16">
                <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                            Boutique
                        </p>

                        <h2 className="mt-3 text-4xl font-black uppercase">
                            Tous les produits
                        </h2>
                    </div>

                    <p className="max-w-xl text-neutral-600">
                        Choisissez votre couleur, votre taille et commandez en
                        quelques clics.
                    </p>
                </div>

                {products.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-10 text-center">
                        <h3 className="text-xl font-semibold">
                            Aucun produit disponible pour le moment.
                        </h3>

                        <p className="mt-2 text-neutral-500">
                            Revenez bientôt pour découvrir la collection.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </section>

            <PublicFooter />
        </main>
    );
}
