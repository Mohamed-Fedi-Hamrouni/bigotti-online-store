import { ProductCard } from "@/components/ProductCard";
import { getProducts } from "@/lib/api";

export default async function HomePage() {
    const products = await getProducts();
    const featuredProduct = products[0];
    const featuredImage =
        featuredProduct?.images.find((image) => image.isMain) ??
        featuredProduct?.images[0];

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <header className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center">
                        <img
                            src="/images/bigotti-logo.jpg"
                            alt="Bigotti Collection"
                            className="h-20 w-auto object-contain"
                        />
                    </div>

                    <nav className="hidden items-center gap-8 text-sm font-medium text-neutral-700 md:flex">
                        <a href="#boutique" className="hover:text-black">
                            Boutique
                        </a>
                        <a href="#collections" className="hover:text-black">
                            Collections
                        </a>
                        <a href="#soldes" className="hover:text-black">
                            Soldes
                        </a>
                        <a href="#contact" className="hover:text-black">
                            Contact
                        </a>
                    </nav>
                </div>
            </header>

            <section className="relative overflow-hidden bg-[#080808] text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_35%)]" />

                <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-[1.05fr_0.95fr] md:items-center lg:py-24">
                    <div>
                        <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">
                            Bigotti Collection
                        </p>

                        <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl">
                            Style homme, élégance et caractère.
                        </h1>

                        <p className="mt-7 max-w-2xl text-lg leading-8 text-neutral-300">
                            Découvrez une sélection de chemises, costumes,
                            pantalons, vestes et accessoires pensés pour un
                            style moderne, soigné et affirmé.
                        </p>

                        <div className="mt-9 flex flex-wrap gap-4">
                            <a
                                href="#boutique"
                                className="rounded-full bg-white px-7 py-4 text-sm font-bold text-black transition hover:bg-neutral-200"
                            >
                                Découvrir la collection
                            </a>

                            <a
                                href="#soldes"
                                className="rounded-full border border-white/20 px-7 py-4 text-sm font-medium text-white transition hover:border-white hover:bg-white hover:text-black"
                            >
                                Voir les offres
                            </a>
                        </div>

                        <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-6 text-sm text-neutral-300">
                            <div>
                                <p className="font-semibold text-white">
                                    Livraison
                                </p>
                                <p className="mt-1">à domicile</p>
                            </div>

                            <div>
                                <p className="font-semibold text-white">
                                    Paiement
                                </p>
                                <p className="mt-1">à la livraison</p>
                            </div>

                            <div>
                                <p className="font-semibold text-white">
                                    Sélection
                                </p>
                                <p className="mt-1">homme</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute -left-6 -top-6 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                        <div className="absolute -bottom-6 -right-6 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

                        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-4 shadow-2xl">
                            <div className="overflow-hidden rounded-[2rem] bg-neutral-900">
                                {featuredImage ? (
                                    <img
                                        src={featuredImage.url}
                                        alt={
                                            featuredImage.altText ??
                                            featuredProduct.name
                                        }
                                        className="h-[560px] w-full object-cover opacity-95"
                                    />
                                ) : (
                                    <div className="flex h-[560px] items-center justify-center text-neutral-500">
                                        Bigotti Collection
                                    </div>
                                )}
                            </div>

                            {featuredProduct && (
                                <div className="absolute bottom-8 left-8 right-8 rounded-3xl bg-white/95 p-5 text-black shadow-xl backdrop-blur">
                                    <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                                        Sélection du moment
                                    </p>

                                    <div className="mt-2 flex items-end justify-between gap-4">
                                        <div>
                                            <h2 className="text-xl font-bold">
                                                {featuredProduct.name}
                                            </h2>
                                            <p className="mt-1 text-sm text-neutral-500">
                                                Réf. {featuredProduct.reference}
                                            </p>
                                        </div>

                                        <p className="shrink-0 text-lg font-bold">
                                            {featuredProduct.finalPrice.toFixed(
                                                3,
                                            )}{" "}
                                            TND
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section id="boutique" className="mx-auto max-w-7xl px-6 py-16">
                <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                            Boutique
                        </p>

                        <h2 className="mt-2 text-4xl font-bold">
                            Produits disponibles
                        </h2>
                    </div>

                    <p className="text-neutral-600">
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
        </main>
    );
}
