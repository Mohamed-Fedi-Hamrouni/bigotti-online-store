"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { getAdminProducts, updateProductStatus } from "@/lib/api";
import type { Product, ProductStatus } from "@/types/product";

const PRODUCTS_PER_PAGE = 10;

const PRODUCT_STATUS_OPTIONS: Array<{
    value: ProductStatus;
    label: string;
}> = [
    { value: "DRAFT", label: "Brouillon" },
    { value: "PUBLISHED", label: "Publié" },
    { value: "ARCHIVED", label: "Archivé" },
];

type ProductStatusFilter = "ALL" | ProductStatus;
type ProductStockFilter = "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
type ProductPromoFilter = "ALL" | "ON_SALE" | "REGULAR";
type ProductSortOption =
    | "DEFAULT"
    | "NAME_ASC"
    | "PRICE_ASC"
    | "PRICE_DESC"
    | "STOCK_ASC"
    | "STOCK_DESC";

function formatPrice(value: number | string | null | undefined) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return "0.000 TND";
    }

    return `${numericValue.toFixed(3)} TND`;
}

function getStatusLabel(status: ProductStatus) {
    return (
        PRODUCT_STATUS_OPTIONS.find((option) => option.value === status)
            ?.label ?? status
    );
}

function getStatusClassName(status: ProductStatus) {
    if (status === "PUBLISHED") {
        return "rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700";
    }

    if (status === "ARCHIVED") {
        return "rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700";
    }

    return "rounded-full bg-yellow-50 px-3 py-1 text-sm font-semibold text-yellow-700";
}

function getProductSearchContent(product: Product) {
    return [
        product.name,
        product.reference,
        product.category?.name,
        product.categoryType?.name,
        product.collection?.name,
        product.saleCampaign?.name,
        product.variants
            .map((variant) => `${variant.color} ${variant.size}`)
            .join(" "),
    ]
        .join(" ")
        .toLowerCase();
}

function getProductFinalPrice(product: Product) {
    return Number(product.finalPrice ?? product.price);
}

function buildPaginationRange(currentPage: number, totalPages: number) {
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function AdminProductsPage() {
    const router = useRouter();

    const [products, setProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] =
        useState<ProductStatusFilter>("ALL");
    const [stockFilter, setStockFilter] = useState<ProductStockFilter>("ALL");
    const [promoFilter, setPromoFilter] = useState<ProductPromoFilter>("ALL");
    const [sortOption, setSortOption] = useState<ProductSortOption>("DEFAULT");
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingProductId, setUpdatingProductId] = useState<string | null>(
        null,
    );

    useEffect(() => {
        const token = window.localStorage.getItem("bigotti-admin-token");

        if (!token) {
            router.push("/admin/login");
            return;
        }

        getAdminProducts(token)
            .then(setProducts)
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Erreur de chargement des produits.",
                );
            })
            .finally(() => setIsLoading(false));
    }, [router]);

    const filteredProducts = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLowerCase();

        const filtered = products.filter((product) => {
            const matchesSearch =
                !normalizedSearch ||
                getProductSearchContent(product).includes(normalizedSearch);

            const matchesStatus =
                statusFilter === "ALL" || product.status === statusFilter;

            const matchesPromo =
                promoFilter === "ALL" ||
                (promoFilter === "ON_SALE" &&
                    (product.isOnSale || product.discountPercentage > 0)) ||
                (promoFilter === "REGULAR" &&
                    !product.isOnSale &&
                    product.discountPercentage <= 0);

            const matchesStock =
                stockFilter === "ALL" ||
                (stockFilter === "IN_STOCK" && product.totalStock > 5) ||
                (stockFilter === "LOW_STOCK" &&
                    product.totalStock > 0 &&
                    product.totalStock <= 5) ||
                (stockFilter === "OUT_OF_STOCK" && product.totalStock <= 0);

            return (
                matchesSearch && matchesStatus && matchesPromo && matchesStock
            );
        });

        return [...filtered].sort((firstProduct, secondProduct) => {
            if (sortOption === "NAME_ASC") {
                return firstProduct.name.localeCompare(secondProduct.name);
            }

            if (sortOption === "PRICE_ASC") {
                return (
                    getProductFinalPrice(firstProduct) -
                    getProductFinalPrice(secondProduct)
                );
            }

            if (sortOption === "PRICE_DESC") {
                return (
                    getProductFinalPrice(secondProduct) -
                    getProductFinalPrice(firstProduct)
                );
            }

            if (sortOption === "STOCK_ASC") {
                return firstProduct.totalStock - secondProduct.totalStock;
            }

            if (sortOption === "STOCK_DESC") {
                return secondProduct.totalStock - firstProduct.totalStock;
            }

            return (
                new Date(secondProduct.createdAt).getTime() -
                new Date(firstProduct.createdAt).getTime()
            );
        });
    }, [
        products,
        searchQuery,
        statusFilter,
        stockFilter,
        promoFilter,
        sortOption,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE),
    );

    const paginationRange = useMemo(
        () => buildPaginationRange(currentPage, totalPages),
        [currentPage, totalPages],
    );

    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
        const endIndex = startIndex + PRODUCTS_PER_PAGE;

        return filteredProducts.slice(startIndex, endIndex);
    }, [filteredProducts, currentPage]);

    const firstVisibleProductIndex =
        filteredProducts.length === 0
            ? 0
            : (currentPage - 1) * PRODUCTS_PER_PAGE + 1;

    const lastVisibleProductIndex = Math.min(
        currentPage * PRODUCTS_PER_PAGE,
        filteredProducts.length,
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, stockFilter, promoFilter, sortOption]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    function logout() {
        window.localStorage.removeItem("bigotti-admin-token");
        window.localStorage.removeItem("bigotti-admin-user");
        router.push("/admin/login");
    }

    function goToPage(page: number) {
        const nextPage = Math.min(Math.max(page, 1), totalPages);

        setCurrentPage(nextPage);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    async function handleStatusChange(product: Product, status: ProductStatus) {
        if (product.status === status) {
            return;
        }

        if (status === "ARCHIVED") {
            const confirmed = window.confirm(
                `Confirmer l’archivage du produit "${product.name}" ?\n\nLe produit ne sera pas supprimé. Il ne sera plus visible côté client, mais il restera disponible dans l’administration.`,
            );

            if (!confirmed) {
                return;
            }
        }

        if (product.status === "ARCHIVED" && status !== "ARCHIVED") {
            const confirmed = window.confirm(
                `Réactiver le produit "${product.name}" en statut "${getStatusLabel(
                    status,
                )}" ?`,
            );

            if (!confirmed) {
                return;
            }
        }

        const token = window.localStorage.getItem("bigotti-admin-token");

        if (!token) {
            router.push("/admin/login");
            return;
        }

        try {
            setUpdatingProductId(product.id);

            const updatedProduct = await updateProductStatus(
                token,
                product.id,
                status,
            );

            setProducts((currentProducts) =>
                currentProducts.map((currentProduct) =>
                    currentProduct.id === product.id
                        ? updatedProduct
                        : currentProduct,
                ),
            );
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la mise à jour du statut.",
            );
        } finally {
            setUpdatingProductId(null);
        }
    }

    const publishedProducts = products.filter(
        (product) => product.status === "PUBLISHED",
    ).length;

    const archivedProducts = products.filter(
        (product) => product.status === "ARCHIVED",
    ).length;

    const draftProducts = products.filter(
        (product) => product.status === "DRAFT",
    ).length;

    const onSaleProducts = products.filter(
        (product) => product.isOnSale || product.discountPercentage > 0,
    ).length;

    const lowStockProducts = products.filter(
        (product) => product.totalStock > 0 && product.totalStock <= 5,
    ).length;

    const outOfStockProducts = products.filter(
        (product) => product.totalStock <= 0,
    ).length;

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <header className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <Link href="/admin" className="flex items-center">
                        <img
                            src="/images/bigotti-logo.jpg"
                            alt="Bigotti Collection"
                            className="h-20 w-auto object-contain"
                        />
                    </Link>

                    <div className="flex items-center gap-6">
                        <Link
                            href="/"
                            className="text-sm font-medium text-neutral-600 hover:text-black"
                        >
                            Boutique
                        </Link>

                        <button
                            type="button"
                            onClick={logout}
                            className="text-sm font-medium text-neutral-600 hover:text-black"
                        >
                            Déconnexion
                        </button>
                    </div>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-6 py-12">
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                            Administration
                        </p>

                        <h1 className="mt-2 text-4xl font-bold">Produits</h1>

                        <p className="mt-3 text-neutral-600">
                            Gérez, filtrez, modifiez et archivez les articles de
                            la boutique sans suppression définitive.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/admin"
                            className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold hover:border-black"
                        >
                            Dashboard admin
                        </Link>

                        <Link
                            href="/admin/produits/nouveau"
                            className="rounded-full bg-black px-6 py-3 text-sm font-bold text-white transition hover:bg-neutral-800"
                        >
                            Ajouter un produit
                        </Link>
                    </div>
                </div>

                <div className="mb-8 grid gap-5 md:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-neutral-500">
                            Total produits
                        </p>

                        <p className="mt-2 text-3xl font-bold">
                            {products.length}
                        </p>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-neutral-500">Publiés</p>

                        <p className="mt-2 text-3xl font-bold text-green-700">
                            {publishedProducts}
                        </p>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-neutral-500">Brouillons</p>

                        <p className="mt-2 text-3xl font-bold text-yellow-700">
                            {draftProducts}
                        </p>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-neutral-500">Archivés</p>

                        <p className="mt-2 text-3xl font-bold text-red-700">
                            {archivedProducts}
                        </p>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-neutral-500">Promos</p>

                        <p className="mt-2 text-3xl font-bold">
                            {onSaleProducts}
                        </p>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        <p className="text-sm text-neutral-500">
                            Stock faible / zéro
                        </p>

                        <p className="mt-2 text-3xl font-bold">
                            {lowStockProducts + outOfStockProducts}
                        </p>
                    </div>
                </div>

                <div className="mb-8 rounded-[2rem] bg-white p-6 shadow-sm">
                    <div className="grid gap-4 lg:grid-cols-[1fr_170px_170px_170px_190px]">
                        <div className="relative">
                            <Search
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                            />

                            <input
                                value={searchQuery}
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                                placeholder="Rechercher nom, référence, catégorie, type, couleur..."
                                className="w-full rounded-2xl border border-neutral-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-black"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(
                                    event.target.value as ProductStatusFilter,
                                )
                            }
                            className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                        >
                            <option value="ALL">Tous statuts</option>

                            {PRODUCT_STATUS_OPTIONS.map((status) => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={stockFilter}
                            onChange={(event) =>
                                setStockFilter(
                                    event.target.value as ProductStockFilter,
                                )
                            }
                            className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                        >
                            <option value="ALL">Tous stocks</option>
                            <option value="IN_STOCK">En stock</option>
                            <option value="LOW_STOCK">Stock faible</option>
                            <option value="OUT_OF_STOCK">Rupture</option>
                        </select>

                        <select
                            value={promoFilter}
                            onChange={(event) =>
                                setPromoFilter(
                                    event.target.value as ProductPromoFilter,
                                )
                            }
                            className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                        >
                            <option value="ALL">Tous prix</option>
                            <option value="ON_SALE">En promo</option>
                            <option value="REGULAR">Prix normal</option>
                        </select>

                        <select
                            value={sortOption}
                            onChange={(event) =>
                                setSortOption(
                                    event.target.value as ProductSortOption,
                                )
                            }
                            className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                        >
                            <option value="DEFAULT">Plus récents</option>
                            <option value="NAME_ASC">Nom A-Z</option>
                            <option value="PRICE_ASC">Prix croissant</option>
                            <option value="PRICE_DESC">Prix décroissant</option>
                            <option value="STOCK_ASC">Stock croissant</option>
                            <option value="STOCK_DESC">
                                Stock décroissant
                            </option>
                        </select>
                    </div>

                    <div className="mt-4 flex flex-col justify-between gap-3 text-sm text-neutral-500 md:flex-row md:items-center">
                        <p>{filteredProducts.length} produit(s) trouvé(s)</p>

                        {!isLoading &&
                            !error &&
                            filteredProducts.length > 0 && (
                                <p>
                                    Affichage de {firstVisibleProductIndex} à{" "}
                                    {lastVisibleProductIndex} sur{" "}
                                    {filteredProducts.length} produit(s) — page{" "}
                                    {currentPage}/{totalPages}
                                </p>
                            )}
                    </div>
                </div>

                {isLoading && (
                    <div className="rounded-3xl bg-white p-8 shadow-sm">
                        Chargement des produits...
                    </div>
                )}

                {error && (
                    <div className="rounded-3xl bg-red-50 p-8 text-red-700">
                        {error}
                    </div>
                )}

                {!isLoading && !error && filteredProducts.length === 0 && (
                    <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
                        <h2 className="text-2xl font-bold">
                            Aucun produit trouvé.
                        </h2>
                    </div>
                )}

                <div className="grid gap-5">
                    {paginatedProducts.map((product) => {
                        const mainImage =
                            product.images.find((image) => image.isMain) ??
                            product.images[0];

                        const isArchived = product.status === "ARCHIVED";
                        const isUpdating = updatingProductId === product.id;

                        return (
                            <article
                                key={product.id}
                                className={
                                    isArchived
                                        ? "grid gap-5 rounded-[2rem] border border-red-100 bg-white p-5 opacity-80 shadow-sm md:grid-cols-[140px_1fr_280px]"
                                        : "grid gap-5 rounded-[2rem] bg-white p-5 shadow-sm md:grid-cols-[140px_1fr_280px]"
                                }
                            >
                                <div className="overflow-hidden rounded-2xl bg-neutral-100">
                                    {mainImage ? (
                                        <img
                                            src={mainImage.url}
                                            alt={
                                                mainImage.altText ??
                                                product.name
                                            }
                                            className="h-40 w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-40 items-center justify-center text-neutral-400">
                                            Image
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h2 className="text-2xl font-bold">
                                            {product.name}
                                        </h2>

                                        <span
                                            className={getStatusClassName(
                                                product.status,
                                            )}
                                        >
                                            {getStatusLabel(product.status)}
                                        </span>

                                        {product.isOnSale && (
                                            <span className="rounded-full bg-black px-3 py-1 text-sm font-semibold text-white">
                                                Promo
                                            </span>
                                        )}

                                        {product.totalStock <= 0 && (
                                            <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
                                                Rupture
                                            </span>
                                        )}

                                        {product.totalStock > 0 &&
                                            product.totalStock <= 5 && (
                                                <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
                                                    Stock faible
                                                </span>
                                            )}
                                    </div>

                                    <p className="mt-2 text-sm text-neutral-500">
                                        Réf. {product.reference}
                                    </p>

                                    <p className="mt-3 text-neutral-600">
                                        Catégorie : {product.category.name}
                                    </p>

                                    {product.categoryType && (
                                        <p className="mt-1 text-neutral-600">
                                            Type : {product.categoryType.name}
                                        </p>
                                    )}

                                    <p className="mt-1 text-neutral-600">
                                        Stock total : {product.totalStock}
                                    </p>

                                    {product.saleCampaign && (
                                        <p className="mt-1 text-neutral-600">
                                            Campagne :{" "}
                                            {product.saleCampaign.name}
                                        </p>
                                    )}

                                    {isArchived && (
                                        <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                                            Ce produit est archivé. Il reste
                                            dans l’administration, mais il n’est
                                            pas visible dans la boutique.
                                        </p>
                                    )}

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {product.variants.map((variant) => (
                                            <span
                                                key={variant.id}
                                                className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700"
                                            >
                                                {variant.color} / {variant.size}{" "}
                                                : {variant.stockQuantity}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 text-left md:text-right">
                                    {product.isOnSale ||
                                    product.discountPercentage > 0 ? (
                                        <div>
                                            <p className="text-sm text-neutral-400 line-through">
                                                {formatPrice(product.price)}
                                            </p>

                                            <p className="text-2xl font-bold">
                                                {formatPrice(
                                                    product.finalPrice,
                                                )}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-2xl font-bold">
                                            {formatPrice(product.price)}
                                        </p>
                                    )}

                                    <div>
                                        <label className="text-sm font-semibold">
                                            Statut
                                        </label>

                                        <select
                                            value={product.status}
                                            disabled={isUpdating}
                                            onChange={(event) =>
                                                handleStatusChange(
                                                    product,
                                                    event.target
                                                        .value as ProductStatus,
                                                )
                                            }
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                                        >
                                            {PRODUCT_STATUS_OPTIONS.map(
                                                (status) => (
                                                    <option
                                                        key={status.value}
                                                        value={status.value}
                                                    >
                                                        {status.label}
                                                    </option>
                                                ),
                                            )}
                                        </select>

                                        {isUpdating && (
                                            <p className="mt-2 text-sm text-neutral-500">
                                                Mise à jour...
                                            </p>
                                        )}
                                    </div>

                                    <Link
                                        href={`/admin/produits/${product.id}/modifier`}
                                        className="inline-flex w-full justify-center rounded-full bg-black px-5 py-2 text-sm font-bold text-white"
                                    >
                                        Modifier
                                    </Link>

                                    {!isArchived ? (
                                        <button
                                            type="button"
                                            disabled={isUpdating}
                                            onClick={() =>
                                                handleStatusChange(
                                                    product,
                                                    "ARCHIVED",
                                                )
                                            }
                                            className="inline-flex w-full justify-center rounded-full border border-red-200 px-5 py-2 text-sm font-bold text-red-700 hover:border-red-600 disabled:opacity-50"
                                        >
                                            Archiver
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={isUpdating}
                                            onClick={() =>
                                                handleStatusChange(
                                                    product,
                                                    "DRAFT",
                                                )
                                            }
                                            className="inline-flex w-full justify-center rounded-full border border-green-200 px-5 py-2 text-sm font-bold text-green-700 hover:border-green-600 disabled:opacity-50"
                                        >
                                            Réactiver en brouillon
                                        </button>
                                    )}

                                    {product.status === "PUBLISHED" ? (
                                        <Link
                                            href={`/produit/${product.slug}`}
                                            className="inline-flex w-full justify-center rounded-full border border-neutral-300 px-5 py-2 text-sm font-semibold hover:border-black"
                                        >
                                            Voir boutique
                                        </Link>
                                    ) : (
                                        <p className="text-sm text-neutral-500">
                                            Non visible côté client
                                        </p>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>

                {!isLoading && !error && filteredProducts.length > 0 && (
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronLeft size={16} />
                            Précédent
                        </button>

                        {paginationRange[0] > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => goToPage(1)}
                                    className="h-11 min-w-11 rounded-full border border-neutral-300 bg-white px-4 text-sm font-black transition hover:border-black"
                                >
                                    1
                                </button>

                                <span className="px-2 text-sm font-black text-neutral-400">
                                    ...
                                </span>
                            </>
                        )}

                        {paginationRange.map((page) => (
                            <button
                                key={page}
                                type="button"
                                onClick={() => goToPage(page)}
                                className={
                                    currentPage === page
                                        ? "h-11 min-w-11 rounded-full bg-black px-4 text-sm font-black text-white"
                                        : "h-11 min-w-11 rounded-full border border-neutral-300 bg-white px-4 text-sm font-black transition hover:border-black"
                                }
                            >
                                {page}
                            </button>
                        ))}

                        {paginationRange[paginationRange.length - 1] <
                            totalPages && (
                            <>
                                <span className="px-2 text-sm font-black text-neutral-400">
                                    ...
                                </span>

                                <button
                                    type="button"
                                    onClick={() => goToPage(totalPages)}
                                    className="h-11 min-w-11 rounded-full border border-neutral-300 bg-white px-4 text-sm font-black transition hover:border-black"
                                >
                                    {totalPages}
                                </button>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Suivant
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </section>
        </main>
    );
}
