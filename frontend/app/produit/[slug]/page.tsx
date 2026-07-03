import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { getProductBySlug, getProducts } from "@/lib/api";

type ProductDetailPageProps = {
    params: Promise<{
        slug: string;
    }>;
};

export default async function ProductDetailPage({
    params,
}: ProductDetailPageProps) {
    const { slug } = await params;

    const [product, products] = await Promise.all([
        getProductBySlug(slug),
        getProducts(),
    ]);

    const similarProducts = products
        .filter(
            (currentProduct) =>
                currentProduct.id !== product.id &&
                currentProduct.category.id === product.category.id,
        )
        .slice(0, 8);

    return (
        <main className="min-h-screen bg-white text-neutral-950">
            <PublicHeader />

            <ProductDetailClient
                product={product}
                similarProducts={similarProducts}
            />

            <PublicFooter />
        </main>
    );
}
