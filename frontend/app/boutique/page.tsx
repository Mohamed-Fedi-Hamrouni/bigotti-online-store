import { ProductCatalog } from "@/components/product/ProductCatalog";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { getProducts } from "@/lib/api";

export default async function BoutiquePage() {
    const products = await getProducts();

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <PublicHeader />

            <section className="bg-neutral-950 text-white">
                <div className="mx-auto max-w-7xl px-6 py-16">
                    <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">
                        Bigotti Collection
                    </p>

                    <h1 className="mt-5 max-w-4xl text-5xl font-black uppercase leading-none md:text-7xl">
                        Boutique homme
                    </h1>

                    <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
                        Découvrez les articles disponibles et trouvez le style
                        qui correspond à votre quotidien, votre travail ou vos
                        occasions.
                    </p>
                </div>
            </section>

            <ProductCatalog products={products} />

            <PublicFooter />
        </main>
    );
}
