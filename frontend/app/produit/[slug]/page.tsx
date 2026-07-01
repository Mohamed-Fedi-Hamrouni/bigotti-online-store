import Link from "next/link";
import { getProductBySlug } from "@/lib/api";

type ProductDetailPageProps = {
    params: Promise<{
        slug: string;
    }>;
};

function formatPrice(value: number) {
    return `${value.toFixed(3)} TND`;
}

export default async function ProductDetailPage({
    params,
}: ProductDetailPageProps) {
    const { slug } = await params;
    const product = await getProductBySlug(slug);

    const mainImage =
        product.images.find((image) => image.isMain) ?? product.images[0];

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <header className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <Link href="/" className="flex items-center">
                        <img
                            src="/images/bigotti-logo.jpg"
                            alt="Bigotti Collection"
                            className="h-20 w-auto object-contain"
                        />
                    </Link>

                    <Link
                        href="/"
                        className="text-sm font-medium text-neutral-600 hover:text-black"
                    >
                        Retour boutique
                    </Link>
                </div>
            </header>

            <section className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-2">
                <div className="overflow-hidden rounded-[2rem] bg-neutral-100">
                    {mainImage ? (
                        <img
                            src={mainImage.url}
                            alt={mainImage.altText ?? product.name}
                            className="h-full min-h-[600px] w-full object-cover"
                        />
                    ) : (
                        <div className="flex min-h-[600px] items-center justify-center text-neutral-400">
                            Image produit
                        </div>
                    )}
                </div>

                <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                    <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                        {product.category.name}
                    </p>

                    <h1 className="mt-4 text-5xl font-bold tracking-tight">
                        {product.name}
                    </h1>

                    <p className="mt-3 text-neutral-500">
                        Référence : {product.reference}
                    </p>

                    {product.collection && (
                        <p className="mt-4 inline-flex rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700">
                            {product.collection.name}
                        </p>
                    )}

                    <div className="mt-8">
                        {product.isOnSale ? (
                            <div>
                                <p className="text-lg text-neutral-400 line-through">
                                    {formatPrice(product.price)}
                                </p>

                                <div className="mt-2 flex items-center gap-3">
                                    <p className="text-4xl font-bold">
                                        {formatPrice(product.finalPrice)}
                                    </p>

                                    <span className="rounded-full bg-black px-3 py-1 text-sm font-semibold text-white">
                                        -{product.discountPercentage}%
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-4xl font-bold">
                                {formatPrice(product.price)}
                            </p>
                        )}
                    </div>

                    <p className="mt-8 leading-8 text-neutral-700">
                        {product.description ?? product.shortDescription}
                    </p>

                    <div className="mt-8">
                        <h2 className="text-lg font-bold">
                            Tailles et couleurs disponibles
                        </h2>

                        <div className="mt-4 grid gap-3">
                            {product.variants.map((variant) => (
                                <div
                                    key={variant.id}
                                    className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4"
                                >
                                    <div>
                                        <p className="font-semibold">
                                            {variant.color} / Taille{" "}
                                            {variant.size}
                                        </p>

                                        <p className="text-sm text-neutral-500">
                                            SKU : {variant.sku ?? "Non défini"}
                                        </p>
                                    </div>

                                    <span
                                        className={
                                            variant.stockQuantity > 0
                                                ? "rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700"
                                                : "rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700"
                                        }
                                    >
                                        Stock {variant.stockQuantity}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="mt-8 w-full rounded-full bg-black px-6 py-4 text-sm font-bold text-white transition hover:bg-neutral-800">
                        Ajouter au panier bientôt
                    </button>

                    <p className="mt-4 text-center text-sm text-neutral-500">
                        La logique panier sera ajoutée dans l’étape suivante.
                    </p>
                </div>
            </section>
        </main>
    );
}
