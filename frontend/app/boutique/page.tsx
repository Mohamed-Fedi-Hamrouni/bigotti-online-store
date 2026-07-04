import { ProductCatalog } from "@/components/product/ProductCatalog";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { getProducts } from "@/lib/api";
import type { Product } from "@/types/product";

type BoutiquePageProps = {
    searchParams?: {
        category?: string | string[];
        categoryType?: string | string[];
        search?: string | string[];
    };
};

function getFirstSearchParam(value?: string | string[]) {
    if (Array.isArray(value)) {
        return value[0] ?? "";
    }

    return value ?? "";
}

function safeDecode(value: string) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function normalizeText(value: string | null | undefined) {
    return safeDecode(value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function productMatchesSearch(product: Product, searchQuery: string) {
    if (!searchQuery) {
        return true;
    }

    const searchableValue = normalizeText(
        [
            product.name,
            product.reference,
            product.shortDescription,
            product.description,
            product.category?.name,
            product.categoryType?.name,
            product.collection?.name,
            product.saleCampaign?.name,
        ]
            .filter(Boolean)
            .join(" "),
    );

    return searchableValue.includes(searchQuery);
}

function filterProducts(params: {
    products: Product[];
    categorySlug: string;
    categoryTypeSlug: string;
    searchQuery: string;
}) {
    const { products, categorySlug, categoryTypeSlug, searchQuery } = params;

    return products.filter((product) => {
        const productCategorySlug = normalizeText(product.category?.slug);
        const productCategoryTypeSlug = normalizeText(
            product.categoryType?.slug,
        );

        const matchesCategory =
            !categorySlug || productCategorySlug === categorySlug;

        const matchesCategoryType =
            !categoryTypeSlug || productCategoryTypeSlug === categoryTypeSlug;

        const matchesSearch = productMatchesSearch(product, searchQuery);

        return matchesCategory && matchesCategoryType && matchesSearch;
    });
}

function getFilterTitle(params: {
    products: Product[];
    categorySlug: string;
    categoryTypeSlug: string;
    searchQuery: string;
}) {
    const { products, categorySlug, categoryTypeSlug, searchQuery } = params;

    if (searchQuery) {
        return `Recherche : ${searchQuery}`;
    }

    if (categoryTypeSlug) {
        const matchedProduct = products.find(
            (product) =>
                normalizeText(product.categoryType?.slug) ===
                    categoryTypeSlug &&
                (!categorySlug ||
                    normalizeText(product.category?.slug) === categorySlug),
        );

        return matchedProduct?.categoryType?.name ?? "Type de catégorie";
    }

    if (categorySlug) {
        const matchedProduct = products.find(
            (product) => normalizeText(product.category?.slug) === categorySlug,
        );

        return matchedProduct?.category?.name ?? "Catégorie";
    }

    return "Boutique homme";
}

function getFilterDescription(params: {
    categorySlug: string;
    categoryTypeSlug: string;
    searchQuery: string;
    productsCount: number;
}) {
    const { categorySlug, categoryTypeSlug, searchQuery, productsCount } =
        params;

    if (searchQuery || categorySlug || categoryTypeSlug) {
        return `${productsCount} article(s) trouvé(s) selon votre sélection.`;
    }

    return "Découvrez les articles disponibles et trouvez le style qui correspond à votre quotidien, votre travail ou vos occasions.";
}

export default async function BoutiquePage({
    searchParams,
}: BoutiquePageProps) {
    const products = await getProducts();

    const categorySlug = normalizeText(
        getFirstSearchParam(searchParams?.category),
    );

    const categoryTypeSlug = normalizeText(
        getFirstSearchParam(searchParams?.categoryType),
    );

    const searchQuery = normalizeText(
        getFirstSearchParam(searchParams?.search),
    );

    const filteredProducts = filterProducts({
        products,
        categorySlug,
        categoryTypeSlug,
        searchQuery,
    });

    const title = getFilterTitle({
        products,
        categorySlug,
        categoryTypeSlug,
        searchQuery,
    });

    const description = getFilterDescription({
        categorySlug,
        categoryTypeSlug,
        searchQuery,
        productsCount: filteredProducts.length,
    });

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <PublicHeader />

            <section className="bg-neutral-950 text-white">
                <div className="mx-auto max-w-7xl px-6 py-16">
                    <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">
                        Bigotti Collection
                    </p>

                    <h1 className="mt-5 max-w-4xl text-5xl font-black uppercase leading-none md:text-7xl">
                        {title}
                    </h1>

                    <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
                        {description}
                    </p>
                </div>
            </section>

            <ProductCatalog products={filteredProducts} />

            <PublicFooter />
        </main>
    );
}
