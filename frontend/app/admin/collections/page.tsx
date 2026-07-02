"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Edit3,
    Plus,
    Search,
    ShieldCheck,
    ShieldOff,
    Star,
} from "lucide-react";
import {
    createCollection,
    getAdminCollections,
    updateCollection,
    updateCollectionStatus,
} from "@/lib/api";
import type { Collection } from "@/types/product";

type CollectionStatusFilter = "ALL" | "ACTIVE" | "INACTIVE" | "FEATURED";

type CollectionFormState = {
    name: string;
    slug: string;
    description: string;
    isActive: boolean;
    isFeatured: boolean;
    startDate: string;
    endDate: string;
};

const emptyForm: CollectionFormState = {
    name: "",
    slug: "",
    description: "",
    isActive: true,
    isFeatured: false,
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

export default function AdminCollectionsPage() {
    const router = useRouter();

    const [collections, setCollections] = useState<Collection[]>([]);
    const [form, setForm] = useState<CollectionFormState>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] =
        useState<CollectionStatusFilter>("ALL");
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

        getAdminCollections(token)
            .then(setCollections)
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Erreur lors du chargement des collections.",
                );
            })
            .finally(() => setIsLoading(false));
    }, [router]);

    const filteredCollections = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLowerCase();

        return collections.filter((collection) => {
            const matchesSearch =
                !normalizedSearch ||
                collection.name.toLowerCase().includes(normalizedSearch) ||
                collection.slug.toLowerCase().includes(normalizedSearch) ||
                String(collection.description ?? "")
                    .toLowerCase()
                    .includes(normalizedSearch);

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && collection.isActive) ||
                (statusFilter === "INACTIVE" && !collection.isActive) ||
                (statusFilter === "FEATURED" && collection.isFeatured);

            return matchesSearch && matchesStatus;
        });
    }, [collections, searchQuery, statusFilter]);

    const activeCollections = collections.filter(
        (collection) => collection.isActive,
    ).length;

    const inactiveCollections = collections.length - activeCollections;

    const featuredCollections = collections.filter(
        (collection) => collection.isFeatured,
    ).length;

    function updateFormField<K extends keyof CollectionFormState>(
        field: K,
        value: CollectionFormState[K],
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

    function startEdit(collection: Collection) {
        setEditingId(collection.id);
        setForm({
            name: collection.name,
            slug: collection.slug,
            description: collection.description ?? "",
            isActive: collection.isActive,
            isFeatured: collection.isFeatured,
            startDate: toDateInputValue(collection.startDate),
            endDate: toDateInputValue(collection.endDate),
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
            setError("Le nom de la collection est obligatoire.");
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
            isFeatured: form.isFeatured,
            startDate: form.startDate || null,
            endDate: form.endDate || null,
        };

        try {
            if (editingId) {
                const updatedCollection = await updateCollection(
                    token,
                    editingId,
                    payload,
                );

                setCollections((currentCollections) =>
                    currentCollections.map((collection) =>
                        collection.id === editingId
                            ? updatedCollection
                            : collection,
                    ),
                );

                setSuccess("Collection modifiée avec succès.");
            } else {
                const createdCollection = await createCollection(token, {
                    ...payload,
                    description: form.description.trim() || undefined,
                });

                setCollections((currentCollections) => [
                    createdCollection,
                    ...currentCollections,
                ]);

                setSuccess("Collection créée avec succès.");
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

    async function handleToggleStatus(collection: Collection) {
        const token = getAdminToken();

        if (!token) {
            router.push("/admin/login");
            return;
        }

        if (collection.isActive) {
            const confirmed = window.confirm(
                `Confirmer la désactivation de la collection "${collection.name}" ?\n\nLa collection ne sera pas supprimée. Elle ne sera plus visible côté client, mais restera disponible dans l’administration.`,
            );

            if (!confirmed) {
                return;
            }
        } else {
            const confirmed = window.confirm(
                `Réactiver la collection "${collection.name}" ?\n\nElle pourra de nouveau être utilisée côté boutique.`,
            );

            if (!confirmed) {
                return;
            }
        }

        setActionLoadingId(collection.id);
        setError("");
        setSuccess("");

        try {
            const updatedCollection = await updateCollectionStatus(
                token,
                collection.id,
                !collection.isActive,
            );

            setCollections((currentCollections) =>
                currentCollections.map((currentCollection) =>
                    currentCollection.id === collection.id
                        ? updatedCollection
                        : currentCollection,
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

                        <h1 className="mt-2 text-4xl font-black">
                            Collections
                        </h1>

                        <p className="mt-2 text-neutral-600">
                            Gérez les collections sans suppression définitive.
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
                            href="/admin/promotions"
                            className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
                        >
                            Promotions
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[420px_1fr]">
                <aside className="h-fit rounded-[2rem] bg-white p-8 shadow-sm">
                    <h2 className="text-2xl font-black">
                        {editingId
                            ? "Modifier une collection"
                            : "Nouvelle collection"}
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
                                placeholder="Ex: Collection Business"
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

                        <label className="flex items-center justify-between rounded-2xl bg-neutral-50 p-4 text-sm font-bold">
                            Mise en avant
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
                                  : "Créer la collection"}
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
                    <div className="grid gap-5 md:grid-cols-4">
                        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                            <p className="text-sm text-neutral-500">
                                Total collections
                            </p>

                            <p className="mt-2 text-3xl font-black">
                                {collections.length}
                            </p>
                        </div>

                        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                            <p className="text-sm text-neutral-500">Actives</p>

                            <p className="mt-2 text-3xl font-black">
                                {activeCollections}
                            </p>
                        </div>

                        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                            <p className="text-sm text-neutral-500">
                                Désactivées
                            </p>

                            <p className="mt-2 text-3xl font-black">
                                {inactiveCollections}
                            </p>
                        </div>

                        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                            <p className="text-sm text-neutral-500">En avant</p>

                            <p className="mt-2 text-3xl font-black">
                                {featuredCollections}
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
                                            .value as CollectionStatusFilter,
                                    )
                                }
                                className="rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                            >
                                <option value="ALL">Toutes</option>
                                <option value="ACTIVE">Actives</option>
                                <option value="INACTIVE">Désactivées</option>
                                <option value="FEATURED">En avant</option>
                            </select>
                        </div>

                        <p className="mt-4 text-sm text-neutral-500">
                            {filteredCollections.length} collection(s)
                            affichée(s)
                        </p>

                        {isLoading && (
                            <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-neutral-500">
                                Chargement des collections...
                            </div>
                        )}

                        {!isLoading && filteredCollections.length === 0 && (
                            <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-neutral-500">
                                Aucune collection trouvée.
                            </div>
                        )}

                        <div className="mt-6 space-y-4">
                            {filteredCollections.map((collection) => {
                                const isInactive = !collection.isActive;
                                const isUpdating =
                                    actionLoadingId === collection.id;

                                return (
                                    <article
                                        key={collection.id}
                                        className={
                                            isInactive
                                                ? "flex flex-col justify-between gap-5 rounded-3xl border border-red-100 bg-white p-5 opacity-80 md:flex-row md:items-center"
                                                : "flex flex-col justify-between gap-5 rounded-3xl border border-neutral-200 p-5 md:flex-row md:items-center"
                                        }
                                    >
                                        <div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h3 className="text-xl font-black">
                                                    {collection.name}
                                                </h3>

                                                <span
                                                    className={
                                                        collection.isActive
                                                            ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
                                                            : "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                                                    }
                                                >
                                                    {collection.isActive
                                                        ? "Active"
                                                        : "Désactivée"}
                                                </span>

                                                {collection.isFeatured && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                                                        <Star size={13} />
                                                        En avant
                                                    </span>
                                                )}
                                            </div>

                                            <p className="mt-2 text-sm text-neutral-500">
                                                /{collection.slug}
                                            </p>

                                            <p className="mt-2 text-neutral-600">
                                                {collection.description ??
                                                    "Aucune description."}
                                            </p>

                                            <p className="mt-2 text-sm text-neutral-500">
                                                Du{" "}
                                                {formatDate(
                                                    collection.startDate,
                                                )}{" "}
                                                au{" "}
                                                {formatDate(collection.endDate)}
                                            </p>

                                            {isInactive && (
                                                <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                                                    Cette collection est
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
                                                    startEdit(collection)
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
                                                    handleToggleStatus(
                                                        collection,
                                                    )
                                                }
                                                className={
                                                    collection.isActive
                                                        ? "inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-700 hover:border-red-600 disabled:opacity-50"
                                                        : "inline-flex items-center gap-2 rounded-full border border-green-200 px-5 py-3 text-sm font-bold text-green-700 hover:border-green-600 disabled:opacity-50"
                                                }
                                            >
                                                {collection.isActive ? (
                                                    <ShieldOff size={16} />
                                                ) : (
                                                    <ShieldCheck size={16} />
                                                )}

                                                {isUpdating
                                                    ? "Mise à jour..."
                                                    : collection.isActive
                                                      ? "Désactiver"
                                                      : "Réactiver"}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
