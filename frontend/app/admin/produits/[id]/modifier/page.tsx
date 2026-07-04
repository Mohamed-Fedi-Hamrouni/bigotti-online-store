"use client";

import Link from "next/link";
import {
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    ImagePlus,
    PackageCheck,
    Plus,
    Save,
    Shirt,
    Tags,
    Trash2,
    Upload,
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
    { value: "PERCENTAGE", label: "Pourcentage %" },
    { value: "FIXED_AMOUNT", label: "Montant fixe TND" },
];

type EditableImage = {
    url: string;
    storagePath: string | null;
    altText: string;
    color: string;
    colorHex: string;
    isMain: boolean;
    position: number;
};

type EditableVariant = {
    color: string;
    colorHex: string;
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
    categoryTypeId: string;
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

function slugify(value: string) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function toDateInputValue(value: string | null) {
    if (!value) {
        return "";
    }

    return value.slice(0, 10);
}

function formatPrice(value: number | string | null | undefined) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return "0.000 TND";
    }

    return `${numericValue.toFixed(3)} TND`;
}

function calculateFinalPrice(form: ProductFormState) {
    const price = Number(form.price);
    const discountValue = Number(form.discountValue);

    if (!Number.isFinite(price) || price <= 0) {
        return 0;
    }

    if (
        !form.isOnSale ||
        !Number.isFinite(discountValue) ||
        discountValue <= 0
    ) {
        return price;
    }

    if (form.discountType === "PERCENTAGE") {
        return Math.max(0, price - price * (discountValue / 100));
    }

    return Math.max(0, price - discountValue);
}

function getStatusLabel(status: ProductStatus) {
    return (
        PRODUCT_STATUS_OPTIONS.find((option) => option.value === status)
            ?.label ?? status
    );
}

function getStatusClassName(status: ProductStatus) {
    if (status === "PUBLISHED") {
        return "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700";
    }

    if (status === "ARCHIVED") {
        return "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700";
    }

    return "rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700";
}

function normalizeHex(value: string) {
    return value.trim().toUpperCase();
}

function isValidHex(value: string) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value.trim());
}

function getSafeColorInputValue(value: string) {
    return isValidHex(value) ? normalizeHex(value) : "#111111";
}

function createEmptyImage(position: number): EditableImage {
    return {
        url: "",
        storagePath: null,
        altText: "",
        color: "",
        colorHex: "#111111",
        isMain: position === 0,
        position,
    };
}

function createEmptyVariant(): EditableVariant {
    return {
        color: "",
        colorHex: "#111111",
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
        categoryTypeId: product.categoryTypeId ?? "",
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
                      color: image.color ?? "",
                      colorHex: image.colorHex ?? "#111111",
                      isMain: image.isMain,
                      position: image.position ?? index,
                  }))
                : [createEmptyImage(0)],
        variants:
            product.variants.length > 0
                ? product.variants.map((variant) => ({
                      color: variant.color,
                      colorHex: variant.colorHex ?? "#111111",
                      size: variant.size,
                      stockQuantity: String(variant.stockQuantity),
                      sku: variant.sku ?? "",
                  }))
                : [createEmptyVariant()],
    };
}

function buildUpdatePayload(params: {
    form: ProductFormState;
    imagesTouched: boolean;
    variantsTouched: boolean;
}) {
    const { form, imagesTouched, variantsTouched } = params;

    const payload: UpdateProductPayload = {
        reference: form.reference.trim(),
        name: form.name.trim(),
        slug: form.slug.trim(),
        shortDescription: form.shortDescription.trim() || null,
        description: form.description.trim() || null,
        categoryId: form.categoryId,
        categoryTypeId: form.categoryTypeId || null,
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
    };

    if (imagesTouched) {
        const images: CreateProductImagePayload[] = form.images
            .filter((image) => image.url.trim())
            .map((image, index) => ({
                url: image.url.trim(),
                storagePath: image.storagePath,
                altText: image.altText.trim() || form.name.trim(),
                color: image.color.trim() || null,
                colorHex: isValidHex(image.colorHex)
                    ? normalizeHex(image.colorHex)
                    : null,
                isMain: image.isMain,
                position: index,
            }));

        const hasMainImage = images.some((image) => image.isMain);

        payload.images = images.map((image, index) => ({
            ...image,
            isMain: hasMainImage ? Boolean(image.isMain) : index === 0,
            position: index,
        }));
    }

    if (variantsTouched) {
        const variants: CreateProductVariantPayload[] = form.variants
            .filter(
                (variant) =>
                    variant.color.trim() &&
                    variant.size.trim() &&
                    Number(variant.stockQuantity) >= 0,
            )
            .map((variant) => ({
                color: variant.color.trim(),
                colorHex: isValidHex(variant.colorHex)
                    ? normalizeHex(variant.colorHex)
                    : null,
                size: variant.size.trim().toUpperCase(),
                stockQuantity: Number(variant.stockQuantity),
                sku: variant.sku.trim() || undefined,
                isActive: Number(variant.stockQuantity) > 0,
            }));

        payload.variants = variants;
    }

    return payload;
}

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();

    const [form, setForm] = useState<ProductFormState | null>(null);
    const [originalStatus, setOriginalStatus] =
        useState<ProductStatus>("DRAFT");
    const [categories, setCategories] = useState<Category[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [saleCampaigns, setSaleCampaigns] = useState<SaleCampaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingImageIndex, setUploadingImageIndex] = useState<
        number | null
    >(null);
    const [imagesTouched, setImagesTouched] = useState(false);
    const [variantsTouched, setVariantsTouched] = useState(false);
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
                    setOriginalStatus(product.status);
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

    const mainImage = useMemo(() => {
        if (!form) {
            return null;
        }

        return (
            form.images.find((image) => image.isMain && image.url.trim()) ??
            form.images.find((image) => image.url.trim()) ??
            null
        );
    }, [form]);

    const totalStock = useMemo(() => {
        if (!form) {
            return 0;
        }

        return form.variants.reduce(
            (sum, variant) => sum + Number(variant.stockQuantity || 0),
            0,
        );
    }, [form]);

    const finalPrice = form ? calculateFinalPrice(form) : 0;

    const selectedCategory = form
        ? categories.find((category) => category.id === form.categoryId)
        : null;

    const selectedCategoryTypes = useMemo(() => {
        return (selectedCategory?.types ?? []).sort(
            (a, b) =>
                Number(a.position ?? 0) - Number(b.position ?? 0) ||
                a.name.localeCompare(b.name),
        );
    }, [selectedCategory]);

    const selectedCategoryType = form
        ? (selectedCategoryTypes.find(
              (type) => type.id === form.categoryTypeId,
          ) ?? null)
        : null;

    const selectedCollection = form
        ? collections.find((collection) => collection.id === form.collectionId)
        : null;

    const selectedCampaign = form
        ? saleCampaigns.find((campaign) => campaign.id === form.saleCampaignId)
        : null;

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

    function handleSlugChange(value: string) {
        updateField("slug", slugify(value));
    }

    function updateImage(index: number, image: Partial<EditableImage>) {
        setImagesTouched(true);

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
        setImagesTouched(true);

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
        setImagesTouched(true);

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
        setImagesTouched(true);

        setForm((currentForm) => {
            if (!currentForm) {
                return currentForm;
            }

            const remainingImages = currentForm.images.filter(
                (_, currentIndex) => currentIndex !== index,
            );

            const hasMainImage = remainingImages.some((image) => image.isMain);

            const normalizedImages =
                remainingImages.length > 0
                    ? remainingImages.map((image, currentIndex) => ({
                          ...image,
                          isMain: hasMainImage
                              ? image.isMain
                              : currentIndex === 0,
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
        setVariantsTouched(true);

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
        setVariantsTouched(true);

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
        setVariantsTouched(true);

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

    function validateImageFile(file: File) {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        const maxSize = 5 * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
            return "Format image invalide. Utilisez JPG, PNG ou WEBP.";
        }

        if (file.size > maxSize) {
            return "L’image dépasse 5 MB.";
        }

        return "";
    }

    async function handleImageUpload(
        index: number,
        event: ChangeEvent<HTMLInputElement>,
    ) {
        const file = event.target.files?.[0] ?? null;

        if (!file) {
            return;
        }

        const validationError = validateImageFile(file);

        if (validationError) {
            event.target.value = "";
            setError(validationError);
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

    function validateForm(payload: UpdateProductPayload) {
        if (!payload.reference || payload.reference.length < 2) {
            return "La référence doit contenir au moins 2 caractères.";
        }

        if (!payload.name || payload.name.length < 2) {
            return "Le nom du produit doit contenir au moins 2 caractères.";
        }

        if (!payload.slug) {
            return "Le slug est obligatoire.";
        }

        if (!payload.categoryId) {
            return "La catégorie est obligatoire.";
        }

        if (selectedCategoryTypes.length > 0 && !payload.categoryTypeId) {
            return "Le type de catégorie est obligatoire pour cette catégorie.";
        }

        if (!payload.price || payload.price <= 0) {
            return "Le prix doit être supérieur à 0.";
        }

        if (form?.status === "PUBLISHED") {
            const hasImage = form.images.some((image) => image.url.trim());

            if (!hasImage) {
                return "Un produit publié doit avoir au moins une image.";
            }

            if (totalStock <= 0) {
                return "Un produit publié doit avoir au moins une variante avec stock.";
            }
        }

        if (imagesTouched && payload.images) {
            const linkedImageColors = payload.images
                .map((image) => image.color?.trim())
                .filter(Boolean);

            const duplicateColor = linkedImageColors.find(
                (color, index) => linkedImageColors.indexOf(color) !== index,
            );

            if (duplicateColor) {
                return `La couleur "${duplicateColor}" est liée à plusieurs images. Gardez une seule image par couleur.`;
            }

            if (
                payload.images.some(
                    (image) =>
                        image.colorHex !== null &&
                        image.colorHex !== undefined &&
                        !isValidHex(image.colorHex),
                )
            ) {
                return "Chaque image liée à une couleur doit avoir un code couleur HEX valide. Exemple : #111111.";
            }
        }

        if (variantsTouched) {
            if (!payload.variants || payload.variants.length === 0) {
                return "Ajoutez au moins une variante couleur/taille.";
            }

            if (
                payload.variants.some(
                    (variant) =>
                        !Number.isFinite(variant.stockQuantity) ||
                        variant.stockQuantity < 0,
                )
            ) {
                return "Le stock des variantes doit être supérieur ou égal à 0.";
            }

            if (
                payload.variants.some(
                    (variant) =>
                        variant.colorHex !== null &&
                        variant.colorHex !== undefined &&
                        !isValidHex(variant.colorHex),
                )
            ) {
                return "Chaque variante doit avoir un code couleur HEX valide. Exemple : #111111.";
            }
        }

        if (payload.isOnSale && !payload.discountType) {
            return "Le type de remise est obligatoire pour une promo.";
        }

        if (
            payload.isOnSale &&
            (payload.discountValue === null ||
                payload.discountValue === undefined ||
                payload.discountValue <= 0)
        ) {
            return "La valeur de remise doit être supérieure à 0.";
        }

        if (
            payload.isOnSale &&
            payload.discountType === "PERCENTAGE" &&
            payload.discountValue !== null &&
            payload.discountValue !== undefined &&
            payload.discountValue > 100
        ) {
            return "La remise en pourcentage ne peut pas dépasser 100%.";
        }

        if (
            payload.isOnSale &&
            payload.discountType === "FIXED_AMOUNT" &&
            payload.discountValue !== null &&
            payload.discountValue !== undefined &&
            payload.price !== undefined &&
            payload.discountValue >= payload.price
        ) {
            return "La remise fixe doit être inférieure au prix du produit.";
        }

        if (
            payload.discountStartDate &&
            payload.discountEndDate &&
            new Date(payload.discountStartDate).getTime() >
                new Date(payload.discountEndDate).getTime()
        ) {
            return "La date de début de remise doit être avant la date de fin.";
        }

        return "";
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!form) {
            return;
        }

        const token = getAdminToken();

        if (!token) {
            router.push("/admin/login");
            return;
        }

        const payload = buildUpdatePayload({
            form,
            imagesTouched,
            variantsTouched,
        });

        const validationError = validateForm(payload);

        if (validationError) {
            setError(validationError);
            setSuccess("");
            return;
        }

        if (originalStatus !== "ARCHIVED" && payload.status === "ARCHIVED") {
            const confirmed = window.confirm(
                `Confirmer l’archivage du produit "${form.name}" ?\n\nLe produit ne sera pas supprimé. Il ne sera plus visible côté client, mais restera disponible dans l’administration.`,
            );

            if (!confirmed) {
                return;
            }
        }

        if (originalStatus === "ARCHIVED" && payload.status !== "ARCHIVED") {
            const confirmed = window.confirm(
                `Réactiver le produit "${form.name}" avec le statut "${getStatusLabel(
                    payload.status ?? form.status,
                )}" ?`,
            );

            if (!confirmed) {
                return;
            }
        }

        if (variantsTouched) {
            const confirmed = window.confirm(
                "Vous avez modifié les variantes ou le stock.\n\nCette action va remplacer la liste des variantes enregistrées pour ce produit. Confirmer la sauvegarde ?",
            );

            if (!confirmed) {
                return;
            }
        }

        setError("");
        setSuccess("");
        setIsSaving(true);

        try {
            const updatedProduct = await updateProduct(
                token,
                params.id,
                payload,
            );

            setForm(productToFormState(updatedProduct));
            setOriginalStatus(updatedProduct.status);
            setImagesTouched(false);
            setVariantsTouched(false);
            setSuccess("Produit mis à jour avec succès.");
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

                        <p className="mt-3 text-neutral-600">
                            Modifiez les informations, images par couleur,
                            variantes, stock et publication.
                        </p>
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
                    <form
                        onSubmit={handleSubmit}
                        className="grid gap-8 lg:grid-cols-[1fr_380px]"
                    >
                        <div className="space-y-8">
                            {error && (
                                <div className="rounded-2xl bg-red-50 p-5 text-sm font-semibold text-red-700">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="flex items-center gap-3 rounded-2xl bg-green-50 p-5 text-sm font-semibold text-green-700">
                                    <CheckCircle2 size={18} />
                                    {success}
                                </div>
                            )}

                            <section className="rounded-[2rem] bg-white p-8 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <Shirt size={28} />

                                    <h2 className="text-2xl font-black">
                                        Informations produit
                                    </h2>
                                </div>

                                <div className="mt-6 grid gap-5 md:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-bold">
                                            Référence *
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
                                            Nom *
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
                                            Slug *
                                        </label>

                                        <input
                                            value={form.slug}
                                            onChange={(event) =>
                                                handleSlugChange(
                                                    event.target.value,
                                                )
                                            }
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold">
                                            Prix TND *
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
                                            Description détaillée
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
                                <div className="flex items-center gap-3">
                                    <Tags size={28} />

                                    <h2 className="text-2xl font-black">
                                        Classification et prix
                                    </h2>
                                </div>

                                <div className="mt-6 grid gap-5 md:grid-cols-3">
                                    <div>
                                        <label className="text-sm font-bold">
                                            Catégorie *
                                        </label>

                                        <select
                                            value={form.categoryId}
                                            onChange={(event) => {
                                                const nextCategoryId =
                                                    event.target.value;

                                                setForm((currentForm) =>
                                                    currentForm
                                                        ? {
                                                              ...currentForm,
                                                              categoryId:
                                                                  nextCategoryId,
                                                              categoryTypeId:
                                                                  "",
                                                          }
                                                        : currentForm,
                                                );
                                            }}
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
                                                    {!category.isActive
                                                        ? " — désactivée"
                                                        : ""}
                                                </option>
                                            ))}
                                        </select>

                                        {selectedCategory &&
                                            !selectedCategory.isActive && (
                                                <p className="mt-2 text-xs font-semibold text-red-700">
                                                    Catégorie actuellement
                                                    désactivée.
                                                </p>
                                            )}
                                    </div>

                                    {selectedCategoryTypes.length > 0 && (
                                        <div>
                                            <label className="text-sm font-bold">
                                                Type de catégorie *
                                            </label>

                                            <select
                                                value={form.categoryTypeId}
                                                onChange={(event) =>
                                                    updateField(
                                                        "categoryTypeId",
                                                        event.target.value,
                                                    )
                                                }
                                                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                            >
                                                <option value="">
                                                    Choisir un type
                                                </option>

                                                {selectedCategoryTypes.map(
                                                    (type) => (
                                                        <option
                                                            key={type.id}
                                                            value={type.id}
                                                        >
                                                            {type.name}
                                                            {!type.isActive
                                                                ? " — désactivé"
                                                                : ""}
                                                        </option>
                                                    ),
                                                )}
                                            </select>

                                            {selectedCategoryType &&
                                                !selectedCategoryType.isActive && (
                                                    <p className="mt-2 text-xs font-semibold text-red-700">
                                                        Type actuellement
                                                        désactivé.
                                                    </p>
                                                )}
                                        </div>
                                    )}

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

                                            {collections.map((collection) => (
                                                <option
                                                    key={collection.id}
                                                    value={collection.id}
                                                >
                                                    {collection.name}
                                                    {!collection.isActive
                                                        ? " — désactivée"
                                                        : ""}
                                                </option>
                                            ))}
                                        </select>

                                        {selectedCollection &&
                                            !selectedCollection.isActive && (
                                                <p className="mt-2 text-xs font-semibold text-red-700">
                                                    Collection actuellement
                                                    désactivée.
                                                </p>
                                            )}
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

                                            {saleCampaigns.map((campaign) => (
                                                <option
                                                    key={campaign.id}
                                                    value={campaign.id}
                                                >
                                                    {campaign.name}
                                                    {!campaign.isActive
                                                        ? " — désactivée"
                                                        : ""}
                                                </option>
                                            ))}
                                        </select>

                                        {selectedCampaign &&
                                            !selectedCampaign.isActive && (
                                                <p className="mt-2 text-xs font-semibold text-red-700">
                                                    Campagne actuellement
                                                    désactivée.
                                                </p>
                                            )}
                                    </div>
                                </div>

                                <div className="mt-6 rounded-3xl bg-neutral-50 p-6">
                                    <label className="flex cursor-pointer items-center gap-3">
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

                                        <span className="font-bold">
                                            Produit en promotion
                                        </span>
                                    </label>

                                    {form.isOnSale && (
                                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                                            <div>
                                                <label className="text-sm font-bold">
                                                    Type de remise
                                                </label>

                                                <select
                                                    value={form.discountType}
                                                    onChange={(event) =>
                                                        updateField(
                                                            "discountType",
                                                            event.target
                                                                .value as DiscountType,
                                                        )
                                                    }
                                                    className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
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
                                                                {
                                                                    discountType.label
                                                                }
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-sm font-bold">
                                                    Valeur remise
                                                </label>

                                                <input
                                                    type="number"
                                                    step={
                                                        form.discountType ===
                                                        "PERCENTAGE"
                                                            ? "1"
                                                            : "0.001"
                                                    }
                                                    min="0"
                                                    value={form.discountValue}
                                                    onChange={(event) =>
                                                        updateField(
                                                            "discountValue",
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-sm font-bold">
                                                    Date début
                                                </label>

                                                <input
                                                    type="date"
                                                    value={
                                                        form.discountStartDate
                                                    }
                                                    onChange={(event) =>
                                                        updateField(
                                                            "discountStartDate",
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-sm font-bold">
                                                    Date fin
                                                </label>

                                                <input
                                                    type="date"
                                                    value={form.discountEndDate}
                                                    onChange={(event) =>
                                                        updateField(
                                                            "discountEndDate",
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="rounded-[2rem] bg-white p-8 shadow-sm">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <Upload size={28} />

                                        <div>
                                            <h2 className="text-2xl font-black">
                                                Images par couleur
                                            </h2>

                                            <p className="mt-1 text-sm text-neutral-500">
                                                Associez une image à une couleur
                                                exacte : Noir, Bleu, Beige...
                                                L’image principale reste
                                                utilisée dans les cartes
                                                produit.
                                            </p>
                                        </div>
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

                                {imagesTouched && (
                                    <div className="mt-5 flex gap-3 rounded-2xl bg-yellow-50 p-4 text-sm font-semibold text-yellow-800">
                                        <AlertTriangle size={18} />
                                        Les images seront remplacées lors de la
                                        sauvegarde. Vérifiez bien les couleurs
                                        liées aux images.
                                    </div>
                                )}

                                <div className="mt-6 space-y-4">
                                    {form.images.map((image, index) => (
                                        <div
                                            key={`${image.url}-${index}`}
                                            className="grid gap-4 rounded-3xl bg-neutral-50 p-5 md:grid-cols-[130px_1fr_auto]"
                                        >
                                            <div className="overflow-hidden rounded-2xl bg-white">
                                                {image.url ? (
                                                    <img
                                                        src={image.url}
                                                        alt={
                                                            image.altText ||
                                                            form.name
                                                        }
                                                        className="h-32 w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-32 items-center justify-center text-sm text-neutral-400">
                                                        Image
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <input
                                                    value={image.url}
                                                    onChange={(event) =>
                                                        updateImage(index, {
                                                            url: event.target
                                                                .value,
                                                        })
                                                    }
                                                    placeholder="URL de l’image"
                                                    className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
                                                />

                                                <div className="grid gap-3 md:grid-cols-2">
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

                                                    <input
                                                        value={image.color}
                                                        onChange={(event) =>
                                                            updateImage(index, {
                                                                color: event
                                                                    .target
                                                                    .value,
                                                            })
                                                        }
                                                        placeholder="Couleur liée à l’image : Noir, Bleu..."
                                                        className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
                                                    />
                                                </div>

                                                <div className="grid gap-3 md:grid-cols-[80px_1fr]">
                                                    <input
                                                        type="color"
                                                        value={getSafeColorInputValue(
                                                            image.colorHex,
                                                        )}
                                                        onChange={(event) =>
                                                            updateImage(index, {
                                                                colorHex:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        }
                                                        className="h-12 w-full cursor-pointer rounded-2xl border border-neutral-300 bg-white p-1"
                                                        aria-label="Sélecteur couleur image"
                                                    />

                                                    <input
                                                        value={image.colorHex}
                                                        onChange={(event) =>
                                                            updateImage(index, {
                                                                colorHex:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        }
                                                        placeholder="#111111"
                                                        className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm uppercase outline-none focus:border-black"
                                                    />
                                                </div>

                                                <p className="text-xs text-neutral-500">
                                                    Le nom de couleur doit
                                                    correspondre aux variantes.
                                                    Le code HEX sert à afficher
                                                    la pastille couleur exacte
                                                    dans la boutique. Exemple :
                                                    Bleu marine / #0B1F5E.
                                                </p>

                                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-bold hover:border-black">
                                                    <ImagePlus size={16} />
                                                    {uploadingImageIndex ===
                                                    index
                                                        ? "Upload..."
                                                        : "Uploader image"}
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        className="hidden"
                                                        onChange={(event) =>
                                                            handleImageUpload(
                                                                index,
                                                                event,
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
                                    <div className="flex items-center gap-3">
                                        <PackageCheck size={28} />

                                        <div>
                                            <h2 className="text-2xl font-black">
                                                Variantes / stock
                                            </h2>

                                            <p className="mt-1 text-sm text-neutral-500">
                                                Les couleurs ici doivent
                                                correspondre aux couleurs des
                                                images associées.
                                            </p>
                                        </div>
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

                                {variantsTouched && (
                                    <div className="mt-5 flex gap-3 rounded-2xl bg-yellow-50 p-4 text-sm font-semibold text-yellow-800">
                                        <AlertTriangle size={18} />
                                        Les variantes seront remplacées lors de
                                        la sauvegarde. Vérifiez bien les
                                        tailles, couleurs, SKU et stocks.
                                    </div>
                                )}

                                <div className="mt-6 space-y-4">
                                    {form.variants.map((variant, index) => (
                                        <div
                                            key={`${variant.color}-${variant.size}-${index}`}
                                            className="grid gap-4 rounded-3xl bg-neutral-50 p-5 md:grid-cols-[1fr_90px_120px_120px_1fr_auto]"
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
                                                type="color"
                                                value={getSafeColorInputValue(
                                                    variant.colorHex,
                                                )}
                                                onChange={(event) =>
                                                    updateVariant(index, {
                                                        colorHex:
                                                            event.target.value,
                                                    })
                                                }
                                                className="h-12 w-full cursor-pointer rounded-2xl border border-neutral-300 bg-white p-1"
                                                aria-label="Sélecteur couleur variante"
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
                                                value={variant.stockQuantity}
                                                onChange={(event) =>
                                                    updateVariant(index, {
                                                        stockQuantity:
                                                            event.target.value,
                                                    })
                                                }
                                                placeholder="Stock"
                                                className="rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                            />

                                            <input
                                                value={variant.sku}
                                                onChange={(event) =>
                                                    updateVariant(index, {
                                                        sku: event.target.value,
                                                    })
                                                }
                                                placeholder="SKU"
                                                className="rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
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
                                    ))}
                                </div>
                            </section>

                            <section className="rounded-[2rem] bg-white p-8 shadow-sm">
                                <h2 className="text-2xl font-black">
                                    Mise en avant
                                </h2>

                                <div className="mt-6 grid gap-4 md:grid-cols-2">
                                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-neutral-300 p-4">
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

                                        <span className="font-bold">
                                            Produit mis en avant
                                        </span>
                                    </label>

                                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-neutral-300 p-4">
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

                                        <span className="font-bold">
                                            Nouveauté
                                        </span>
                                    </label>
                                </div>
                            </section>

                            <section className="rounded-[2rem] bg-white p-8 shadow-sm">
                                <h2 className="text-2xl font-black">
                                    Publication
                                </h2>

                                <div className="mt-6">
                                    <label className="text-sm font-bold">
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
                                            (option) => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                            </section>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-4 text-sm font-black text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
                            >
                                <Save size={18} />
                                {isSaving
                                    ? "Sauvegarde en cours..."
                                    : "Sauvegarder les modifications"}
                            </button>
                        </div>

                        <aside className="h-fit space-y-6 lg:sticky lg:top-6">
                            <section className="rounded-[2rem] bg-white p-6 shadow-sm">
                                <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                                    Prévisualisation
                                </p>

                                <div className="mt-5 overflow-hidden rounded-[2rem] bg-neutral-100">
                                    {mainImage ? (
                                        <img
                                            src={mainImage.url}
                                            alt={mainImage.altText || form.name}
                                            className="h-80 w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-80 items-center justify-center text-neutral-400">
                                            Image produit
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6">
                                    <div className="flex flex-wrap gap-2">
                                        <span
                                            className={getStatusClassName(
                                                form.status,
                                            )}
                                        >
                                            {getStatusLabel(form.status)}
                                        </span>

                                        {form.isNewArrival && (
                                            <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                                                Nouveauté
                                            </span>
                                        )}

                                        {form.isFeatured && (
                                            <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold text-white">
                                                En avant
                                            </span>
                                        )}

                                        {form.isOnSale && (
                                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                                                Promo
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="mt-4 text-2xl font-black">
                                        {form.name || "Nom du produit"}
                                    </h3>

                                    <p className="mt-2 text-sm text-neutral-500">
                                        Réf.{" "}
                                        {form.reference.trim().toUpperCase() ||
                                            "REFERENCE"}
                                    </p>

                                    <p className="mt-4 text-sm text-neutral-500">
                                        Catégorie
                                    </p>

                                    <p className="mt-1 font-bold">
                                        {selectedCategory?.name ??
                                            "Non sélectionnée"}
                                    </p>

                                    {selectedCategoryType && (
                                        <>
                                            <p className="mt-4 text-sm text-neutral-500">
                                                Type
                                            </p>

                                            <p className="mt-1 font-bold">
                                                {selectedCategoryType.name}
                                            </p>
                                        </>
                                    )}

                                    {selectedCollection && (
                                        <>
                                            <p className="mt-4 text-sm text-neutral-500">
                                                Collection
                                            </p>

                                            <p className="mt-1 font-bold">
                                                {selectedCollection.name}
                                            </p>
                                        </>
                                    )}

                                    {selectedCampaign && (
                                        <>
                                            <p className="mt-4 text-sm text-neutral-500">
                                                Campagne
                                            </p>

                                            <p className="mt-1 font-bold">
                                                {selectedCampaign.name}
                                            </p>
                                        </>
                                    )}

                                    <div className="mt-5 rounded-3xl bg-neutral-50 p-5">
                                        {form.isOnSale ? (
                                            <div>
                                                <p className="text-sm text-neutral-500 line-through">
                                                    {formatPrice(form.price)}
                                                </p>

                                                <p className="mt-1 text-3xl font-black">
                                                    {formatPrice(finalPrice)}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-3xl font-black">
                                                {formatPrice(form.price)}
                                            </p>
                                        )}

                                        <p className="mt-3 text-sm font-bold text-neutral-600">
                                            Stock total : {totalStock}
                                        </p>
                                    </div>

                                    <div className="mt-5 rounded-3xl bg-neutral-50 p-5">
                                        <p className="text-sm font-black">
                                            Images
                                        </p>

                                        <p className="mt-2 text-sm text-neutral-600">
                                            {
                                                form.images.filter((image) =>
                                                    image.url.trim(),
                                                ).length
                                            }{" "}
                                            image(s)
                                        </p>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {form.images
                                                .filter((image) =>
                                                    image.url.trim(),
                                                )
                                                .map((image, index) => (
                                                    <span
                                                        key={`${image.url}-${index}`}
                                                        className="rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-700"
                                                    >
                                                        {image.color.trim()
                                                            ? image.color
                                                            : "Sans couleur"}
                                                        {image.isMain
                                                            ? " • principale"
                                                            : ""}
                                                    </span>
                                                ))}
                                        </div>
                                    </div>

                                    <div className="mt-5 rounded-3xl bg-neutral-50 p-5">
                                        <p className="text-sm font-black">
                                            Variantes
                                        </p>

                                        <p className="mt-2 text-sm text-neutral-600">
                                            {form.variants.length} variante(s)
                                        </p>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {Array.from(
                                                new Set(
                                                    form.variants
                                                        .map((variant) =>
                                                            variant.color.trim(),
                                                        )
                                                        .filter(Boolean),
                                                ),
                                            ).map((color) => (
                                                <span
                                                    key={color}
                                                    className="rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-700"
                                                >
                                                    {color}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-[2rem] bg-white p-6 text-sm text-neutral-600 shadow-sm">
                                <p className="font-black text-neutral-950">
                                    Rappel important
                                </p>

                                <p className="mt-3 leading-6">
                                    Pour que le changement d’image fonctionne
                                    côté client, la couleur de l’image doit être
                                    identique à la couleur des variantes.
                                </p>

                                <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
                                    <p>Variante : Bleu / 40 / stock 5</p>
                                    <p>Image : couleur Bleu</p>
                                </div>
                            </section>
                        </aside>
                    </form>
                )}
            </section>
        </main>
    );
}
