"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminProducts, updateProductStatus } from "@/lib/api";
import type { Product, ProductStatus } from "@/types/product";

const PRODUCT_STATUS_OPTIONS: Array<{
    value: ProductStatus;
    label: string;
}> = [
    { value: "DRAFT", label: "Brouillon" },
    { value: "PUBLISHED", label: "Publié" },
    { value: "ARCHIVED", label: "Archivé" },
];

function formatPrice(value: number) {
    return `${value.toFixed(3)} TND`;
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

export default function AdminProductsPage() {
    const router = useRouter();

    const [products, setProducts] = useState<Product[]>([]);
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

    function logout() {
        window.localStorage.removeItem("bigotti-admin-token");
        window.localStorage.removeItem("bigotti-admin-user");
        router.push("/admin/login");
    }

    async function handleStatusChange(
        productId: string,
        status: ProductStatus,
    ) {
        const token = window.localStorage.getItem("bigotti-admin-token");

        if (!token) {
            router.push("/admin/login");
            return;
        }

        try {
            setUpdatingProductId(productId);

            const updatedProduct = await updateProductStatus(
                token,
                productId,
                status,
            );

            setProducts((currentProducts) =>
                currentProducts.map((product) =>
                    product.id === productId ? updatedProduct : product,
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
                            Gérez les articles visibles dans la boutique.
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

                <div className="mb-8 grid gap-5 md:grid-cols-4">
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

                {!isLoading && !error && products.length === 0 && (
                    <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
                        <h2 className="text-2xl font-bold">
                            Aucun produit pour le moment.
                        </h2>
                    </div>
                )}

                <div className="grid gap-5">
                    {products.map((product) => {
                        const mainImage =
                            product.images.find((image) => image.isMain) ??
                            product.images[0];

                        return (
                            <article
                                key={product.id}
                                className="grid gap-5 rounded-[2rem] bg-white p-5 shadow-sm md:grid-cols-[140px_1fr_280px]"
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
                                    </div>

                                    <p className="mt-2 text-sm text-neutral-500">
                                        Réf. {product.reference}
                                    </p>

                                    <p className="mt-3 text-neutral-600">
                                        Catégorie : {product.category.name}
                                    </p>

                                    <p className="mt-1 text-neutral-600">
                                        Stock total : {product.totalStock}
                                    </p>

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
                                    {product.isOnSale ? (
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
                                            disabled={
                                                updatingProductId === product.id
                                            }
                                            onChange={(event) =>
                                                handleStatusChange(
                                                    product.id,
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

                                        {updatingProductId === product.id && (
                                            <p className="mt-2 text-sm text-neutral-500">
                                                Mise à jour...
                                            </p>
                                        )}
                                    </div>

                                    {product.status === "PUBLISHED" ? (
                                        <Link
                                            href={`/produit/${product.slug}`}
                                            className="inline-flex rounded-full border border-neutral-300 px-5 py-2 text-sm font-semibold hover:border-black"
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
            </section>
        </main>
    );
}
