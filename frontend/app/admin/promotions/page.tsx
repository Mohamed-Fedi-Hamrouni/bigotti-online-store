"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    ChevronRight,
    Edit3,
    ImageIcon,
    Plus,
    Search,
    ShieldCheck,
    ShieldOff,
    Tag,
    UploadCloud,
    Video,
    X,
} from "lucide-react";
import {
    createSaleCampaign,
    getAdminSaleCampaigns,
    updateSaleCampaign,
    updateSaleCampaignStatus,
    uploadCampaignMedia,
} from "@/lib/api";
import type {
    CampaignMediaType,
    SaleCampaign,
    SaleCampaignType,
} from "@/types/product";

type CampaignStatusFilter =
    | "ALL"
    | "ACTIVE"
    | "INACTIVE"
    | "RUNNING"
    | "SCHEDULED"
    | "EXPIRED"
    | "HOME";

type CampaignFormState = {
    name: string;
    slug: string;
    description: string;
    isActive: boolean;
    startDate: string;
    endDate: string;

    type: SaleCampaignType;
    discountValue: string;
    buyQuantity: string;
    freeQuantity: string;

    displayOnHome: boolean;
    heroTitle: string;
    heroSubtitle: string;

    mediaType: CampaignMediaType | "";
    mediaUrl: string;
    mediaPath: string;
    mediaFile: File | null;
    mediaPreviewUrl: string;

    position: string;
};

const CAMPAIGNS_PER_PAGE = 8;

const emptyForm: CampaignFormState = {
    name: "",
    slug: "",
    description: "",
    isActive: true,
    startDate: "",
    endDate: "",

    type: "EVENEMENT_SIMPLE",
    discountValue: "",
    buyQuantity: "2",
    freeQuantity: "1",

    displayOnHome: false,
    heroTitle: "",
    heroSubtitle: "",

    mediaType: "",
    mediaUrl: "",
    mediaPath: "",
    mediaFile: null,
    mediaPreviewUrl: "",

    position: "0",
};

const campaignTypeOptions: {
    value: SaleCampaignType;
    label: string;
    description: string;
}[] = [
    {
        value: "EVENEMENT_SIMPLE",
        label: "Événement simple",
        description: "Affichage marketing sans remise automatique.",
    },
    {
        value: "REMISE_POURCENTAGE",
        label: "Remise en pourcentage",
        description: "Exemple : -30% sur les produits liés.",
    },
    {
        value: "REMISE_MONTANT_FIXE",
        label: "Remise fixe",
        description: "Exemple : -20 TND sur les produits liés.",
    },
    {
        value: "ACHETEZ_X_OBTENEZ_Y",
        label: "Achetez X, obtenez Y offert",
        description:
            "Affichage marketing maintenant. Le calcul panier sera ajouté après.",
    },
];

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

function formatDate(value: string | null) {
    if (!value) {
        return "Non définie";
    }

    return new Date(value).toLocaleDateString("fr-FR");
}

function formatCampaignType(type: SaleCampaignType) {
    if (type === "REMISE_POURCENTAGE") {
        return "Remise en pourcentage";
    }

    if (type === "REMISE_MONTANT_FIXE") {
        return "Remise fixe";
    }

    if (type === "ACHETEZ_X_OBTENEZ_Y") {
        return "Achetez X, obtenez Y offert";
    }

    return "Événement simple";
}

function getCampaignOfferLabel(campaign: SaleCampaign) {
    if (campaign.type === "REMISE_POURCENTAGE" && campaign.discountValue) {
        return `-${campaign.discountValue}%`;
    }

    if (campaign.type === "REMISE_MONTANT_FIXE" && campaign.discountValue) {
        return `-${Number(campaign.discountValue).toFixed(3)} TND`;
    }

    if (
        campaign.type === "ACHETEZ_X_OBTENEZ_Y" &&
        campaign.buyQuantity &&
        campaign.freeQuantity
    ) {
        return `Achetez ${campaign.buyQuantity}, obtenez ${campaign.freeQuantity} offert`;
    }

    return "Événement";
}

function getCampaignTiming(campaign: SaleCampaign) {
    const now = new Date().getTime();

    const startTime = campaign.startDate
        ? new Date(campaign.startDate).getTime()
        : null;

    const endTime = campaign.endDate
        ? new Date(campaign.endDate).getTime()
        : null;

    if (startTime && startTime > now) {
        return "SCHEDULED";
    }

    if (endTime && endTime < now) {
        return "EXPIRED";
    }

    return "RUNNING";
}

function getCampaignTimingLabel(campaign: SaleCampaign) {
    const timing = getCampaignTiming(campaign);

    if (timing === "SCHEDULED") {
        return "Planifiée";
    }

    if (timing === "EXPIRED") {
        return "Expirée";
    }

    return "En cours";
}

function getCampaignTimingClassName(campaign: SaleCampaign) {
    const timing = getCampaignTiming(campaign);

    if (timing === "SCHEDULED") {
        return "rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700";
    }

    if (timing === "EXPIRED") {
        return "rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600";
    }

    return "rounded-full bg-black px-3 py-1 text-xs font-bold text-white";
}

function getMediaTypeFromFile(file: File): CampaignMediaType {
    return file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
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

export default function AdminPromotionsPage() {
    const router = useRouter();

    const [campaigns, setCampaigns] = useState<SaleCampaign[]>([]);
    const [form, setForm] = useState<CampaignFormState>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] =
        useState<CampaignStatusFilter>("ALL");
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        const token = getAdminToken();

        if (!token) {
            router.push("/admin/login");
            return;
        }

        getAdminSaleCampaigns(token)
            .then(setCampaigns)
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Erreur lors du chargement des campagnes.",
                );
            })
            .finally(() => setIsLoading(false));
    }, [router]);

    useEffect(() => {
        return () => {
            if (form.mediaPreviewUrl) {
                URL.revokeObjectURL(form.mediaPreviewUrl);
            }
        };
    }, [form.mediaPreviewUrl]);

    const filteredCampaigns = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLowerCase();

        return campaigns.filter((campaign) => {
            const timing = getCampaignTiming(campaign);

            const matchesSearch =
                !normalizedSearch ||
                campaign.name.toLowerCase().includes(normalizedSearch) ||
                campaign.slug.toLowerCase().includes(normalizedSearch) ||
                String(campaign.description ?? "")
                    .toLowerCase()
                    .includes(normalizedSearch) ||
                formatCampaignType(campaign.type)
                    .toLowerCase()
                    .includes(normalizedSearch);

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && campaign.isActive) ||
                (statusFilter === "INACTIVE" && !campaign.isActive) ||
                (statusFilter === "HOME" && campaign.displayOnHome) ||
                statusFilter === timing;

            return matchesSearch && matchesStatus;
        });
    }, [campaigns, searchQuery, statusFilter]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredCampaigns.length / CAMPAIGNS_PER_PAGE),
    );

    const paginationRange = useMemo(
        () => buildPaginationRange(currentPage, totalPages),
        [currentPage, totalPages],
    );

    const paginatedCampaigns = useMemo(() => {
        const startIndex = (currentPage - 1) * CAMPAIGNS_PER_PAGE;
        const endIndex = startIndex + CAMPAIGNS_PER_PAGE;

        return filteredCampaigns.slice(startIndex, endIndex);
    }, [filteredCampaigns, currentPage]);

    const firstVisibleCampaignIndex =
        filteredCampaigns.length === 0
            ? 0
            : (currentPage - 1) * CAMPAIGNS_PER_PAGE + 1;

    const lastVisibleCampaignIndex = Math.min(
        currentPage * CAMPAIGNS_PER_PAGE,
        filteredCampaigns.length,
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const activeCampaigns = campaigns.filter(
        (campaign) => campaign.isActive,
    ).length;

    const inactiveCampaigns = campaigns.length - activeCampaigns;

    const homepageCampaigns = campaigns.filter(
        (campaign) => campaign.displayOnHome,
    ).length;

    const runningCampaigns = campaigns.filter(
        (campaign) => getCampaignTiming(campaign) === "RUNNING",
    ).length;

    const scheduledCampaigns = campaigns.filter(
        (campaign) => getCampaignTiming(campaign) === "SCHEDULED",
    ).length;

    const expiredCampaigns = campaigns.filter(
        (campaign) => getCampaignTiming(campaign) === "EXPIRED",
    ).length;

    function updateFormField<K extends keyof CampaignFormState>(
        field: K,
        value: CampaignFormState[K],
    ) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
    }

    function resetForm() {
        if (form.mediaPreviewUrl) {
            URL.revokeObjectURL(form.mediaPreviewUrl);
        }

        setForm(emptyForm);
        setEditingId(null);
        setError("");
        setSuccess("");
    }

    function goToPage(page: number) {
        const nextPage = Math.min(Math.max(page, 1), totalPages);

        setCurrentPage(nextPage);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    function startEdit(campaign: SaleCampaign) {
        if (form.mediaPreviewUrl) {
            URL.revokeObjectURL(form.mediaPreviewUrl);
        }

        setEditingId(campaign.id);

        setForm({
            name: campaign.name,
            slug: campaign.slug,
            description: campaign.description ?? "",
            isActive: campaign.isActive,
            startDate: toDateInputValue(campaign.startDate),
            endDate: toDateInputValue(campaign.endDate),

            type: campaign.type,
            discountValue:
                campaign.discountValue !== null
                    ? String(campaign.discountValue)
                    : "",
            buyQuantity:
                campaign.buyQuantity !== null
                    ? String(campaign.buyQuantity)
                    : "2",
            freeQuantity:
                campaign.freeQuantity !== null
                    ? String(campaign.freeQuantity)
                    : "1",

            displayOnHome: campaign.displayOnHome,
            heroTitle: campaign.heroTitle ?? "",
            heroSubtitle: campaign.heroSubtitle ?? "",

            mediaType: campaign.mediaType ?? "",
            mediaUrl: campaign.mediaUrl ?? "",
            mediaPath: campaign.mediaPath ?? "",
            mediaFile: null,
            mediaPreviewUrl: "",

            position: String(campaign.position ?? 0),
        });

        setError("");
        setSuccess("");

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function handleMediaSelection(file: File | null) {
        if (form.mediaPreviewUrl) {
            URL.revokeObjectURL(form.mediaPreviewUrl);
        }

        if (!file) {
            updateFormField("mediaFile", null);
            updateFormField("mediaPreviewUrl", "");
            return;
        }

        const previewUrl = URL.createObjectURL(file);

        setForm((currentForm) => ({
            ...currentForm,
            mediaFile: file,
            mediaPreviewUrl: previewUrl,
            mediaType: getMediaTypeFromFile(file),
        }));
    }

    function removeMedia() {
        if (form.mediaPreviewUrl) {
            URL.revokeObjectURL(form.mediaPreviewUrl);
        }

        setForm((currentForm) => ({
            ...currentForm,
            mediaType: "",
            mediaUrl: "",
            mediaPath: "",
            mediaFile: null,
            mediaPreviewUrl: "",
        }));
    }

    function validateForm() {
        if (!form.name.trim()) {
            return "Le nom de la campagne est obligatoire.";
        }

        if (
            form.startDate &&
            form.endDate &&
            new Date(form.startDate).getTime() >
                new Date(form.endDate).getTime()
        ) {
            return "La date de début doit être avant la date de fin.";
        }

        if (
            form.type === "REMISE_POURCENTAGE" &&
            (!form.discountValue ||
                Number(form.discountValue) <= 0 ||
                Number(form.discountValue) > 100)
        ) {
            return "Pour une remise en pourcentage, la valeur doit être entre 1 et 100.";
        }

        if (
            form.type === "REMISE_MONTANT_FIXE" &&
            (!form.discountValue || Number(form.discountValue) <= 0)
        ) {
            return "Pour une remise fixe, la valeur doit être supérieure à 0.";
        }

        if (
            form.type === "ACHETEZ_X_OBTENEZ_Y" &&
            (!form.buyQuantity ||
                Number(form.buyQuantity) <= 0 ||
                !form.freeQuantity ||
                Number(form.freeQuantity) <= 0)
        ) {
            return "Pour l’offre Achetez X, obtenez Y offert, les deux quantités sont obligatoires.";
        }

        if (form.displayOnHome && !form.heroTitle.trim() && !form.name.trim()) {
            return "Le titre d’accueil est obligatoire pour afficher la campagne sur l’accueil.";
        }

        return "";
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

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

        setIsSaving(true);
        setError("");
        setSuccess("");

        let mediaUrl = form.mediaUrl.trim() || null;
        let mediaPath = form.mediaPath.trim() || null;
        let mediaType = form.mediaType || null;

        try {
            if (form.mediaFile) {
                const uploadedMedia = await uploadCampaignMedia(
                    token,
                    form.mediaFile,
                );

                mediaUrl = uploadedMedia.url;
                mediaPath = uploadedMedia.storagePath;
                mediaType = uploadedMedia.mediaType;
            }

            const payload = {
                name: form.name.trim(),
                slug: form.slug.trim() || undefined,
                description: form.description.trim() || null,
                isActive: form.isActive,
                startDate: form.startDate || null,
                endDate: form.endDate || null,

                type: form.type,
                discountValue:
                    form.type === "REMISE_POURCENTAGE" ||
                    form.type === "REMISE_MONTANT_FIXE"
                        ? Number(form.discountValue)
                        : null,
                buyQuantity:
                    form.type === "ACHETEZ_X_OBTENEZ_Y"
                        ? Number(form.buyQuantity)
                        : null,
                freeQuantity:
                    form.type === "ACHETEZ_X_OBTENEZ_Y"
                        ? Number(form.freeQuantity)
                        : null,

                displayOnHome: form.displayOnHome,
                heroTitle: form.heroTitle.trim() || null,
                heroSubtitle: form.heroSubtitle.trim() || null,

                mediaType,
                mediaUrl,
                mediaPath,

                position: Number(form.position || 0),
            };

            if (editingId) {
                const updatedCampaign = await updateSaleCampaign(
                    token,
                    editingId,
                    payload,
                );

                setCampaigns((currentCampaigns) =>
                    currentCampaigns.map((campaign) =>
                        campaign.id === editingId ? updatedCampaign : campaign,
                    ),
                );

                setSuccess("Campagne modifiée avec succès.");
            } else {
                const createdCampaign = await createSaleCampaign(token, {
                    ...payload,
                    description: form.description.trim() || undefined,
                });

                setCampaigns((currentCampaigns) => [
                    createdCampaign,
                    ...currentCampaigns,
                ]);

                setSuccess("Campagne créée avec succès.");
            }

            if (form.mediaPreviewUrl) {
                URL.revokeObjectURL(form.mediaPreviewUrl);
            }

            setForm(emptyForm);
            setEditingId(null);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la sauvegarde.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleToggleStatus(campaign: SaleCampaign) {
        const token = getAdminToken();

        if (!token) {
            router.push("/admin/login");
            return;
        }

        if (campaign.isActive) {
            const confirmed = window.confirm(
                `Confirmer la désactivation de la campagne "${campaign.name}" ?\n\nLa campagne ne sera pas supprimée. Elle ne sera plus visible côté client, mais restera disponible dans l’administration.`,
            );

            if (!confirmed) {
                return;
            }
        } else {
            const confirmed = window.confirm(
                `Réactiver la campagne "${campaign.name}" ?\n\nElle pourra de nouveau être utilisée côté boutique.`,
            );

            if (!confirmed) {
                return;
            }
        }

        setActionLoadingId(campaign.id);
        setError("");
        setSuccess("");

        try {
            const updatedCampaign = await updateSaleCampaignStatus(
                token,
                campaign.id,
                !campaign.isActive,
            );

            setCampaigns((currentCampaigns) =>
                currentCampaigns.map((currentCampaign) =>
                    currentCampaign.id === campaign.id
                        ? updatedCampaign
                        : currentCampaign,
                ),
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors de la mise à jour.",
            );
        } finally {
            setActionLoadingId(null);
        }
    }

    const selectedTypeOption = campaignTypeOptions.find(
        (option) => option.value === form.type,
    );

    const previewMediaUrl = form.mediaPreviewUrl || form.mediaUrl;

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <section className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                            Administration
                        </p>

                        <h1 className="mt-2 text-4xl font-black">
                            Campagnes & événements
                        </h1>

                        <p className="mt-2 text-neutral-600">
                            Créez des soldes, événements marketing, offres
                            saisonnières et médias animés pour la page
                            d’accueil.
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
                            href="/admin/categories"
                            className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold hover:border-black"
                        >
                            Catégories
                        </Link>

                        <Link
                            href="/admin/collections"
                            className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
                        >
                            Collections
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-8 px-6 py-8 xl:grid-cols-[460px_1fr]">
                <aside className="h-fit rounded-[2rem] bg-white p-8 shadow-sm">
                    <h2 className="text-2xl font-black">
                        {editingId
                            ? "Modifier une campagne"
                            : "Nouvelle campagne"}
                    </h2>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                        <div>
                            <label className="text-sm font-bold">Nom *</label>

                            <input
                                value={form.name}
                                onChange={(event) =>
                                    updateFormField("name", event.target.value)
                                }
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                placeholder="Ex: Soldes d’été"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-bold">Slug</label>

                            <input
                                value={form.slug}
                                onChange={(event) =>
                                    updateFormField("slug", event.target.value)
                                }
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                placeholder="Laisser vide pour générer automatiquement"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-bold">
                                Description
                            </label>

                            <textarea
                                rows={4}
                                value={form.description}
                                onChange={(event) =>
                                    updateFormField(
                                        "description",
                                        event.target.value,
                                    )
                                }
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                placeholder="Texte interne ou description affichée côté boutique."
                            />
                        </div>

                        <section className="rounded-3xl bg-neutral-50 p-5">
                            <label className="text-sm font-bold">
                                Type de campagne
                            </label>

                            <select
                                value={form.type}
                                onChange={(event) =>
                                    updateFormField(
                                        "type",
                                        event.target.value as SaleCampaignType,
                                    )
                                }
                                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                            >
                                {campaignTypeOptions.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>

                            {selectedTypeOption && (
                                <p className="mt-2 text-xs font-semibold text-neutral-500">
                                    {selectedTypeOption.description}
                                </p>
                            )}

                            {(form.type === "REMISE_POURCENTAGE" ||
                                form.type === "REMISE_MONTANT_FIXE") && (
                                <div className="mt-4">
                                    <label className="text-sm font-bold">
                                        {form.type === "REMISE_POURCENTAGE"
                                            ? "Pourcentage de remise *"
                                            : "Montant de remise *"}
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step={
                                            form.type === "REMISE_POURCENTAGE"
                                                ? "1"
                                                : "0.001"
                                        }
                                        value={form.discountValue}
                                        onChange={(event) =>
                                            updateFormField(
                                                "discountValue",
                                                event.target.value,
                                            )
                                        }
                                        placeholder={
                                            form.type === "REMISE_POURCENTAGE"
                                                ? "Ex: 30"
                                                : "Ex: 20.000"
                                        }
                                        className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                    />
                                </div>
                            )}

                            {form.type === "ACHETEZ_X_OBTENEZ_Y" && (
                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-bold">
                                            Quantité à acheter *
                                        </label>

                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={form.buyQuantity}
                                            onChange={(event) =>
                                                updateFormField(
                                                    "buyQuantity",
                                                    event.target.value,
                                                )
                                            }
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold">
                                            Quantité offerte *
                                        </label>

                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={form.freeQuantity}
                                            onChange={(event) =>
                                                updateFormField(
                                                    "freeQuantity",
                                                    event.target.value,
                                                )
                                            }
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>

                                    <p className="md:col-span-2 rounded-2xl bg-yellow-50 p-4 text-xs font-semibold text-yellow-800">
                                        Pour cette phase, cette offre est
                                        affichée côté boutique. Le calcul réel
                                        dans le panier sera ajouté dans l’étape
                                        suivante.
                                    </p>
                                </div>
                            )}
                        </section>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-bold">
                                    Date début
                                </label>

                                <input
                                    type="date"
                                    value={form.startDate}
                                    onChange={(event) =>
                                        updateFormField(
                                            "startDate",
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
                                    value={form.endDate}
                                    onChange={(event) =>
                                        updateFormField(
                                            "endDate",
                                            event.target.value,
                                        )
                                    }
                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                />
                            </div>
                        </div>

                        <section className="rounded-3xl bg-neutral-50 p-5">
                            <label className="flex items-center justify-between text-sm font-bold">
                                Afficher sur l’accueil
                                <input
                                    type="checkbox"
                                    checked={form.displayOnHome}
                                    onChange={(event) =>
                                        updateFormField(
                                            "displayOnHome",
                                            event.target.checked,
                                        )
                                    }
                                />
                            </label>

                            {form.displayOnHome && (
                                <div className="mt-5 space-y-4">
                                    <div>
                                        <label className="text-sm font-bold">
                                            Titre d’accueil
                                        </label>

                                        <input
                                            value={form.heroTitle}
                                            onChange={(event) =>
                                                updateFormField(
                                                    "heroTitle",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Ex: Soldes d’été"
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold">
                                            Sous-titre d’accueil
                                        </label>

                                        <textarea
                                            rows={3}
                                            value={form.heroSubtitle}
                                            onChange={(event) =>
                                                updateFormField(
                                                    "heroSubtitle",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Ex: Découvrez notre sélection limitée."
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold">
                                            Position d’affichage
                                        </label>

                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={form.position}
                                            onChange={(event) =>
                                                updateFormField(
                                                    "position",
                                                    event.target.value,
                                                )
                                            }
                                            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                                        />
                                    </div>
                                </div>
                            )}
                        </section>

                        <section className="rounded-3xl bg-neutral-50 p-5">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <label className="text-sm font-bold">
                                        Média de campagne
                                    </label>

                                    <p className="mt-1 text-xs text-neutral-500">
                                        Image ou vidéo pour rendre l’événement
                                        plus vivant.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 text-neutral-500">
                                    <ImageIcon size={18} />
                                    <Video size={18} />
                                </div>
                            </div>

                            {previewMediaUrl ? (
                                <div className="mt-4 overflow-hidden rounded-3xl border border-neutral-200 bg-white">
                                    <div className="relative aspect-video bg-neutral-100">
                                        {form.mediaType === "VIDEO" ? (
                                            <video
                                                src={previewMediaUrl}
                                                className="h-full w-full object-cover"
                                                autoPlay
                                                muted
                                                loop
                                                playsInline
                                                controls
                                            />
                                        ) : (
                                            <img
                                                src={previewMediaUrl}
                                                alt="Média de campagne"
                                                className="h-full w-full object-cover"
                                            />
                                        )}

                                        <button
                                            type="button"
                                            onClick={removeMedia}
                                            className="absolute right-3 top-3 rounded-full bg-white px-3 py-2 text-xs font-bold text-black shadow"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-8 text-center hover:border-black">
                                    <UploadCloud
                                        size={28}
                                        className="text-neutral-500"
                                    />

                                    <span className="mt-3 text-sm font-bold">
                                        Ajouter une image ou une vidéo
                                    </span>

                                    <span className="mt-1 text-xs text-neutral-500">
                                        JPG, PNG, WEBP, MP4 ou WEBM
                                    </span>

                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                                        className="hidden"
                                        onChange={(event) =>
                                            handleMediaSelection(
                                                event.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                </label>
                            )}
                        </section>

                        <label className="flex items-center justify-between rounded-2xl bg-neutral-50 p-4 text-sm font-bold">
                            Campagne active
                            <input
                                type="checkbox"
                                checked={form.isActive}
                                onChange={(event) =>
                                    updateFormField(
                                        "isActive",
                                        event.target.checked,
                                    )
                                }
                            />
                        </label>

                        {error && (
                            <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-700">
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-4 text-sm font-black text-white disabled:opacity-60"
                        >
                            <Plus size={18} />
                            {isSaving
                                ? "Sauvegarde..."
                                : editingId
                                  ? "Sauvegarder"
                                  : "Créer la campagne"}
                        </button>

                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="w-full rounded-full border border-neutral-300 px-6 py-3 text-sm font-bold hover:border-black"
                            >
                                Annuler la modification
                            </button>
                        )}
                    </form>
                </aside>

                <div className="space-y-6">
                    <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-6">
                        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                            <p className="text-sm text-neutral-500">
                                Total campagnes
                            </p>

                            <p className="mt-2 text-3xl font-black">
                                {campaigns.length}
                            </p>
                        </div>

                        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                            <p className="text-sm text-neutral-500">Actives</p>

                            <p className="mt-2 text-3xl font-black">
                                {activeCampaigns}
                            </p>
                        </div>

                        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                            <p className="text-sm text-neutral-500">
                                Désactivées
                            </p>

                            <p className="mt-2 text-3xl font-black">
                                {inactiveCampaigns}
                            </p>
                        </div>

                        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                            <p className="text-sm text-neutral-500">Accueil</p>

                            <p className="mt-2 text-3xl font-black">
                                {homepageCampaigns}
                            </p>
                        </div>

                        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                            <p className="text-sm text-neutral-500">En cours</p>

                            <p className="mt-2 text-3xl font-black">
                                {runningCampaigns}
                            </p>
                        </div>

                        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                            <p className="text-sm text-neutral-500">
                                Planifiées / expirées
                            </p>

                            <p className="mt-2 text-3xl font-black">
                                {scheduledCampaigns + expiredCampaigns}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
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
                                    placeholder="Rechercher nom, slug, type, description..."
                                    className="w-full rounded-full border border-neutral-300 py-3 pl-11 pr-4 outline-none focus:border-black"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(
                                        event.target
                                            .value as CampaignStatusFilter,
                                    )
                                }
                                className="rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                            >
                                <option value="ALL">Toutes</option>
                                <option value="ACTIVE">Actives</option>
                                <option value="INACTIVE">Désactivées</option>
                                <option value="HOME">Sur l’accueil</option>
                                <option value="RUNNING">En cours</option>
                                <option value="SCHEDULED">Planifiées</option>
                                <option value="EXPIRED">Expirées</option>
                            </select>
                        </div>

                        <div className="mt-4 flex flex-col justify-between gap-3 text-sm text-neutral-500 md:flex-row md:items-center">
                            <p>
                                {filteredCampaigns.length} campagne(s)
                                trouvée(s)
                            </p>

                            {!isLoading && filteredCampaigns.length > 0 && (
                                <p>
                                    Affichage de {firstVisibleCampaignIndex} à{" "}
                                    {lastVisibleCampaignIndex} sur{" "}
                                    {filteredCampaigns.length} campagne(s) —
                                    page {currentPage}/{totalPages}
                                </p>
                            )}
                        </div>

                        {isLoading && (
                            <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-neutral-500">
                                Chargement des campagnes...
                            </div>
                        )}

                        {!isLoading && filteredCampaigns.length === 0 && (
                            <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-neutral-500">
                                Aucune campagne trouvée.
                            </div>
                        )}

                        <div className="mt-6 space-y-4">
                            {paginatedCampaigns.map((campaign) => {
                                const isInactive = !campaign.isActive;
                                const isUpdating =
                                    actionLoadingId === campaign.id;

                                return (
                                    <article
                                        key={campaign.id}
                                        className={
                                            isInactive
                                                ? "grid gap-5 rounded-3xl border border-red-100 bg-white p-5 opacity-80 xl:grid-cols-[180px_1fr_auto] xl:items-center"
                                                : "grid gap-5 rounded-3xl border border-neutral-200 p-5 xl:grid-cols-[180px_1fr_auto] xl:items-center"
                                        }
                                    >
                                        <div className="overflow-hidden rounded-3xl bg-neutral-100">
                                            <div className="aspect-video">
                                                {campaign.mediaUrl ? (
                                                    campaign.mediaType ===
                                                    "VIDEO" ? (
                                                        <video
                                                            src={
                                                                campaign.mediaUrl
                                                            }
                                                            className="h-full w-full object-cover"
                                                            muted
                                                            loop
                                                            playsInline
                                                        />
                                                    ) : (
                                                        <img
                                                            src={
                                                                campaign.mediaUrl
                                                            }
                                                            alt={campaign.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    )
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
                                                        Aucun média
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h3 className="text-xl font-black">
                                                    {campaign.name}
                                                </h3>

                                                <span
                                                    className={
                                                        campaign.isActive
                                                            ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
                                                            : "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                                                    }
                                                >
                                                    {campaign.isActive
                                                        ? "Active"
                                                        : "Désactivée"}
                                                </span>

                                                <span
                                                    className={getCampaignTimingClassName(
                                                        campaign,
                                                    )}
                                                >
                                                    {getCampaignTimingLabel(
                                                        campaign,
                                                    )}
                                                </span>

                                                {campaign.displayOnHome && (
                                                    <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700">
                                                        Accueil
                                                    </span>
                                                )}
                                            </div>

                                            <p className="mt-2 text-sm text-neutral-500">
                                                /{campaign.slug}
                                            </p>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-700">
                                                    {formatCampaignType(
                                                        campaign.type,
                                                    )}
                                                </span>

                                                <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                                                    {getCampaignOfferLabel(
                                                        campaign,
                                                    )}
                                                </span>
                                            </div>

                                            <p className="mt-3 text-neutral-600">
                                                {campaign.description ??
                                                    "Aucune description."}
                                            </p>

                                            <p className="mt-3 inline-flex items-center gap-2 text-sm text-neutral-500">
                                                <Tag size={15} />
                                                Du{" "}
                                                {formatDate(
                                                    campaign.startDate,
                                                )}{" "}
                                                au{" "}
                                                {formatDate(campaign.endDate)}
                                            </p>

                                            {isInactive && (
                                                <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                                                    Cette campagne est
                                                    désactivée. Elle n’est pas
                                                    supprimée, mais elle n’est
                                                    plus visible côté client.
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    startEdit(campaign)
                                                }
                                                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold hover:border-black"
                                            >
                                                <Edit3 size={16} />
                                                Modifier
                                            </button>

                                            <button
                                                type="button"
                                                disabled={isUpdating}
                                                onClick={() =>
                                                    handleToggleStatus(campaign)
                                                }
                                                className={
                                                    campaign.isActive
                                                        ? "inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-700 hover:border-red-600 disabled:opacity-50"
                                                        : "inline-flex items-center gap-2 rounded-full border border-green-200 px-5 py-3 text-sm font-bold text-green-700 hover:border-green-600 disabled:opacity-50"
                                                }
                                            >
                                                {campaign.isActive ? (
                                                    <ShieldOff size={16} />
                                                ) : (
                                                    <ShieldCheck size={16} />
                                                )}

                                                {isUpdating
                                                    ? "Mise à jour..."
                                                    : campaign.isActive
                                                      ? "Désactiver"
                                                      : "Réactiver"}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {!isLoading &&
                            filteredCampaigns.length > 0 &&
                            totalPages > 1 && (
                                <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            goToPage(currentPage - 1)
                                        }
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

                                    {paginationRange[
                                        paginationRange.length - 1
                                    ] < totalPages && (
                                        <>
                                            <span className="px-2 text-sm font-black text-neutral-400">
                                                ...
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    goToPage(totalPages)
                                                }
                                                className="h-11 min-w-11 rounded-full border border-neutral-300 bg-white px-4 text-sm font-black transition hover:border-black"
                                            >
                                                {totalPages}
                                            </button>
                                        </>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            goToPage(currentPage + 1)
                                        }
                                        disabled={currentPage === totalPages}
                                        className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Suivant
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                    </div>
                </div>
            </section>
        </main>
    );
}
