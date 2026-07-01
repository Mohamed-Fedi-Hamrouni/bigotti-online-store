"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    createProduct,
    getAdminCategories,
    getAdminCollections,
    getAdminSaleCampaigns,
    uploadProductImage,
} from "@/lib/api";
import type {
    Category,
    Collection,
    CreateProductPayload,
    Product,
    SaleCampaign,
} from "@/types/product";

function slugify(value: string) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export default function NewProductPage() {
    const router = useRouter();

    const [categories, setCategories] = useState<Category[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [saleCampaigns, setSaleCampaigns] = useState<SaleCampaign[]>([]);

    const [createdProduct, setCreatedProduct] = useState<Product | null>(null);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");

    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(
        null,
    );
    const [imagePreviewUrl, setImagePreviewUrl] = useState("");

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = window.localStorage.getItem("bigotti-admin-token");

        if (!token) {
            router.push("/admin/login");
            return;
        }

        Promise.all([
            getAdminCategories(token),
            getAdminCollections(token),
            getAdminSaleCampaigns(token),
        ])
            .then(([categoriesData, collectionsData, campaignsData]) => {
                setCategories(categoriesData);
                setCollections(collectionsData);
                setSaleCampaigns(campaignsData);
            })
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Erreur de chargement.",
                );
            })
            .finally(() => setIsLoading(false));
    }, [router]);

    function logout() {
        window.localStorage.removeItem("bigotti-admin-token");
        window.localStorage.removeItem("bigotti-admin-user");
        router.push("/admin/login");
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        const token = window.localStorage.getItem("bigotti-admin-token");

        if (!token) {
            router.push("/admin/login");
            return;
        }

        const formData = new FormData(event.currentTarget);

        const reference = String(formData.get("reference") ?? "").trim();
        const productName = String(formData.get("name") ?? "").trim();
        const productSlug = String(formData.get("slug") ?? "").trim();
        const categoryId = String(formData.get("categoryId") ?? "");
        const collectionId = String(formData.get("collectionId") ?? "");
        const saleCampaignId = String(formData.get("saleCampaignId") ?? "");
        const price = Number(formData.get("price") ?? 0);
        const discountValue = Number(formData.get("discountValue") ?? 0);

        const color = String(formData.get("color") ?? "").trim() || "Noir";

        const stockS = Number(formData.get("stockS") ?? 0);
        const stockM = Number(formData.get("stockM") ?? 0);
        const stockL = Number(formData.get("stockL") ?? 0);
        const stockXL = Number(formData.get("stockXL") ?? 0);

        const variants = [
            {
                color,
                size: "S",
                stockQuantity: stockS,
                sku: `${reference}-${color}-S`,
                isActive: stockS > 0,
            },
            {
                color,
                size: "M",
                stockQuantity: stockM,
                sku: `${reference}-${color}-M`,
                isActive: stockM > 0,
            },
            {
                color,
                size: "L",
                stockQuantity: stockL,
                sku: `${reference}-${color}-L`,
                isActive: stockL > 0,
            },
            {
                color,
                size: "XL",
                stockQuantity: stockXL,
                sku: `${reference}-${color}-XL`,
                isActive: stockXL > 0,
            },
        ].filter((variant) => variant.stockQuantity > 0);

        if (variants.length === 0) {
            setError(
                "Ajoutez au moins une taille avec un stock supérieur à 0.",
            );
            return;
        }

        try {
            setIsSubmitting(true);

            let uploadedImageUrl = "";

            if (selectedImageFile) {
                const uploadedImage = await uploadProductImage(
                    token,
                    selectedImageFile,
                );

                uploadedImageUrl = uploadedImage.url;
            }

            const payload: CreateProductPayload = {
                reference,
                name: productName,
                slug: productSlug,
                shortDescription: String(
                    formData.get("shortDescription") ?? "",
                ).trim(),
                description: String(formData.get("description") ?? "").trim(),
                categoryId,
                price,
                status: "PUBLISHED",
                isFeatured: formData.get("isFeatured") === "on",
                isNewArrival: formData.get("isNewArrival") === "on",
                isOnSale: discountValue > 0,
                images: uploadedImageUrl
                    ? [
                          {
                              url: uploadedImageUrl,
                              altText: productName,
                              isMain: true,
                              position: 1,
                          },
                      ]
                    : [],
                variants,
            };

            if (collectionId) {
                payload.collectionId = collectionId;
            }

            if (saleCampaignId) {
                payload.saleCampaignId = saleCampaignId;
            }

            if (discountValue > 0) {
                payload.discountType = "PERCENTAGE";
                payload.discountValue = discountValue;
            }

            const product = await createProduct(token, payload);
            setCreatedProduct(product);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la création du produit.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    if (createdProduct) {
        return (
            <main className="min-h-screen bg-neutral-50 text-neutral-950">
                <section className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
                    <div className="w-full rounded-[2rem] bg-white p-10 text-center shadow-sm">
                        <img
                            src="/images/bigotti-logo.jpg"
                            alt="Bigotti Collection"
                            className="mx-auto h-20 w-auto object-contain"
                        />

                        <h1 className="mt-8 text-4xl font-bold">
                            Produit ajouté
                        </h1>

                        <p className="mt-4 text-neutral-600">
                            Le produit est maintenant disponible dans la
                            boutique.
                        </p>

                        <div className="mt-8 rounded-3xl bg-neutral-50 p-6 text-left">
                            <p className="text-sm text-neutral-500">Produit</p>

                            <p className="mt-1 text-2xl font-bold">
                                {createdProduct.name}
                            </p>

                            <p className="mt-2 text-neutral-600">
                                Réf. {createdProduct.reference}
                            </p>
                        </div>

                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Link
                                href={`/produit/${createdProduct.slug}`}
                                className="rounded-full bg-black px-6 py-3 text-sm font-bold text-white"
                            >
                                Voir dans la boutique
                            </Link>

                            <Link
                                href="/admin/produits"
                                className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-bold text-neutral-950 hover:border-black"
                            >
                                Retour produits
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

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
                            href="/admin/produits"
                            className="text-sm font-medium text-neutral-600 hover:text-black"
                        >
                            Produits
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

            <section className="mx-auto max-w-5xl px-6 py-12">
                <div className="mb-8">
                    <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                        Administration
                    </p>

                    <h1 className="mt-2 text-4xl font-bold">
                        Ajouter un produit
                    </h1>

                    <p className="mt-3 text-neutral-600">
                        Créez un article avec son image, son prix et son stock
                        par taille.
                    </p>
                </div>

                {isLoading && (
                    <div className="rounded-3xl bg-white p-8 shadow-sm">
                        Chargement des données...
                    </div>
                )}

                {error && (
                    <div className="mb-6 rounded-3xl bg-red-50 p-6 text-red-700">
                        {error}
                    </div>
                )}

                {!isLoading && (
                    <form
                        onSubmit={handleSubmit}
                        className="rounded-[2rem] bg-white p-8 shadow-sm"
                    >
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-semibold">
                                    Référence
                                </label>
                                <input
                                    name="reference"
                                    required
                                    placeholder="CH-2026-002"
                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold">
                                    Nom produit
                                </label>
                                <input
                                    name="name"
                                    required
                                    value={name}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        setName(value);

                                        if (!slug) {
                                            setSlug(slugify(value));
                                        }
                                    }}
                                    placeholder="Chemise Oxford Bleu Ciel"
                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold">
                                    Slug URL
                                </label>
                                <input
                                    name="slug"
                                    required
                                    value={slug}
                                    onChange={(event) =>
                                        setSlug(slugify(event.target.value))
                                    }
                                    placeholder="chemise-oxford-bleu-ciel"
                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold">
                                    Prix TND
                                </label>
                                <input
                                    name="price"
                                    required
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    placeholder="149"
                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold">
                                    Catégorie
                                </label>
                                <select
                                    name="categoryId"
                                    required
                                    className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                >
                                    <option value="">
                                        Sélectionner une catégorie
                                    </option>

                                    {categories.map((category) => (
                                        <option
                                            key={category.id}
                                            value={category.id}
                                        >
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-semibold">
                                    Collection
                                </label>
                                <select
                                    name="collectionId"
                                    className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                >
                                    <option value="">Aucune collection</option>

                                    {collections.map((collection) => (
                                        <option
                                            key={collection.id}
                                            value={collection.id}
                                        >
                                            {collection.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-semibold">
                                    Campagne de soldes
                                </label>
                                <select
                                    name="saleCampaignId"
                                    className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                >
                                    <option value="">Aucune campagne</option>

                                    {saleCampaigns.map((campaign) => (
                                        <option
                                            key={campaign.id}
                                            value={campaign.id}
                                        >
                                            {campaign.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-semibold">
                                    Remise %
                                </label>
                                <input
                                    name="discountValue"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    placeholder="20"
                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-sm font-semibold">
                                    Image produit
                                </label>

                                <input
                                    name="imageFile"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(event) => {
                                        const file =
                                            event.target.files?.[0] ?? null;

                                        setSelectedImageFile(file);

                                        if (imagePreviewUrl) {
                                            URL.revokeObjectURL(
                                                imagePreviewUrl,
                                            );
                                        }

                                        if (file) {
                                            setImagePreviewUrl(
                                                URL.createObjectURL(file),
                                            );
                                        } else {
                                            setImagePreviewUrl("");
                                        }
                                    }}
                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                />

                                <p className="mt-2 text-sm text-neutral-500">
                                    Formats acceptés : JPG, PNG, WEBP. Taille
                                    maximale : 5 MB.
                                </p>

                                {imagePreviewUrl && (
                                    <div className="mt-4 overflow-hidden rounded-3xl bg-neutral-100">
                                        <img
                                            src={imagePreviewUrl}
                                            alt="Aperçu produit"
                                            className="h-80 w-full object-cover"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-sm font-semibold">
                                    Description courte
                                </label>
                                <input
                                    name="shortDescription"
                                    placeholder="Chemise élégante pour homme."
                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-sm font-semibold">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    rows={4}
                                    placeholder="Description détaillée du produit..."
                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                />
                            </div>
                        </div>

                        <div className="mt-8 rounded-3xl bg-neutral-50 p-6">
                            <h2 className="text-xl font-bold">
                                Stock par taille
                            </h2>

                            <div className="mt-5 grid gap-5 md:grid-cols-5">
                                <div>
                                    <label className="text-sm font-semibold">
                                        Couleur
                                    </label>
                                    <input
                                        name="color"
                                        placeholder="Bleu"
                                        className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold">
                                        S
                                    </label>
                                    <input
                                        name="stockS"
                                        type="number"
                                        min="0"
                                        defaultValue="0"
                                        className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold">
                                        M
                                    </label>
                                    <input
                                        name="stockM"
                                        type="number"
                                        min="0"
                                        defaultValue="0"
                                        className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold">
                                        L
                                    </label>
                                    <input
                                        name="stockL"
                                        type="number"
                                        min="0"
                                        defaultValue="0"
                                        className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold">
                                        XL
                                    </label>
                                    <input
                                        name="stockXL"
                                        type="number"
                                        min="0"
                                        defaultValue="0"
                                        className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 grid gap-4 md:grid-cols-2">
                            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-neutral-300 p-4">
                                <input name="isFeatured" type="checkbox" />
                                <span className="font-semibold">
                                    Produit mis en avant
                                </span>
                            </label>

                            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-neutral-300 p-4">
                                <input name="isNewArrival" type="checkbox" />
                                <span className="font-semibold">Nouveauté</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="mt-8 w-full rounded-full bg-black px-6 py-4 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
                        >
                            {isSubmitting
                                ? "Upload et création en cours..."
                                : "Créer le produit"}
                        </button>
                    </form>
                )}
            </section>
        </main>
    );
}
