import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { getProductBySlug } from "@/lib/api";

type ProductDetailPageProps = {
    params: Promise<{
        slug: string;
    }>;
};

export default async function ProductDetailPage({
    params,
}: ProductDetailPageProps) {
    const { slug } = await params;
    const product = await getProductBySlug(slug);

    return (
        <main className="min-h-screen bg-white text-neutral-950">
            <PublicHeader />
            <ProductDetailClient product={product} />
            <PublicFooter />
        </main>
    );
}
