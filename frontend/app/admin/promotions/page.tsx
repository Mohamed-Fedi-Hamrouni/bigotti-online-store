"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Plus, Search, ShieldCheck, ShieldOff, Tag } from "lucide-react";
import {
    createSaleCampaign,
    getAdminSaleCampaigns,
    updateSaleCampaign,
    updateSaleCampaignStatus,
} from "@/lib/api";
import type { SaleCampaign } from "@/types/product";

type CampaignStatusFilter =
    | "ALL"
    | "ACTIVE"
    | "INACTIVE"
    | "RUNNING"
    | "SCHEDULED"
    | "EXPIRED";

type CampaignFormState = {
    name: string;
    slug: string;
    description: string;
    isActive: boolean;
    startDate: string;
    endDate: string;
};

const emptyForm: CampaignFormState = {
    name: "",
    slug: "",
    description: "",
    isActive: true,
    startDate: "",
    endDate: "",
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

function formatDate(value: string | null) {
    if (!value) {
        return "Non définie";
    }

    return new Date(value).toLocaleDateString("fr-FR");
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

export default function AdminPromotionsPage() {
    const router = useRouter();

    const [campaigns, setCampaigns] = useState<SaleCampaign[]>([]);
    const [form, setForm] = useState<CampaignFormState>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] =
        useState<CampaignStatusFilter>("ALL");
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
                        : "Erreur lors du chargement des promotions.",
                );
            })
            .finally(() => setIsLoading(false));
    }, [router]);

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
                    .includes(normalizedSearch);

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && campaign.isActive) ||
                (statusFilter === "INACTIVE" && !campaign.isActive) ||
                statusFilter === timing;

            return matchesSearch && matchesStatus;
        });
    }, [campaigns, searchQuery, statusFilter]);

    const activeCampaigns = campaigns.filter(
        (campaign) => campaign.isActive,
    ).length;

    const inactiveCampaigns = campaigns.length - activeCampaigns;

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
        setForm(emptyForm);
        setEditingId(null);
        setError("");
        setSuccess("");
    }

    function startEdit(campaign: SaleCampaign) {
        setEditingId(campaign.id);
        setForm({
            name: campaign.name,
            slug: campaign.slug,
            description: campaign.description ?? "",
            isActive: campaign.isActive,
            startDate: toDateInputValue(campaign.startDate),
            endDate: toDateInputValue(campaign.endDate),
        });
        setError("");
        setSuccess("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const token = getAdminToken();

        if (!token) {
            router.push("/admin/login");
            return;
        }

        if (!form.name.trim()) {
            setError("Le nom de la promotion est obligatoire.");
            return;
        }

        if (
            form.startDate &&
            form.endDate &&
            new Date(form.startDate).getTime() >
                new Date(form.endDate).getTime()
        ) {
            setError("La date de début doit être avant la date de fin.");
            return;
        }

        setIsSaving(true);
        setError("");
        setSuccess("");

        const payload = {
            name: form.name.trim(),
            slug: form.slug.trim() || undefined,
            description: form.description.trim() || null,
            isActive: form.isActive,
            startDate: form.startDate || null,
            endDate: form.endDate || null,
        };

        try {
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

                setSuccess("Promotion modifiée avec succès.");
            } else {
                const createdCampaign = await createSaleCampaign(token, {
                    ...payload,
                    description: form.description.trim() || undefined,
                });

                setCampaigns((currentCampaigns) => [
                    createdCampaign,
                    ...currentCampaigns,
                ]);

                setSuccess("Promotion créée avec succès.");
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

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-950">
            <section className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                            Administration
                        </p>

                        <h1 className="mt-2 text-4xl font-black">Promotions</h1>

                        <p className="mt-2 text-neutral-600">
                            Créez et gérez les campagnes de solde.
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

            <section className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[420px_1fr]">
                <aside className="h-fit rounded-[2rem] bg-white p-8 shadow-sm">
                    <h2 className="text-2xl font-black">
                        {editingId
                            ? "Modifier une promotion"
                            : "Nouvelle promotion"}
                    </h2>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                        <div>
                            <label className="text-sm font-bold">Nom</label>

                            <input
                                value={form.name}
                                onChange={(event) =>
                                    updateFormField("name", event.target.value)
                                }
                                className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
                                placeholder="Ex: Soldes été"
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
                            />
                        </div>

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

                        <label className="flex items-center justify-between rounded-2xl bg-neutral-50 p-4 text-sm font-bold">
                            Active
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
                                  : "Créer la promotion"}
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
                    <div className="grid gap-5 md:grid-cols-5">
                        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                            <p className="text-sm text-neutral-500">
                                Total promotions
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
                        <div className="grid gap-4 md:grid-cols-[1fr_190px]">
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
                                    placeholder="Rechercher nom, slug, description..."
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
                                <option value="RUNNING">En cours</option>
                                <option value="SCHEDULED">Planifiées</option>
                                <option value="EXPIRED">Expirées</option>
                            </select>
                        </div>

                        <p className="mt-4 text-sm text-neutral-500">
                            {filteredCampaigns.length} promotion(s) affichée(s)
                        </p>

                        {isLoading && (
                            <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-neutral-500">
                                Chargement des promotions...
                            </div>
                        )}

                        {!isLoading && filteredCampaigns.length === 0 && (
                            <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-neutral-500">
                                Aucune promotion trouvée.
                            </div>
                        )}

                        <div className="mt-6 space-y-4">
                            {filteredCampaigns.map((campaign) => (
                                <article
                                    key={campaign.id}
                                    className="flex flex-col justify-between gap-5 rounded-3xl border border-neutral-200 p-5 md:flex-row md:items-center"
                                >
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
                                        </div>

                                        <p className="mt-2 text-sm text-neutral-500">
                                            /{campaign.slug}
                                        </p>

                                        <p className="mt-2 text-neutral-600">
                                            {campaign.description ??
                                                "Aucune description."}
                                        </p>

                                        <p className="mt-2 inline-flex items-center gap-2 text-sm text-neutral-500">
                                            <Tag size={15} />
                                            Du {formatDate(
                                                campaign.startDate,
                                            )}{" "}
                                            au {formatDate(campaign.endDate)}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() => startEdit(campaign)}
                                            className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold hover:border-black"
                                        >
                                            <Edit3 size={16} />
                                            Modifier
                                        </button>

                                        <button
                                            type="button"
                                            disabled={
                                                actionLoadingId === campaign.id
                                            }
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
                                            {actionLoadingId === campaign.id
                                                ? "Mise à jour..."
                                                : campaign.isActive
                                                  ? "Désactiver"
                                                  : "Activer"}
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
