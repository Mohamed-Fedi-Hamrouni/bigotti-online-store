import { AnimatedHero } from "@/components/home/AnimatedHero";
import { CategoryShowcase } from "@/components/home/CategoryShowcase";
import { ProductCarousel } from "@/components/home/ProductCarousel";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { ProductCard } from "@/components/ProductCard";
import { getProducts } from "@/lib/api";

export default async function HomePage() {
    const products = await getProducts();

    const featuredProducts = products.filter((product) => product.isFeatured);
    const newProducts = products.filter((product) => product.isNewArrival);
    const promoProducts = products.filter((product) => product.isOnSale);

    const heroProduct = featuredProducts[0] ?? products[0];

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <PublicHeader />

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
