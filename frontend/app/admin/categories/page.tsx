"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Plus, Search, ShieldCheck, ShieldOff } from "lucide-react";
import {
    createCategory,
    getAdminCategories,
    updateCategory,
    updateCategoryStatus,
} from "@/lib/api";
import type { Category } from "@/types/product";

type CategoryStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

type CategoryFormState = {
    name: string;
    slug: string;
    description: string;
    isActive: boolean;
};

const emptyForm: CategoryFormState = {
    name: "",
    slug: "",
    description: "",
    isActive: true,
};

function getAdminToken() {
    if (typeof window === "undefined") {
        return null;
    }

    return window.localStorage.getItem("bigotti-admin-token");
}

export default function AdminCategoriesPage() {
    const router = useRouter();

    const [categories, setCategories] = useState<Category[]>([]);
    const [form, setForm] = useState<CategoryFormState>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] =
        useState<CategoryStatusFilter>("ALL");
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

        getAdminCategories(token)
            .then(setCategories)
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Erreur lors du chargement des catégories.",
                );
            })
            .finally(() => setIsLoading(false));
    }, [router]);

    const filteredCategories = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLowerCase();

        return categories.filter((category) => {
            const matchesSearch =
                !normalizedSearch ||
                category.name.toLowerCase().includes(normalizedSearch) ||
                category.slug.toLowerCase().includes(normalizedSearch) ||
                String(category.description ?? "")
                    .toLowerCase()
                    .includes(normalizedSearch);

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && category.isActive) ||
                (statusFilter === "INACTIVE" && !category.isActive);

            return matchesSearch && matchesStatus;
        });
    }, [categories, searchQuery, statusFilter]);

    const activeCategories = categories.filter(
        (category) => category.isActive,
    ).length;

    const inactiveCategories = categories.length - activeCategories;

    function updateFormField<K extends keyof CategoryFormState>(
        field: K,
        value: CategoryFormState[K],
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

    function startEdit(category: Category) {
        setEditingId(category.id);
        setForm({
            name: category.name,
            slug: category.slug,
            description: category.description ?? "",
            isActive: category.isActive,
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
            setError("Le nom de la catégorie est obligatoire.");
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
        };

        try {
            if (editingId) {
                const updatedCategory = await updateCategory(
                    token,
                    editingId,
                    payload,
                );

                setCategories((currentCategories) =>
                    currentCategories.map((category) =>
                        category.id === editingId ? updatedCategory : category,
                    ),
                );

                setSuccess("Catégorie modifiée avec succès.");
            } else {
                const createdCategory = await createCategory(token, {
                    ...payload,
                    description: form.description.trim() || undefined,
                });

                setCategories((currentCategories) => [
                    createdCategory,
                    ...currentCategories,
                ]);

                setSuccess("Catégorie créée avec succès.");
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

    async function handleToggleStatus(category: Category) {
        const token = getAdminToken();

        if (!token) {
            router.push("/admin/login");
            return;
        }

        setActionLoadingId(category.id);
        setError("");
        setSuccess("");

        try {
            const updatedCategory = await updateCategoryStatus(
                token,
                category.id,
                !category.isActive,
            );

            setCategories((currentCategories) =>
                currentCategories.map((currentCategory) =>
                    currentCategory.id === category.id
                        ? updatedCategory
                        : currentCategory,
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

                        <h1 className="mt-2 text-4xl font-black">Catégories</h1>

                        <p className="mt-2 text-neutral-600">
                            Gérez les catégories utilisées dans la boutique.
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
                            href="/admin/produits"
                            className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
                        >
                            Produits
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[420px_1fr]">
                <aside className="h-fit rounded-[2rem] bg-white p-8 shadow-sm">
                    <h2 className="text-2xl font-black">
                        {editingId
                            ? "Modifier une catégorie"
                            : "Nouvelle catégorie"}
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
                                placeholder="Ex: Chemises"
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
                                  : "Créer la catégorie"}
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
                    <div className="grid gap-5 md:grid-cols-3">
                        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                            <p className="text-sm text-neutral-500">
                                Total catégories
                            </p>
                            <p className="mt-2 text-3xl font-black">
                                {categories.length}
                            </p>
                        </div>

                        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                            <p className="text-sm text-neutral-500">Actives</p>
                            <p className="mt-2 text-3xl font-black">
                                {activeCategories}
                            </p>
                        </div>

                        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                            <p className="text-sm text-neutral-500">
                                Désactivées
                            </p>
                            <p className="mt-2 text-3xl font-black">
                                {inactiveCategories}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
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
                                            .value as CategoryStatusFilter,
                                    )
                                }
                                className="rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                            >
                                <option value="ALL">Toutes</option>
                                <option value="ACTIVE">Actives</option>
                                <option value="INACTIVE">Désactivées</option>
                            </select>
                        </div>

                        <p className="mt-4 text-sm text-neutral-500">
                            {filteredCategories.length} catégorie(s) affichée(s)
                        </p>

                        {isLoading && (
                            <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-neutral-500">
                                Chargement des catégories...
                            </div>
                        )}

                        {!isLoading && filteredCategories.length === 0 && (
                            <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-neutral-500">
                                Aucune catégorie trouvée.
                            </div>
                        )}

                        <div className="mt-6 space-y-4">
                            {filteredCategories.map((category) => (
                                <article
                                    key={category.id}
                                    className="flex flex-col justify-between gap-5 rounded-3xl border border-neutral-200 p-5 md:flex-row md:items-center"
                                >
                                    <div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h3 className="text-xl font-black">
                                                {category.name}
                                            </h3>

                                            <span
                                                className={
                                                    category.isActive
                                                        ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
                                                        : "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                                                }
                                            >
                                                {category.isActive
                                                    ? "Active"
                                                    : "Désactivée"}
                                            </span>
                                        </div>

                                        <p className="mt-2 text-sm text-neutral-500">
                                            /{category.slug}
                                        </p>

                                        <p className="mt-2 text-neutral-600">
                                            {category.description ??
                                                "Aucune description."}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() => startEdit(category)}
                                            className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold hover:border-black"
                                        >
                                            <Edit3 size={16} />
                                            Modifier
                                        </button>

                                        <button
                                            type="button"
                                            disabled={
                                                actionLoadingId === category.id
                                            }
                                            onClick={() =>
                                                handleToggleStatus(category)
                                            }
                                            className={
                                                category.isActive
                                                    ? "inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-700 hover:border-red-600 disabled:opacity-50"
                                                    : "inline-flex items-center gap-2 rounded-full border border-green-200 px-5 py-3 text-sm font-bold text-green-700 hover:border-green-600 disabled:opacity-50"
                                            }
                                        >
                                            {category.isActive ? (
                                                <ShieldOff size={16} />
                                            ) : (
                                                <ShieldCheck size={16} />
                                            )}
                                            {actionLoadingId === category.id
                                                ? "Mise à jour..."
                                                : category.isActive
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
