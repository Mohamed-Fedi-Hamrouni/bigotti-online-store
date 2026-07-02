"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    ImagePlus,
    PackageCheck,
    Plus,
    Save,
    Trash2,
} from "lucide-react";
import {
    getAdminCategories,
    getAdminCollections,
    getAdminProduct,
    getAdminSaleCampaigns,
    updateProduct,
    uploadProductImage,
} from "@/lib/api";
import type {
    Category,
    Collection,
    CreateProductImagePayload,
    CreateProductVariantPayload,
    DiscountType,
    Product,
    ProductStatus,
    SaleCampaign,
    UpdateProductPayload,
} from "@/types/product";

const PRODUCT_STATUS_OPTIONS: Array<{
    value: ProductStatus;
    label: string;
}> = [
    { value: "DRAFT", label: "Brouillon" },
    { value: "PUBLISHED", label: "Publié" },
    { value: "ARCHIVED", label: "Archivé" },
];

const DISCOUNT_TYPE_OPTIONS: Array<{
    value: DiscountType;
    label: string;
}> = [
    { value: "PERCENTAGE", label: "Pourcentage" },
    { value: "FIXED_AMOUNT", label: "Montant fixe" },
];

type EditableImage = {
    url: string;
    storagePath: string | null;
    altText: string;
    isMain: boolean;
    position: number;
};

type EditableVariant = {
    color: string;
    size: string;
    stockQuantity: string;
    sku: string;
};

type ProductFormState = {
    reference: string;
    name: string;
    slug: string;
    shortDescription: string;
    description: string;
    categoryId: string;
    collectionId: string;
    saleCampaignId: string;
    price: string;
    status: ProductStatus;
    isFeatured: boolean;
    isNewArrival: boolean;
    isOnSale: boolean;
    discountType: DiscountType;
    discountValue: string;
    discountStartDate: string;
    discountEndDate: string;
    images: EditableImage[];
    variants: EditableVariant[];
};

function getAdminToken() {
    if (typeof window === "undefined") {
        return null;
    }

    return window.localStorage.getItem("bigotti-admin-token");
}

function toDateInputValue(value: string | null) {
    if (!value) {
        return "";
    }

    return value.slice(0, 10);
}

function createEmptyImage(position: number): EditableImage {
    return {
        url: "",
        storagePath: null,
        altText: "",
        isMain: position === 0,
        position,
    };
}

function createEmptyVariant(): EditableVariant {
    return {
        color: "",
        size: "",
        stockQuantity: "0",
        sku: "",
    };
}

function productToFormState(product: Product): ProductFormState {
    return {
        reference: product.reference,
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription ?? "",
        description: product.description ?? "",
        categoryId: product.categoryId,
        collectionId: product.collectionId ?? "",
        saleCampaignId: product.saleCampaignId ?? "",
        price: String(product.price),
        status: product.status,
        isFeatured: product.isFeatured,
        isNewArrival: product.isNewArrival,
        isOnSale: product.isOnSale,
        discountType: product.discountType ?? "PERCENTAGE",
        discountValue:
            product.discountValue !== null ? String(product.discountValue) : "",
        discountStartDate: toDateInputValue(product.discountStartDate),
        discountEndDate: toDateInputValue(product.discountEndDate),
        images:
            product.images.length > 0
                ? product.images.map((image, index) => ({
                      url: image.url,
                      storagePath: image.storagePath,
                      altText: image.altText ?? product.name,
                      isMain: image.isMain,
                      position: image.position ?? index,
                  }))
                : [createEmptyImage(0)],
        variants:
            product.variants.length > 0
                ? product.variants.map((variant) => ({
                      color: variant.color,
                      size: variant.size,
                      stockQuantity: String(variant.stockQuantity),
                      sku: variant.sku ?? "",
                  }))
                : [createEmptyVariant()],
    };
}

function buildUpdatePayload(form: ProductFormState): UpdateProductPayload {
    const images: CreateProductImagePayload[] = form.images
        .filter((image) => image.url.trim())
        .map((image, index) => ({
            url: image.url.trim(),
            storagePath: image.storagePath,
            altText: image.altText.trim() || form.name.trim(),
            isMain: image.isMain,
            position: index,
        }));

    const hasMainImage = images.some((image) => image.isMain);

    const normalizedImages = images.map((image, index) => ({
        ...image,
        isMain: hasMainImage ? Boolean(image.isMain) : index === 0,
        position: index,
    }));

    const variants: CreateProductVariantPayload[] = form.variants
        .filter((variant) => variant.color.trim() && variant.size.trim())
        .map((variant) => ({
            color: variant.color.trim(),
            size: variant.size.trim(),
            stockQuantity: Number(variant.stockQuantity),
            sku: variant.sku.trim() || undefined,
            isActive: true,
        }));

    return {
        reference: form.reference.trim(),
        name: form.name.trim(),
        slug: form.slug.trim(),
        shortDescription: form.shortDescription.trim() || null,
        description: form.description.trim() || null,
        categoryId: form.categoryId,
        collectionId: form.collectionId || null,
        saleCampaignId: form.saleCampaignId || null,
        price: Number(form.price),
        status: form.status,
        isFeatured: form.isFeatured,
        isNewArrival: form.isNewArrival,
        isOnSale: form.isOnSale,
        discountType: form.isOnSale ? form.discountType : null,
        discountValue: form.isOnSale
            ? form.discountValue
                ? Number(form.discountValue)
                : null
            : null,
        discountStartDate:
            form.isOnSale && form.discountStartDate
                ? form.discountStartDate
                : null,
        discountEndDate:
            form.isOnSale && form.discountEndDate ? form.discountEndDate : null,
        images: normalizedImages,
        variants,
    };
}

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();

    const [form, setForm] = useState<ProductFormState | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [saleCampaigns, setSaleCampaigns] = useState<SaleCampaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingImageIndex, setUploadingImageIndex] = useState<
        number | null
    >(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        const token = getAdminToken();

        if (!token) {
            router.push("/admin/login");
            return;
        }

        Promise.all([
            getAdminProduct(token, params.id),
            getAdminCategories(token),
            getAdminCollections(token),
            getAdminSaleCampaigns(token),
        ])
            .then(
                ([product, categoriesResult, collectionsResult, campaigns]) => {
                    setForm(productToFormState(product));
                    setCategories(categoriesResult);
                    setCollections(collectionsResult);
                    setSaleCampaigns(campaigns);
                },
            )
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Erreur lors du chargement du produit.",
                );
            })
            .finally(() => setIsLoading(false));
    }, [params.id, router]);

    function updateField<K extends keyof ProductFormState>(
        field: K,
        value: ProductFormState[K],
    ) {
        setForm((currentForm) =>
            currentForm
                ? {
                      ...currentForm,
                      [field]: value,
                  }
                : currentForm,
        );
    }

    function updateImage(index: number, image: Partial<EditableImage>) {
        setForm((currentForm) => {
            if (!currentForm) {
                return currentForm;
            }

            return {
                ...currentForm,
                images: currentForm.images.map((currentImage, currentIndex) =>
                    currentIndex === index
                        ? {
                              ...currentImage,
                              ...image,
                          }
                        : currentImage,
                ),
            };
        });
    }

    function setMainImage(index: number) {
        setForm((currentForm) => {
            if (!currentForm) {
                return currentForm;
            }

            return {
                ...currentForm,
                images: currentForm.images.map((image, currentIndex) => ({
                    ...image,
                    isMain: currentIndex === index,
                })),
            };
        });
    }

    function addImage() {
        setForm((currentForm) => {
            if (!currentForm) {
                return currentForm;
            }

            return {
                ...currentForm,
                images: [
                    ...currentForm.images,
                    createEmptyImage(currentForm.images.length),
                ],
            };
        });
    }

    function removeImage(index: number) {
        setForm((currentForm) => {
            if (!currentForm) {
                return currentForm;
            }

            const remainingImages = currentForm.images.filter(
                (_, currentIndex) => currentIndex !== index,
            );

            const normalizedImages =
                remainingImages.length > 0
                    ? remainingImages.map((image, currentIndex) => ({
                          ...image,
                          isMain:
                              image.isMain ||
                              (!remainingImages.some(
                                  (remainingImage) => remainingImage.isMain,
                              ) &&
                                  currentIndex === 0),
                          position: currentIndex,
                      }))
                    : [createEmptyImage(0)];

            return {
                ...currentForm,
                images: normalizedImages,
            };
        });
    }

    function updateVariant(index: number, variant: Partial<EditableVariant>) {
        setForm((currentForm) => {
            if (!currentForm) {
                return currentForm;
            }

            return {
                ...currentForm,
                variants: currentForm.variants.map(
                    (currentVariant, currentIndex) =>
                        currentIndex === index
                            ? {
                                  ...currentVariant,
                                  ...variant,
                              }
                            : currentVariant,
                ),
            };
        });
    }

    function addVariant() {
        setForm((currentForm) => {
            if (!currentForm) {
                return currentForm;
            }

            return {
                ...currentForm,
                variants: [...currentForm.variants, createEmptyVariant()],
            };
        });
    }

    function removeVariant(index: number) {
        setForm((currentForm) => {
            if (!currentForm) {
                return currentForm;
            }

            const remainingVariants = currentForm.variants.filter(
                (_, currentIndex) => currentIndex !== index,
            );

            return {
                ...currentForm,
                variants:
                    remainingVariants.length > 0
                        ? remainingVariants
                        : [createEmptyVariant()],
            };
        });
    }

    async function handleImageUpload(index: number, file: File | null) {
        if (!file) {
            return;
        }

        const token = getAdminToken();

        if (!token) {
            router.push("/admin/login");
            return;
        }

        setError("");
        setUploadingImageIndex(index);

        try {
            const uploadedImage = await uploadProductImage(token, file);

            updateImage(index, {
                url: uploadedImage.url,
                storagePath: uploadedImage.storagePath,
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de l’upload de l’image.",
            );
        } finally {
            setUploadingImageIndex(null);
        }
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!form) {
            return;
        }

        const token = getAdminToken();

        if (!token) {
            router.push("/admin/login");
            return;
        }

        const payload = buildUpdatePayload(form);

        if (!payload.reference || !payload.name || !payload.slug) {
            setError("La référence, le nom et le slug sont obligatoires.");
            return;
        }

        if (!payload.categoryId) {
            setError("La catégorie est obligatoire.");
            return;
        }

        if (!payload.price || payload.price <= 0) {
            setError("Le prix doit être supérieur à 0.");
            return;
        }

        if (!payload.variants || payload.variants.length === 0) {
            setError("Ajoutez au moins une variante couleur/taille.");
            return;
        }

        if (
            payload.variants.some(
                (variant) =>
                    !Number.isFinite(variant.stockQuantity) ||
                    variant.stockQuantity < 0,
            )
        ) {
            setError("Le stock des variantes doit être supérieur ou égal à 0.");
            return;
        }

        if (payload.isOnSale && !payload.discountType) {
            setError("Le type de remise est obligatoire pour une promo.");
            return;
        }

        if (
            payload.isOnSale &&
            (payload.discountValue === null ||
                payload.discountValue === undefined ||
                payload.discountValue <= 0)
        ) {
            setError("La valeur de remise doit être supérieure à 0.");
            return;
        }

        setError("");
        setSuccess("");
        setIsSaving(true);

        try {
            await updateProduct(token, params.id, payload);
            setSuccess("Produit mis à jour avec succès.");

            setTimeout(() => {
                router.push("/admin/produits");
            }, 800);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la mise à jour du produit.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <section className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link
                            href="/admin/produits"
                            className="inline-flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-black"
                        >
                            <ArrowLeft size={18} />
                            Retour aux produits
                        </Link>

                        <p className="mt-5 text-sm uppercase tracking-[0.25em] text-neutral-500">
                            Administration
                        </p>

                        <h1 className="mt-2 text-4xl font-black">
                            Modifier le produit
                        </h1>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/admin"
                            className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold hover:border-black"
                        >
                            Tableau de bord
                        </Link>

                        <Link
                            href="/admin/produits/nouveau"
                            className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
                        >
                            Nouveau produit
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-8">
                {isLoading && (
                    <div className="rounded-[2rem] bg-white p-8 shadow-sm">
                        Chargement du produit...
                    </div>
                )}

                {!isLoading && error && !form && (
                    <div className="rounded-[2rem] bg-red-50 p-8 text-sm font-semibold text-red-700 shadow-sm">
                        {error}
                    </div>
                )}

                {form && (
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {error && (
                            <div className="rounded-2xl bg-red-50 p-5 text-sm font-semibold text-red-700">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="rounded-2xl bg-green-50 p-5 text-sm font-semibold text-green-700">
                                {success}
                            </div>
                        )}

                        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
                            <div className="space-y-8">
                                <section className="rounded-[2rem] bg-white p-8 shadow-sm">
                                    <h2 className="text-2xl font-black">
                                        Informations générales
                                    </h2>

                                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                                        <div>
                                            <label className="text-sm font-bold">
                                                Référence
                                            </label>

                                            <input
                                                value={form.reference}
                                                onChange={(event) =>
                                                    updateField(
                                                        "reference",
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold">
                                                Nom
                                            </label>

                                            <input
                                                value={form.name}
                                                onChange={(event) =>
                                                    updateField(
                                                        "name",
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold">
                                                Slug
                                            </label>

                                            <input
                                                value={form.slug}
                                                onChange={(event) =>
                                                    updateField(
                                                        "slug",
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold">
                                                Prix
                                            </label>

                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0"
                                                value={form.price}
                                                onChange={(event) =>
                                                    updateField(
                                                        "price",
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="text-sm font-bold">
                                                Description courte
                                            </label>

                                            <input
                                                value={form.shortDescription}
                                                onChange={(event) =>
                                                    updateField(
                                                        "shortDescription",
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="text-sm font-bold">
                                                Description
                                            </label>

                                            <textarea
                                                rows={6}
                                                value={form.description}
                                                onChange={(event) =>
                                                    updateField(
                                                        "description",
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-[2rem] bg-white p-8 shadow-sm">
                                    <h2 className="text-2xl font-black">
                                        Classification
                                    </h2>

                                    <div className="mt-6 grid gap-5 md:grid-cols-3">
                                        <div>
                                            <label className="text-sm font-bold">
                                                Catégorie
                                            </label>

                                            <select
                                                value={form.categoryId}
                                                onChange={(event) =>
                                                    updateField(
                                                        "categoryId",
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                            >
                                                <option value="">
                                                    Choisir une catégorie
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
                                            <label className="text-sm font-bold">
                                                Collection
                                            </label>

                                            <select
                                                value={form.collectionId}
                                                onChange={(event) =>
                                                    updateField(
                                                        "collectionId",
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                            >
                                                <option value="">
                                                    Aucune collection
                                                </option>

                                                {collections.map(
                                                    (collection) => (
                                                        <option
                                                            key={collection.id}
                                                            value={
                                                                collection.id
                                                            }
                                                        >
                                                            {collection.name}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold">
                                                Campagne
                                            </label>

                                            <select
                                                value={form.saleCampaignId}
                                                onChange={(event) =>
                                                    updateField(
                                                        "saleCampaignId",
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                            >
                                                <option value="">
                                                    Aucune campagne
                                                </option>

                                                {saleCampaigns.map(
                                                    (campaign) => (
                                                        <option
                                                            key={campaign.id}
                                                            value={campaign.id}
                                                        >
                                                            {campaign.name}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-[2rem] bg-white p-8 shadow-sm">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-2xl font-black">
                                                Images
                                            </h2>

                                            <p className="mt-1 text-sm text-neutral-500">
                                                L’image principale sera affichée
                                                en premier.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={addImage}
                                            className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold hover:border-black"
                                        >
                                            <Plus size={18} />
                                            Image
                                        </button>
                                    </div>

                                    <div className="mt-6 space-y-4">
                                        {form.images.map((image, index) => (
                                            <div
                                                key={`${image.url}-${index}`}
                                                className="grid gap-4 rounded-3xl bg-neutral-50 p-5 md:grid-cols-[120px_1fr_auto]"
                                            >
                                                <div className="overflow-hidden rounded-2xl bg-white">
                                                    {image.url ? (
                                                        <img
                                                            src={image.url}
                                                            alt={
                                                                image.altText ||
                                                                form.name
                                                            }
                                                            className="h-28 w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-28 items-center justify-center text-sm text-neutral-400">
                                                            Image
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-3">
                                                    <input
                                                        value={image.url}
                                                        onChange={(event) =>
                                                            updateImage(index, {
                                                                url: event
                                                                    .target
                                                                    .value,
                                                            })
                                                        }
                                                        placeholder="URL de l’image"
                                                        className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
                                                    />

                                                    <input
                                                        value={image.altText}
                                                        onChange={(event) =>
                                                            updateImage(index, {
                                                                altText:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        }
                                                        placeholder="Texte alternatif"
                                                        className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
                                                    />

                                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-bold hover:border-black">
                                                        <ImagePlus size={16} />
                                                        {uploadingImageIndex ===
                                                        index
                                                            ? "Upload..."
                                                            : "Uploader"}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(event) =>
                                                                handleImageUpload(
                                                                    index,
                                                                    event.target
                                                                        .files?.[0] ??
                                                                        null,
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setMainImage(index)
                                                        }
                                                        className={
                                                            image.isMain
                                                                ? "rounded-full bg-black px-4 py-2 text-sm font-bold text-white"
                                                                : "rounded-full border border-neutral-300 px-4 py-2 text-sm font-bold hover:border-black"
                                                        }
                                                    >
                                                        Principale
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeImage(index)
                                                        }
                                                        className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:border-red-600"
                                                    >
                                                        <Trash2 size={16} />
                                                        Supprimer
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="rounded-[2rem] bg-white p-8 shadow-sm">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-2xl font-black">
                                                Variantes / stock
                                            </h2>

                                            <p className="mt-1 text-sm text-neutral-500">
                                                Chaque combinaison
                                                couleur/taille a son propre
                                                stock.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={addVariant}
                                            className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold hover:border-black"
                                        >
                                            <Plus size={18} />
                                            Variante
                                        </button>
                                    </div>

                                    <div className="mt-6 space-y-4">
                                        {form.variants.map((variant, index) => (
                                            <div
                                                key={`${variant.color}-${variant.size}-${index}`}
                                                className="grid gap-4 rounded-3xl bg-neutral-50 p-5 md:grid-cols-4"
                                            >
                                                <input
                                                    value={variant.color}
                                                    onChange={(event) =>
                                                        updateVariant(index, {
                                                            color: event.target
                                                                .value,
                                                        })
                                                    }
                                                    placeholder="Couleur"
                                                    className="rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                                />

                                                <input
                                                    value={variant.size}
                                                    onChange={(event) =>
                                                        updateVariant(index, {
                                                            size: event.target
                                                                .value,
                                                        })
                                                    }
                                                    placeholder="Taille"
                                                    className="rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                                />

                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={
                                                        variant.stockQuantity
                                                    }
                                                    onChange={(event) =>
                                                        updateVariant(index, {
                                                            stockQuantity:
                                                                event.target
                                                                    .value,
                                                        })
                                                    }
                                                    placeholder="Stock"
                                                    className="rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                                />

                                                <div className="flex gap-2">
                                                    <input
                                                        value={variant.sku}
                                                        onChange={(event) =>
                                                            updateVariant(
                                                                index,
                                                                {
                                                                    sku: event
                                                                        .target
                                                                        .value,
                                                                },
                                                            )
                                                        }
                                                        placeholder="SKU"
                                                        className="min-w-0 flex-1 rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeVariant(index)
                                                        }
                                                        className="rounded-2xl border border-red-200 px-4 text-red-700 hover:border-red-600"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <aside className="h-fit space-y-6">
                                <section className="rounded-[2rem] bg-white p-8 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <PackageCheck size={28} />

                                        <h2 className="text-2xl font-black">
                                            Publication
                                        </h2>
                                    </div>

                                    <label className="mt-6 block text-sm font-bold">
                                        Statut
                                    </label>

                                    <select
                                        value={form.status}
                                        onChange={(event) =>
                                            updateField(
                                                "status",
                                                event.target
                                                    .value as ProductStatus,
                                            )
                                        }
                                        className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
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

                                    <div className="mt-6 space-y-4">
                                        <label className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-50 p-4 text-sm font-bold">
                                            Produit en avant
                                            <input
                                                type="checkbox"
                                                checked={form.isFeatured}
                                                onChange={(event) =>
                                                    updateField(
                                                        "isFeatured",
                                                        event.target.checked,
                                                    )
                                                }
                                            />
                                        </label>

                                        <label className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-50 p-4 text-sm font-bold">
                                            Nouveauté
                                            <input
                                                type="checkbox"
                                                checked={form.isNewArrival}
                                                onChange={(event) =>
                                                    updateField(
                                                        "isNewArrival",
                                                        event.target.checked,
                                                    )
                                                }
                                            />
                                        </label>

                                        <label className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-50 p-4 text-sm font-bold">
                                            En promotion
                                            <input
                                                type="checkbox"
                                                checked={form.isOnSale}
                                                onChange={(event) =>
                                                    updateField(
                                                        "isOnSale",
                                                        event.target.checked,
                                                    )
                                                }
                                            />
                                        </label>
                                    </div>
                                </section>

                                <section className="rounded-[2rem] bg-white p-8 shadow-sm">
                                    <h2 className="text-2xl font-black">
                                        Promotion
                                    </h2>

                                    <div className="mt-6 space-y-5">
                                        <div>
                                            <label className="text-sm font-bold">
                                                Type de remise
                                            </label>

                                            <select
                                                value={form.discountType}
                                                disabled={!form.isOnSale}
                                                onChange={(event) =>
                                                    updateField(
                                                        "discountType",
                                                        event.target
                                                            .value as DiscountType,
                                                    )
                                                }
                                                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100"
                                            >
                                                {DISCOUNT_TYPE_OPTIONS.map(
                                                    (discountType) => (
                                                        <option
                                                            key={
                                                                discountType.value
                                                            }
                                                            value={
                                                                discountType.value
                                                            }
                                                        >
                                                            {discountType.label}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold">
                                                Valeur
                                            </label>

                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0"
                                                disabled={!form.isOnSale}
                                                value={form.discountValue}
                                                onChange={(event) =>
                                                    updateField(
                                                        "discountValue",
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold">
                                                Date début
                                            </label>

                                            <input
                                                type="date"
                                                disabled={!form.isOnSale}
                                                value={form.discountStartDate}
                                                onChange={(event) =>
                                                    updateField(
                                                        "discountStartDate",
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold">
                                                Date fin
                                            </label>

                                            <input
                                                type="date"
                                                disabled={!form.isOnSale}
                                                value={form.discountEndDate}
                                                onChange={(event) =>
                                                    updateField(
                                                        "discountEndDate",
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black disabled:bg-neutral-100"
                                            />
                                        </div>
                                    </div>
                                </section>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-4 text-sm font-black text-white transition hover:bg-neutral-800 disabled:opacity-60"
                                >
                                    <Save size={18} />

                                    {isSaving ? "Sauvegarde..." : "Sauvegarder"}
                                </button>
                            </aside>
                        </div>
                    </form>
                )}
            </section>
        </main>
    );
}
