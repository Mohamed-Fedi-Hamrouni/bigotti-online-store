import { AnimatedHero } from "@/components/home/AnimatedHero";
import { CategoryShowcase } from "@/components/home/CategoryShowcase";
import { HomeProductGrid } from "@/components/home/HomeProductGrid";
import { ProductCarousel } from "@/components/home/ProductCarousel";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { ProductCard } from "@/components/ProductCard";
import { getHomepageSaleCampaigns, getProducts } from "@/lib/api";
import type { SaleCampaign } from "@/types/product";

function formatMoney(value: number | null | undefined) {
    if (value === null || value === undefined) {
        return "";
    }

    return `${Number(value).toFixed(0)} TND`;
}

function getCampaignOfferLabel(campaign: SaleCampaign) {
    if (
        campaign.type === "REMISE_POURCENTAGE" &&
        campaign.discountValue !== null
    ) {
        return `-${Number(campaign.discountValue).toFixed(0)}%`;
    }

    if (
        campaign.type === "REMISE_MONTANT_FIXE" &&
        campaign.discountValue !== null
    ) {
        return `-${formatMoney(campaign.discountValue)}`;
    }

    if (
        campaign.type === "ACHETEZ_X_OBTENEZ_Y" &&
        campaign.buyQuantity &&
        campaign.freeQuantity
    ) {
        return `Achetez ${campaign.buyQuantity}, ${campaign.freeQuantity} offert`;
    }

    return "Offre spéciale";
}

function getCampaignOfferTypeLabel(campaign: SaleCampaign) {
    if (campaign.type === "REMISE_POURCENTAGE") {
        return "Remise en pourcentage";
    }

    if (campaign.type === "REMISE_MONTANT_FIXE") {
        return "Remise fixe";
    }

    if (campaign.type === "ACHETEZ_X_OBTENEZ_Y") {
        return "Offre groupée";
    }

    return "Événement";
}

function CampaignMedia({ campaign }: { campaign: SaleCampaign }) {
    if (!campaign.mediaUrl) {
        return (
            <div className="flex min-h-[300px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 text-sm font-semibold uppercase tracking-[0.2em] text-white/40">
                Média campagne
            </div>
        );
    }

    if (campaign.mediaType === "VIDEO") {
        return (
            <video
                src={campaign.mediaUrl}
                autoPlay
                muted
                loop
                playsInline
                className="h-full min-h-[300px] w-full rounded-[2rem] object-cover"
            />
        );
    }

    return (
        <img
            src={campaign.mediaUrl}
            alt={campaign.name}
            className="h-full min-h-[300px] w-full rounded-[2rem] object-cover"
        />
    );
}

function CampaignHero({ campaign }: { campaign: SaleCampaign }) {
    const offerLabel = getCampaignOfferLabel(campaign);
    const offerTypeLabel = getCampaignOfferTypeLabel(campaign);

    return (
        <section className="bg-neutral-950 text-white">
            <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">
                        Sélection campagne
                    </p>

                    <div className="mt-6 inline-flex rounded-[2rem] bg-white px-7 py-5 text-neutral-950 shadow-xl">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-neutral-500">
                                {offerTypeLabel}
                            </p>

                            <p className="mt-2 text-4xl font-black uppercase leading-none">
                                {offerLabel}
                            </p>
                        </div>
                    </div>

                    <h1 className="mt-8 max-w-3xl text-5xl font-black uppercase leading-none md:text-7xl">
                        {campaign.heroTitle || campaign.name}
                    </h1>

                    {(campaign.heroSubtitle || campaign.description) && (
                        <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
                            {campaign.heroSubtitle || campaign.description}
                        </p>
                    )}
                </div>

                <div className="relative">
                    <CampaignMedia campaign={campaign} />

                    <div className="absolute left-5 top-5 rounded-full bg-black px-4 py-2 text-sm font-black text-white shadow-lg">
                        {offerLabel}
                    </div>
                </div>
            </div>
        </section>
    );
}

function CampaignProductsSection({ campaign }: { campaign: SaleCampaign }) {
    const products = campaign.products ?? [];

    if (products.length === 0) {
        return null;
    }

    const duplicatedProducts =
        products.length > 3 ? [...products, ...products] : products;

    return (
        <section className="bg-neutral-950 text-white">
            <style>
                {`
                    @keyframes campaign-products-auto-scroll {
                        from {
                            transform: translateX(0);
                        }

                        to {
                            transform: translateX(-50%);
                        }
                    }

                    .campaign-products-track {
                        animation: campaign-products-auto-scroll 35s linear infinite;
                    }

                    .campaign-products-track:hover {
                        animation-play-state: paused;
                    }

                    @media (prefers-reduced-motion: reduce) {
                        .campaign-products-track {
                            animation: none;
                        }
                    }
                `}
            </style>

            <div className="mx-auto max-w-7xl px-6 pb-16 pt-6">
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm uppercase tracking-[0.35em] text-neutral-500">
                            Sélection campagne
                        </p>

                        <h2 className="mt-3 text-3xl font-black uppercase md:text-4xl">
                            Articles liés à {campaign.name}
                        </h2>
                    </div>

                    <p className="max-w-xl text-sm leading-6 text-neutral-400">
                        Les articles affichés ici sont associés à cette campagne
                        depuis l’administration.
                    </p>
                </div>

                {products.length > 3 ? (
                    <div className="-mx-6 overflow-hidden px-6 pb-5">
                        <div className="campaign-products-track flex w-max gap-5">
                            {duplicatedProducts.map((product, index) => (
                                <div
                                    key={`${product.id}-${index}`}
                                    className="w-[250px] shrink-0 sm:w-[270px] lg:w-[290px]"
                                >
                                    <ProductCard product={product} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="-mx-6 overflow-x-auto px-6 pb-5 [scrollbar-width:thin]">
                        <div className="flex w-max gap-5">
                            {products.map((product) => (
                                <div
                                    key={product.id}
                                    className="w-[250px] shrink-0 sm:w-[270px] lg:w-[290px]"
                                >
                                    <ProductCard product={product} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
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
        (product) => product.isOnSale || product.discountPercentage > 0,
    );

    const heroProduct = featuredProducts[0] ?? products[0];

    const activeHomepageCampaigns = homepageCampaigns.filter(
        (campaign) => campaign.isActive && campaign.displayOnHome,
    );

    const mainCampaign = activeHomepageCampaigns[0] ?? null;
    const secondaryCampaigns = activeHomepageCampaigns.slice(1);

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <PublicHeader />

            {mainCampaign ? (
                <>
                    <CampaignHero campaign={mainCampaign} />
                    <CampaignProductsSection campaign={mainCampaign} />
                </>
            ) : (
                <AnimatedHero featuredProduct={heroProduct} />
            )}

            {secondaryCampaigns.map((campaign) => (
                <CampaignProductsSection
                    key={campaign.id}
                    campaign={campaign}
                />
            ))}

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
                            Bigotti Selection
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

                <HomeProductGrid products={products} />
            </section>

            <PublicFooter />
        </main>
    );
}
