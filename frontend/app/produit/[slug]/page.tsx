import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { getProductBySlug, getProducts } from "@/lib/api";
import type { Product, ProductVariant } from "@/types/product";

type ProductDetailPageProps = {
    params: Promise<{
        slug: string;
    }>;
};

const sizeOrder = [
    "UNIQUE",
    "ONE SIZE",
    "TU",

    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "2XL",
    "3XL",
    "XXXL",
    "4XL",

    "30",
    "32",
    "34",
    "36",
    "38",

    "40",
    "41",
    "42",
    "43",
    "44",
    "45",

    "46",
    "48",
    "50",
    "52",
    "54",
    "56",

    "80",
    "85",
    "90",
    "95",
    "100",
    "105",
    "110",
    "115",
    "120",

    "SLIM",
    "CLASSIQUE",
    "LARGE",
];

function normalizeSize(size: string) {
    return size.trim().toUpperCase();
}

function compareSizes(sizeA: string, sizeB: string) {
    const normalizedSizeA = normalizeSize(sizeA);
    const normalizedSizeB = normalizeSize(sizeB);

    const indexA = sizeOrder.indexOf(normalizedSizeA);
    const indexB = sizeOrder.indexOf(normalizedSizeB);

    if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
    }

    if (indexA !== -1) {
        return -1;
    }

    if (indexB !== -1) {
        return 1;
    }

    const numericA = Number(normalizedSizeA);
    const numericB = Number(normalizedSizeB);

    if (Number.isFinite(numericA) && Number.isFinite(numericB)) {
        return numericA - numericB;
    }

    return normalizedSizeA.localeCompare(normalizedSizeB);
}

function compareVariants(variantA: ProductVariant, variantB: ProductVariant) {
    const sizeComparison = compareSizes(variantA.size, variantB.size);

    if (sizeComparison !== 0) {
        return sizeComparison;
    }

    return variantA.color.localeCompare(variantB.color);
}

function sortProductVariants(product: Product): Product {
    return {
        ...product,
        variants: [...product.variants].sort(compareVariants),
    };
}

export default async function ProductDetailPage({
    params,
}: ProductDetailPageProps) {
    const { slug } = await params;

    const [product, products] = await Promise.all([
        getProductBySlug(slug),
        getProducts(),
    ]);

    const sortedProduct = sortProductVariants(product);

    const similarProducts = products
        .filter(
            (currentProduct) =>
                currentProduct.id !== product.id &&
                currentProduct.category.id === product.category.id,
        )
        .map((currentProduct) => sortProductVariants(currentProduct))
        .slice(0, 8);

    return (
        <main className="min-h-screen bg-white text-neutral-950">
            <PublicHeader />

            <ProductDetailClient
                product={sortedProduct}
                similarProducts={similarProducts}
            />

            <PublicFooter />
        </main>
    );
}
