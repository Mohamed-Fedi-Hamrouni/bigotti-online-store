"use client";

import Link from "next/link";
import {
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
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
    DiscountType,
    Product,
    ProductStatus,
    SaleCampaign,
} from "@/types/product";

const CLOTHING_SIZES = ["S", "M", "L", "XL", "XXL", "3XL"] as const;
const SHOE_SIZES = ["40", "41", "42", "43", "44", "45"] as const;
const BERMUDA_SIZES = ["30", "32", "34", "36", "38", "40"] as const;
const PANTS_SIZES = ["40", "42", "44", "46", "48", "50", "52"] as const;
const SUIT_SIZES = ["46", "48", "50", "54", "56"] as const;

type SizeMode = "CLOTHING" | "SHOES" | "BERMUDA" | "PANTS" | "SUIT";
type ProductSize = string;

type ColorStockVariant = {
    color: string;
    stockBySize: Record<ProductSize, string>;
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
    sizeMode: SizeMode;
};

const emptyForm: ProductFormState = {
    reference: "",
    name: "",
    slug: "",
    shortDescription: "",
    description: "",
    categoryId: "",
    collectionId: "",
    saleCampaignId: "",
    price: "",
    status: "DRAFT",
    isFeatured: false,
    isNewArrival: true,
    isOnSale: false,
    discountType: "PERCENTAGE",
    discountValue: "",
    sizeMode: "CLOTHING",
};

function getSizesByMode(sizeMode: SizeMode): ProductSize[] {
    if (sizeMode === "SHOES") {
        return [...SHOE_SIZES];
    }

    if (sizeMode === "BERMUDA") {
        return [...BERMUDA_SIZES];
    }

    if (sizeMode === "PANTS") {
        return [...PANTS_SIZES];
    }

    if (sizeMode === "SUIT") {
        return [...SUIT_SIZES];
    }

    return [...CLOTHING_SIZES];
}

function getSizeModeLabel(sizeMode: SizeMode) {
    if (sizeMode === "SHOES") {
        return "Chaussures";
    }

    if (sizeMode === "BERMUDA") {
        return "Bermuda";
    }

    if (sizeMode === "PANTS") {
        return "Pantalon";
    }

    if (sizeMode === "SUIT") {
        return "Costume";
    }

    return "Vêtements";
}

function createEmptyStockBySize(sizeMode: SizeMode) {
    return getSizesByMode(sizeMode).reduce<Record<ProductSize, string>>(
        (stock, size) => {
            stock[size] = "0";
            return stock;
        },
        {},
    );
}

function createColorVariant(
    sizeMode: SizeMode,
    color = "Noir",
): ColorStockVariant {
    return {
        color,
        stockBySize: createEmptyStockBySize(sizeMode),
    };
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
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

function getAdminToken() {
    if (typeof window === "undefined") {
        return null;
    }

    return window.localStorage.getItem("bigotti-admin-token");
}

export default function NewProductPage() {
    const router = useRouter();

    const [categories, setCategories] = useState<Category[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [saleCampaigns, setSaleCampaigns] = useState<SaleCampaign[]>([]);

    const [form, setForm] = useState<ProductFormState>(emptyForm);
    const [colorVariants, setColorVariants] = useState<ColorStockVariant[]>([
        createColorVariant("CLOTHING", "Noir"),
    ]);
    const [isSlugTouched, setIsSlugTouched] = useState(false);

    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(
        null,
    );
    const [imagePreviewUrl, setImagePreviewUrl] = useState("");

    const [createdProduct, setCreatedProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = getAdminToken();

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

    useEffect(() => {
        return () => {
            if (imagePreviewUrl) {
                URL.revokeObjectURL(imagePreviewUrl);
            }
        };
    }, [imagePreviewUrl]);

    const activeCategories = useMemo(
        () => categories.filter((category) => category.isActive),
        [categories],
    );

    const activeCollections = useMemo(
        () => collections.filter((collection) => collection.isActive),
        [collections],
    );

    const activeSaleCampaigns = useMemo(
        () => saleCampaigns.filter((campaign) => campaign.isActive),
        [saleCampaigns],
    );

    const availableSizes = useMemo(
        () => getSizesByMode(form.sizeMode),
        [form.sizeMode],
    );

    const totalStock = useMemo(
        () =>
            colorVariants.reduce(
                (total, colorVariant) =>
                    total +
                    availableSizes.reduce(
                        (sum, size) =>
                            sum + Number(colorVariant.stockBySize[size] || 0),
                        0,
                    ),
                0,
            ),
        [availableSizes, colorVariants],
    );

    const finalPrice = calculateFinalPrice(form);

    const selectedCategory = activeCategories.find(
        (category) => category.id === form.categoryId,
    );

    function logout() {
        window.localStorage.removeItem("bigotti-admin-token");
        window.localStorage.removeItem("bigotti-admin-user");
        router.push("/admin/login");
    }

    function updateFormField<K extends keyof ProductFormState>(
        field: K,
        value: ProductFormState[K],
    ) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
    }

    function handleNameChange(value: string) {
        setForm((currentForm) => ({
            ...currentForm,
            name: value,
            slug: isSlugTouched ? currentForm.slug : slugify(value),
        }));
    }

    function handleSlugChange(value: string) {
        setIsSlugTouched(true);
        updateFormField("slug", slugify(value));
    }

    function handleSizeModeChange(sizeMode: SizeMode) {
        if (form.sizeMode === sizeMode) {
            return;
        }

        const confirmed =
            totalStock === 0 ||
            window.confirm(
                "Changer le type de tailles va réinitialiser le stock saisi. Continuer ?",
            );

        if (!confirmed) {
            return;
        }

        setForm((currentForm) => ({
            ...currentForm,
            sizeMode,
        }));

        setColorVariants([createColorVariant(sizeMode, "Noir")]);
    }

    function updateColorVariantColor(index: number, color: string) {
        setColorVariants((currentVariants) =>
            currentVariants.map((variant, currentIndex) =>
                currentIndex === index
                    ? {
                          ...variant,
                          color,
                      }
                    : variant,
            ),
        );
    }

    function updateColorVariantStock(
        colorIndex: number,
        size: ProductSize,
        stock: string,
    ) {
        setColorVariants((currentVariants) =>
            currentVariants.map((variant, currentIndex) =>
                currentIndex === colorIndex
                    ? {
                          ...variant,
                          stockBySize: {
                              ...variant.stockBySize,
                              [size]: stock,
                          },
                      }
                    : variant,
            ),
        );
    }

    function addColorVariant() {
        setColorVariants((currentVariants) => [
            ...currentVariants,
            createColorVariant(form.sizeMode, ""),
        ]);
    }

    function removeColorVariant(index: number) {
        setColorVariants((currentVariants) => {
            const remainingVariants = currentVariants.filter(
                (_, currentIndex) => currentIndex !== index,
            );

            return remainingVariants.length > 0
                ? remainingVariants
                : [createColorVariant(form.sizeMode, "Noir")];
        });
    }

    function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] ?? null;

        setError("");

        if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl);
            setImagePreviewUrl("");
        }

        if (!file) {
            setSelectedImageFile(null);
            return;
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        const maxSize = 5 * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
            event.target.value = "";
            setSelectedImageFile(null);
            setError("Format image invalide. Utilisez JPG, PNG ou WEBP.");
            return;
        }

        if (file.size > maxSize) {
            event.target.value = "";
            setSelectedImageFile(null);
            setError("L’image dépasse 5 MB.");
            return;
        }

        setSelectedImageFile(file);
        setImagePreviewUrl(URL.createObjectURL(file));
    }

    function buildVariants() {
        const reference = form.reference.trim().toUpperCase();

        return colorVariants.flatMap((colorVariant) => {
            const color = colorVariant.color.trim();

            if (!color) {
                return [];
            }

            const skuColor = slugify(color).toUpperCase() || "COLOR";

            return availableSizes
                .map((size) => {
                    const stockQuantity = Number(
                        colorVariant.stockBySize[size] || 0,
                    );

                    return {
                        color,
                        size,
                        stockQuantity,
                        sku: `${reference}-${skuColor}-${size}`,
                        isActive: stockQuantity > 0,
                    };
                })
                .filter((variant) => variant.stockQuantity > 0);
        });
    }

    function validateForm() {
        const price = Number(form.price);
        const discountValue = Number(form.discountValue);
        const variants = buildVariants();

        if (form.reference.trim().length < 2) {
            return "La référence doit contenir au moins 2 caractères.";
        }

        if (form.name.trim().length < 2) {
            return "Le nom du produit doit contenir au moins 2 caractères.";
        }

        if (!form.slug.trim()) {
            return "Le slug URL est obligatoire.";
        }

        if (!form.categoryId) {
            return "Sélectionnez une catégorie active.";
        }

        if (!Number.isFinite(price) || price <= 0) {
            return "Le prix doit être supérieur à 0.";
        }

        if (!selectedImageFile) {
            return "Ajoutez une image principale pour éviter un produit incomplet.";
        }

        if (
            colorVariants.some(
                (colorVariant) =>
                    !colorVariant.color.trim() &&
                    availableSizes.some(
                        (size) =>
                            Number(colorVariant.stockBySize[size] || 0) > 0,
                    ),
            )
        ) {
            return "Chaque couleur qui contient du stock doit avoir un nom.";
        }

        if (variants.length === 0) {
            return "Ajoutez au moins une couleur avec une taille en stock supérieur à 0.";
        }

        if (form.isOnSale) {
            if (!Number.isFinite(discountValue) || discountValue <= 0) {
                return "Ajoutez une valeur de remise valide.";
            }

            if (form.discountType === "PERCENTAGE" && discountValue > 100) {
                return "La remise en pourcentage ne peut pas dépasser 100%.";
            }

            if (
                form.discountType === "FIXED_AMOUNT" &&
                discountValue >= price
            ) {
                return "La remise fixe doit être inférieure au prix du produit.";
            }
        }

        return "";
    }

    function resetForm() {
        setForm(emptyForm);
        setColorVariants([createColorVariant("CLOTHING", "Noir")]);
        setIsSlugTouched(false);
        setSelectedImageFile(null);

        if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl);
        }

        setImagePreviewUrl("");
        setCreatedProduct(null);
        setError("");
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        const token = getAdminToken();

        if (!token) {
            router.push("/admin/login");
            return;
        }

        const validationError = validateForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        const reference = form.reference.trim().toUpperCase();
        const productName = form.name.trim();
        const variants = buildVariants();

        try {
            setIsSubmitting(true);

            const uploadedImage = await uploadProductImage(
                token,
                selectedImageFile as File,
            );

            const payload: CreateProductPayload = {
                reference,
                name: productName,
                slug: form.slug.trim(),
                shortDescription: form.shortDescription.trim(),
                description: form.description.trim(),
                categoryId: form.categoryId,
                price: Number(form.price),
                status: form.status,
                isFeatured: form.isFeatured,
                isNewArrival: form.isNewArrival,
                isOnSale: form.isOnSale,
                images: [
                    {
                        url: uploadedImage.url,
                        storagePath: uploadedImage.storagePath,
                        altText: productName,
                        isMain: true,
                        position: 1,
                    },
                ],
                variants,
            };

            if (form.collectionId) {
                payload.collectionId = form.collectionId;
            }

            if (form.saleCampaignId) {
                payload.saleCampaignId = form.saleCampaignId;
            }

            if (form.isOnSale) {
                payload.discountType = form.discountType;
                payload.discountValue = Number(form.discountValue);
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

                        <div className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-700">
                            <CheckCircle2 size={34} />
                        </div>

                        <h1 className="mt-6 text-4xl font-black">
                            Produit ajouté
                        </h1>

                        <p className="mt-4 text-neutral-600">
                            Le produit a été créé avec son image, ses couleurs,
                            ses tailles et son stock.
                        </p>

                        <div className="mt-8 rounded-3xl bg-neutral-50 p-6 text-left">
                            <p className="text-sm text-neutral-500">Produit</p>

                            <p className="mt-1 text-2xl font-black">
                                {createdProduct.name}
                            </p>

                            <p className="mt-2 text-neutral-600">
                                Réf. {createdProduct.reference}
                            </p>

                            <p className="mt-2 text-sm font-bold">
                                Statut : {createdProduct.status}
                            </p>
                        </div>

                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            {createdProduct.status === "PUBLISHED" && (
                                <Link
                                    href={`/produit/${createdProduct.slug}`}
                                    className="rounded-full bg-black px-6 py-3 text-sm font-bold text-white"
                                >
                                    Voir dans la boutique
                                </Link>
                            )}

                            <Link
                                href={`/admin/produits/${createdProduct.id}/modifier`}
                                className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-bold text-neutral-950 hover:border-black"
                            >
                                Modifier le produit
                            </Link>

                            <Link
                                href="/admin/produits"
                                className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-bold text-neutral-950 hover:border-black"
                            >
                                Retour produits
                            </Link>

                            <button
                                type="button"
                                onClick={resetForm}
                                className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-bold text-neutral-950 hover:border-black"
                            >
                                Créer un autre produit
                            </button>
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

                        <h1 className="mt-2 text-4xl font-black">
                            Ajouter un produit
                        </h1>

                        <p className="mt-3 text-neutral-600">
                            Créez un article complet avec image, prix, statut,
                            couleurs, tailles et stock par variante.
                        </p>
                    </div>

                    <Link
                        href="/admin/produits"
                        className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold hover:border-black"
                    >
                        Retour produits
                    </Link>
                </div>

                {isLoading && (
                    <div className="rounded-3xl bg-white p-8 shadow-sm">
                        Chargement des données...
                    </div>
                )}

                {error && (
                    <div className="mb-6 rounded-3xl bg-red-50 p-6 text-sm font-semibold text-red-700">
                        {error}
                    </div>
                )}

                {!isLoading && (
                    <form
                        onSubmit={handleSubmit}
                        className="grid gap-8 lg:grid-cols-[1fr_380px]"
                    >
                        <div className="space-y-8">
                            <section className="rounded-[2rem] bg-white p-8 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <Shirt size={28} />

                                    <h2 className="text-2xl font-black">
                                        Informations produit
                                    </h2>
                                </div>

                                <div className="mt-6 grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-bold">
                                            Référence *
                                        </label>

                                        <input
                                            value={form.reference}
                                            onChange={(event) =>
                                                updateFormField(
                                                    "reference",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="CH-2026-002"
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold">
                                            Nom produit *
                                        </label>

                                        <input
                                            value={form.name}
                                            onChange={(event) =>
                                                handleNameChange(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Chemise Oxford Bleu Ciel"
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold">
                                            Slug URL *
                                        </label>

                                        <input
                                            value={form.slug}
                                            onChange={(event) =>
                                                handleSlugChange(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="chemise-oxford-bleu-ciel"
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold">
                                            Statut
                                        </label>

                                        <select
                                            value={form.status}
                                            onChange={(event) =>
                                                updateFormField(
                                                    "status",
                                                    event.target
                                                        .value as ProductStatus,
                                                )
                                            }
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                        >
                                            <option value="DRAFT">
                                                Brouillon
                                            </option>
                                            <option value="PUBLISHED">
                                                Publié
                                            </option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="text-sm font-bold">
                                            Description courte
                                        </label>

                                        <input
                                            value={form.shortDescription}
                                            onChange={(event) =>
                                                updateFormField(
                                                    "shortDescription",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Chemise élégante pour homme."
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="text-sm font-bold">
                                            Description détaillée
                                        </label>

                                        <textarea
                                            rows={5}
                                            value={form.description}
                                            onChange={(event) =>
                                                updateFormField(
                                                    "description",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Description détaillée du produit..."
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

                                <div className="mt-6 grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-bold">
                                            Catégorie active *
                                        </label>

                                        <select
                                            value={form.categoryId}
                                            onChange={(event) =>
                                                updateFormField(
                                                    "categoryId",
                                                    event.target.value,
                                                )
                                            }
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                        >
                                            <option value="">
                                                Sélectionner une catégorie
                                            </option>

                                            {activeCategories.map(
                                                (category) => (
                                                    <option
                                                        key={category.id}
                                                        value={category.id}
                                                    >
                                                        {category.name}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold">
                                            Collection active
                                        </label>

                                        <select
                                            value={form.collectionId}
                                            onChange={(event) =>
                                                updateFormField(
                                                    "collectionId",
                                                    event.target.value,
                                                )
                                            }
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                        >
                                            <option value="">
                                                Aucune collection
                                            </option>

                                            {activeCollections.map(
                                                (collection) => (
                                                    <option
                                                        key={collection.id}
                                                        value={collection.id}
                                                    >
                                                        {collection.name}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold">
                                            Prix TND *
                                        </label>

                                        <input
                                            value={form.price}
                                            onChange={(event) =>
                                                updateFormField(
                                                    "price",
                                                    event.target.value,
                                                )
                                            }
                                            type="number"
                                            step="0.001"
                                            min="0"
                                            placeholder="149"
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold">
                                            Campagne de soldes active
                                        </label>

                                        <select
                                            value={form.saleCampaignId}
                                            onChange={(event) =>
                                                updateFormField(
                                                    "saleCampaignId",
                                                    event.target.value,
                                                )
                                            }
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                        >
                                            <option value="">
                                                Aucune campagne
                                            </option>

                                            {activeSaleCampaigns.map(
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

                                <div className="mt-6 rounded-3xl bg-neutral-50 p-6">
                                    <label className="flex cursor-pointer items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={form.isOnSale}
                                            onChange={(event) =>
                                                updateFormField(
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
                                                        updateFormField(
                                                            "discountType",
                                                            event.target
                                                                .value as DiscountType,
                                                        )
                                                    }
                                                    className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                                >
                                                    <option value="PERCENTAGE">
                                                        Pourcentage %
                                                    </option>

                                                    <option value="FIXED_AMOUNT">
                                                        Montant fixe TND
                                                    </option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-sm font-bold">
                                                    Valeur remise
                                                </label>

                                                <input
                                                    value={form.discountValue}
                                                    onChange={(event) =>
                                                        updateFormField(
                                                            "discountValue",
                                                            event.target.value,
                                                        )
                                                    }
                                                    type="number"
                                                    min="0"
                                                    step={
                                                        form.discountType ===
                                                        "PERCENTAGE"
                                                            ? "1"
                                                            : "0.001"
                                                    }
                                                    placeholder={
                                                        form.discountType ===
                                                        "PERCENTAGE"
                                                            ? "20"
                                                            : "30"
                                                    }
                                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="rounded-[2rem] bg-white p-8 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <Upload size={28} />

                                    <h2 className="text-2xl font-black">
                                        Image principale
                                    </h2>
                                </div>

                                <div className="mt-6">
                                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-[2rem] border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center transition hover:border-black">
                                        <ImagePlus size={34} />

                                        <span className="mt-3 text-sm font-bold">
                                            Cliquez pour importer une image
                                        </span>

                                        <span className="mt-1 text-xs text-neutral-500">
                                            JPG, PNG, WEBP — maximum 5 MB
                                        </span>

                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                    </label>

                                    {imagePreviewUrl && (
                                        <div className="mt-5 overflow-hidden rounded-[2rem] bg-neutral-100">
                                            <img
                                                src={imagePreviewUrl}
                                                alt="Aperçu produit"
                                                className="h-96 w-full object-cover"
                                            />
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="rounded-[2rem] bg-white p-8 shadow-sm">
                                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                                    <div className="flex items-center gap-3">
                                        <PackageCheck size={28} />

                                        <div>
                                            <h2 className="text-2xl font-black">
                                                Couleurs, tailles et stock
                                            </h2>

                                            <p className="mt-1 text-sm text-neutral-500">
                                                Choisissez le type de tailles,
                                                puis ajoutez les couleurs et le
                                                stock de chaque taille.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={addColorVariant}
                                        className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold hover:border-black"
                                    >
                                        <Plus size={18} />
                                        Couleur
                                    </button>
                                </div>

                                <div className="mt-6 rounded-3xl bg-neutral-50 p-5">
                                    <label className="text-sm font-bold">
                                        Type de tailles
                                    </label>

                                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleSizeModeChange("CLOTHING")
                                            }
                                            className={
                                                form.sizeMode === "CLOTHING"
                                                    ? "rounded-2xl border border-black bg-black px-5 py-4 text-left text-sm font-black text-white"
                                                    : "rounded-2xl border border-neutral-300 bg-white px-5 py-4 text-left text-sm font-black hover:border-black"
                                            }
                                        >
                                            Vêtements
                                            <span className="mt-1 block text-xs font-medium opacity-70">
                                                S / M / L / XL / XXL / 3XL
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleSizeModeChange("SHOES")
                                            }
                                            className={
                                                form.sizeMode === "SHOES"
                                                    ? "rounded-2xl border border-black bg-black px-5 py-4 text-left text-sm font-black text-white"
                                                    : "rounded-2xl border border-neutral-300 bg-white px-5 py-4 text-left text-sm font-black hover:border-black"
                                            }
                                        >
                                            Chaussures
                                            <span className="mt-1 block text-xs font-medium opacity-70">
                                                40 / 41 / 42 / 43 / 44 / 45
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleSizeModeChange("BERMUDA")
                                            }
                                            className={
                                                form.sizeMode === "BERMUDA"
                                                    ? "rounded-2xl border border-black bg-black px-5 py-4 text-left text-sm font-black text-white"
                                                    : "rounded-2xl border border-neutral-300 bg-white px-5 py-4 text-left text-sm font-black hover:border-black"
                                            }
                                        >
                                            Bermuda
                                            <span className="mt-1 block text-xs font-medium opacity-70">
                                                30 / 32 / 34 / 36 / 38 / 40
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleSizeModeChange("PANTS")
                                            }
                                            className={
                                                form.sizeMode === "PANTS"
                                                    ? "rounded-2xl border border-black bg-black px-5 py-4 text-left text-sm font-black text-white"
                                                    : "rounded-2xl border border-neutral-300 bg-white px-5 py-4 text-left text-sm font-black hover:border-black"
                                            }
                                        >
                                            Pantalon
                                            <span className="mt-1 block text-xs font-medium opacity-70">
                                                40 / 42 / 44 / 46 / 48 / 50 / 52
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleSizeModeChange("SUIT")
                                            }
                                            className={
                                                form.sizeMode === "SUIT"
                                                    ? "rounded-2xl border border-black bg-black px-5 py-4 text-left text-sm font-black text-white"
                                                    : "rounded-2xl border border-neutral-300 bg-white px-5 py-4 text-left text-sm font-black hover:border-black"
                                            }
                                        >
                                            Costume
                                            <span className="mt-1 block text-xs font-medium opacity-70">
                                                46 / 48 / 50 / 54 / 56
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-5">
                                    {colorVariants.map(
                                        (colorVariant, colorIndex) => (
                                            <div
                                                key={colorIndex}
                                                className="rounded-[2rem] border border-neutral-200 bg-white p-5"
                                            >
                                                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                                    <div className="flex-1">
                                                        <label className="text-sm font-bold">
                                                            Couleur{" "}
                                                            {colorIndex + 1}
                                                        </label>

                                                        <input
                                                            value={
                                                                colorVariant.color
                                                            }
                                                            onChange={(event) =>
                                                                updateColorVariantColor(
                                                                    colorIndex,
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Noir, Beige, Bleu..."
                                                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                                        />
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeColorVariant(
                                                                colorIndex,
                                                            )
                                                        }
                                                        className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-4 py-3 text-sm font-bold text-red-700 hover:border-red-600"
                                                    >
                                                        <Trash2 size={17} />
                                                        Supprimer
                                                    </button>
                                                </div>

                                                <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                                                    {availableSizes.map(
                                                        (size) => (
                                                            <div
                                                                key={size}
                                                                className="rounded-2xl bg-neutral-50 p-4"
                                                            >
                                                                <label className="text-sm font-black">
                                                                    Taille{" "}
                                                                    {size}
                                                                </label>

                                                                <input
                                                                    value={
                                                                        colorVariant
                                                                            .stockBySize[
                                                                            size
                                                                        ] ?? "0"
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        updateColorVariantStock(
                                                                            colorIndex,
                                                                            size,
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    type="number"
                                                                    min="0"
                                                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                                                />
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        ),
                                    )}
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
                                                updateFormField(
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
                                                updateFormField(
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

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-4 text-sm font-black text-white transition hover:bg-neutral-800 disabled:bg-neutral-300"
                            >
                                <Save size={18} />
                                {isSubmitting
                                    ? "Upload et création en cours..."
                                    : "Créer le produit"}
                            </button>
                        </div>

                        <aside className="h-fit rounded-[2rem] bg-white p-6 shadow-sm lg:sticky lg:top-6">
                            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                                Prévisualisation
                            </p>

                            <div className="mt-5 overflow-hidden rounded-[2rem] bg-neutral-100">
                                {imagePreviewUrl ? (
                                    <img
                                        src={imagePreviewUrl}
                                        alt="Aperçu produit"
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
                                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-700">
                                        {form.status === "PUBLISHED"
                                            ? "Publié"
                                            : "Brouillon"}
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

                                <p className="mt-2 text-neutral-600">
                                    {selectedCategory?.name ??
                                        "Catégorie non sélectionnée"}
                                </p>

                                <p className="mt-4 text-sm text-neutral-600">
                                    {form.shortDescription ||
                                        "Description courte du produit."}
                                </p>

                                <div className="mt-5">
                                    {form.isOnSale && Number(form.price) > 0 ? (
                                        <>
                                            <p className="text-sm text-neutral-400 line-through">
                                                {formatPrice(form.price)}
                                            </p>

                                            <p className="text-3xl font-black">
                                                {formatPrice(finalPrice)}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-3xl font-black">
                                            {formatPrice(form.price)}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-6 rounded-2xl bg-neutral-50 p-4">
                                    <p className="text-sm font-bold">
                                        Stock total
                                    </p>

                                    <p className="mt-1 text-2xl font-black">
                                        {totalStock}
                                    </p>

                                    <p className="mt-2 text-xs font-semibold text-neutral-500">
                                        Type : {getSizeModeLabel(form.sizeMode)}
                                    </p>

                                    <div className="mt-4 space-y-3">
                                        {colorVariants.map(
                                            (colorVariant, colorIndex) => (
                                                <div
                                                    key={colorIndex}
                                                    className="rounded-2xl bg-white p-3"
                                                >
                                                    <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
                                                        {colorVariant.color ||
                                                            "Couleur non définie"}
                                                    </p>

                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {availableSizes.map(
                                                            (size) => (
                                                                <span
                                                                    key={size}
                                                                    className="rounded-full bg-neutral-50 px-3 py-1 text-xs font-bold text-neutral-700"
                                                                >
                                                                    {size}:{" "}
                                                                    {Number(
                                                                        colorVariant
                                                                            .stockBySize[
                                                                            size
                                                                        ] || 0,
                                                                    )}
                                                                </span>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>

                                <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
                                    <p className="text-sm font-bold">
                                        Checklist création
                                    </p>

                                    <div className="mt-3 space-y-2 text-sm">
                                        <p>
                                            {form.reference.trim()
                                                ? "✅"
                                                : "⬜"}{" "}
                                            Référence
                                        </p>

                                        <p>
                                            {form.name.trim() ? "✅" : "⬜"} Nom
                                            produit
                                        </p>

                                        <p>
                                            {form.categoryId ? "✅" : "⬜"}{" "}
                                            Catégorie
                                        </p>

                                        <p>
                                            {Number(form.price) > 0
                                                ? "✅"
                                                : "⬜"}{" "}
                                            Prix
                                        </p>

                                        <p>
                                            {selectedImageFile ? "✅" : "⬜"}{" "}
                                            Image
                                        </p>

                                        <p>
                                            {totalStock > 0 ? "✅" : "⬜"} Stock
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </form>
                )}
            </section>
        </main>
    );
}
