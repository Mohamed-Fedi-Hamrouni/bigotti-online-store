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
    Trash2,
} from "lucide-react";
import {
    createCategory,
    getAdminCategories,
    updateCategory,
    updateCategoryStatus,
} from "@/lib/api";
import type {
    Category,
    CategoryMenuGroup,
    CategoryType,
} from "@/types/product";

type CategoryStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type CategoryGroupFilter = "ALL" | CategoryMenuGroup;

type EditableCategoryType = {
    id?: string;
    name: string;
    slug: string;
    description: string;
    isActive: boolean;
    position: string;
};

type CategoryFormState = {
    name: string;
    slug: string;
    description: string;
    menuGroup: CategoryMenuGroup;
    types: EditableCategoryType[];
    isActive: boolean;
};

const categoryMenuGroupOptions: {
    value: CategoryMenuGroup;
    label: string;
    description: string;
}[] = [
    {
        value: "HAUT",
        label: "Haut",
        description: "Polos, chemises, pulls, vestes et pièces du haut.",
    },
    {
        value: "BAS",
        label: "Bas",
        description: "Pantalons, jeans, shorts et pièces du bas.",
    },
    {
        value: "COSTUME_CEREMONIE",
        label: "Costume & cérémonie",
        description: "Costumes, ensembles habillés et articles de cérémonie.",
    },
    {
        value: "CHAUSSURES",
        label: "Chaussures",
        description: "Mocassins, baskets et chaussures habillées.",
    },
    {
        value: "ACCESSOIRES",
        label: "Accessoires",
        description: "Ceintures, lunettes, sacs et accessoires.",
    },
    {
        value: "AUTRE",
        label: "Autre",
        description: "Catégories non classées dans le menu principal.",
    },
];

const emptyForm: CategoryFormState = {
    name: "",
    slug: "",
    description: "",
    menuGroup: "AUTRE",
    types: [],
    isActive: true,
};

function getAdminToken() {
    if (typeof window === "undefined") {
        return null;
    }

    return window.localStorage.getItem("bigotti-admin-token");
}

function createEmptyCategoryType(position: number): EditableCategoryType {
    return {
        name: "",
        slug: "",
        description: "",
        isActive: true,
        position: String(position),
    };
}

function categoryTypeToFormType(type: CategoryType): EditableCategoryType {
    return {
        id: type.id,
        name: type.name,
        slug: type.slug,
        description: type.description ?? "",
        isActive: type.isActive,
        position: String(type.position ?? 0),
    };
}

function getMenuGroupLabel(menuGroup: CategoryMenuGroup | null | undefined) {
    return (
        categoryMenuGroupOptions.find((option) => option.value === menuGroup)
            ?.label ?? "Autre"
    );
}

function getMenuGroupDescription(
    menuGroup: CategoryMenuGroup | null | undefined,
) {
    return (
        categoryMenuGroupOptions.find((option) => option.value === menuGroup)
            ?.description ?? "Catégorie non classée."
    );
}

function getMenuGroupBadgeClass(
    menuGroup: CategoryMenuGroup | null | undefined,
) {
    if (menuGroup === "HAUT") {
        return "rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700";
    }

    if (menuGroup === "BAS") {
        return "rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700";
    }

    if (menuGroup === "COSTUME_CEREMONIE") {
        return "rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700";
    }

    if (menuGroup === "CHAUSSURES") {
        return "rounded-full bg-neutral-950 px-3 py-1 text-xs font-bold text-white";
    }

    if (menuGroup === "ACCESSOIRES") {
        return "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700";
    }

    return "rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600";
}

function normalizeText(value: string) {
    return value.trim().toLowerCase();
}

export default function AdminCategoriesPage() {
    const router = useRouter();

    const [categories, setCategories] = useState<Category[]>([]);
    const [form, setForm] = useState<CategoryFormState>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [typesTouched, setTypesTouched] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] =
        useState<CategoryStatusFilter>("ALL");
    const [groupFilter, setGroupFilter] = useState<CategoryGroupFilter>("ALL");
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
            const menuGroup = category.menuGroup ?? "AUTRE";
            const menuGroupLabel = getMenuGroupLabel(menuGroup);

            const typeNames = (category.types ?? [])
                .map((type) => type.name)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !normalizedSearch ||
                category.name.toLowerCase().includes(normalizedSearch) ||
                category.slug.toLowerCase().includes(normalizedSearch) ||
                String(category.description ?? "")
                    .toLowerCase()
                    .includes(normalizedSearch) ||
                menuGroupLabel.toLowerCase().includes(normalizedSearch) ||
                typeNames.includes(normalizedSearch);

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && category.isActive) ||
                (statusFilter === "INACTIVE" && !category.isActive);

            const matchesGroup =
                groupFilter === "ALL" || menuGroup === groupFilter;

            return matchesSearch && matchesStatus && matchesGroup;
        });
    }, [categories, searchQuery, statusFilter, groupFilter]);

    const activeCategories = categories.filter(
        (category) => category.isActive,
    ).length;

    const inactiveCategories = categories.length - activeCategories;

    const collectionCategories = categories.filter(
        (category) =>
            category.menuGroup === "HAUT" || category.menuGroup === "BAS",
    ).length;

    const principalMenuCategories = categories.filter(
        (category) =>
            category.menuGroup === "COSTUME_CEREMONIE" ||
            category.menuGroup === "CHAUSSURES" ||
            category.menuGroup === "ACCESSOIRES",
    ).length;

    const totalCategoryTypes = categories.reduce(
        (sum, category) => sum + (category.types?.length ?? 0),
        0,
    );

    function updateFormField<K extends keyof CategoryFormState>(
        field: K,
        value: CategoryFormState[K],
    ) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
    }

    function updateCategoryType(
        index: number,
        updates: Partial<EditableCategoryType>,
    ) {
        setTypesTouched(true);

        setForm((currentForm) => ({
            ...currentForm,
            types: currentForm.types.map((type, currentIndex) =>
                currentIndex === index
                    ? {
                          ...type,
                          ...updates,
                      }
                    : type,
            ),
        }));
    }

    function addCategoryType() {
        setTypesTouched(true);

        setForm((currentForm) => ({
            ...currentForm,
            types: [
                ...currentForm.types,
                createEmptyCategoryType(currentForm.types.length),
            ],
        }));
    }

    function removeCategoryType(index: number) {
        setTypesTouched(true);

        setForm((currentForm) => ({
            ...currentForm,
            types: currentForm.types.filter(
                (_type, currentIndex) => currentIndex !== index,
            ),
        }));
    }

    function resetForm() {
        setForm(emptyForm);
        setEditingId(null);
        setTypesTouched(false);
        setError("");
        setSuccess("");
    }

    function startEdit(category: Category) {
        setEditingId(category.id);
        setTypesTouched(false);

        setForm({
            name: category.name,
            slug: category.slug,
            description: category.description ?? "",
            menuGroup: category.menuGroup ?? "AUTRE",
            types: (category.types ?? []).map(categoryTypeToFormType),
            isActive: category.isActive,
        });

        setError("");
        setSuccess("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function validateForm() {
        if (!form.name.trim()) {
            return "Le nom de la catégorie est obligatoire.";
        }

        const activeTypes = form.types.filter((type) => type.name.trim());

        const typeNames = activeTypes.map((type) => normalizeText(type.name));

        if (new Set(typeNames).size !== typeNames.length) {
            return "Les types de catégorie doivent avoir des noms uniques.";
        }

        const typeSlugs = activeTypes
            .map((type) => type.slug.trim() || type.name.trim())
            .map(normalizeText);

        if (new Set(typeSlugs).size !== typeSlugs.length) {
            return "Les types de catégorie doivent avoir des slugs uniques.";
        }

        if (
            activeTypes.some(
                (type) =>
                    type.position.trim() !== "" && Number(type.position) < 0,
            )
        ) {
            return "La position des types doit être supérieure ou égale à 0.";
        }

        return "";
    }

    function buildTypesPayload() {
        return form.types
            .filter((type) => type.name.trim())
            .map((type, index) => ({
                name: type.name.trim(),
                slug: type.slug.trim() || undefined,
                description: type.description.trim() || null,
                isActive: type.isActive,
                position:
                    type.position.trim() !== "" ? Number(type.position) : index,
            }));
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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

        const categoryPayload = {
            name: form.name.trim(),
            slug: form.slug.trim() || undefined,
            description: form.description.trim() || null,
            menuGroup: form.menuGroup,
            isActive: form.isActive,
        };

        try {
            if (editingId) {
                const payload = typesTouched
                    ? {
                          ...categoryPayload,
                          types: buildTypesPayload(),
                      }
                    : categoryPayload;

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
                    ...categoryPayload,
                    description: form.description.trim() || undefined,
                    types: buildTypesPayload(),
                });

                setCategories((currentCategories) => [
                    createdCategory,
                    ...currentCategories,
                ]);

                setSuccess("Catégorie créée avec succès.");
            }

            setForm(emptyForm);
            setEditingId(null);
            setTypesTouched(false);
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

        if (category.isActive) {
            const confirmed = window.confirm(
                `Confirmer la désactivation de la catégorie "${category.name}" ?\n\nLa catégorie ne sera pas supprimée. Elle ne sera plus visible côté client, mais restera disponible dans l’administration.`,
            );

            if (!confirmed) {
                return;
            }
        } else {
            const confirmed = window.confirm(
                `Réactiver la catégorie "${category.name}" ?\n\nElle pourra de nouveau être utilisée côté boutique.`,
            );

            if (!confirmed) {
                return;
            }
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
                            Gérez les catégories, leurs groupes de menu et leurs
                            types associés.
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

            <section className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[460px_1fr]">
                <aside className="h-fit rounded-[2rem] bg-white p-8 shadow-sm">
                    <h2 className="text-2xl font-black">
                        {editingId
                            ? "Modifier une catégorie"
                            : "Nouvelle catégorie"}
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
                                placeholder="Ex: Chaussures"
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
                                Groupe du menu *
                            </label>

                            <select
                                value={form.menuGroup}
                                onChange={(event) =>
                                    updateFormField(
                                        "menuGroup",
                                        event.target.value as CategoryMenuGroup,
                                    )
                                }
                                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-black"
                            >
                                {categoryMenuGroupOptions.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>

                            <p className="mt-2 rounded-2xl bg-neutral-50 p-3 text-xs font-semibold text-neutral-600">
                                {getMenuGroupDescription(form.menuGroup)}
                            </p>
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
                                placeholder="Ex: Chaussures élégantes pour homme."
                            />
                        </div>

                        <section className="rounded-3xl bg-neutral-50 p-5">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-black">
                                        Types de catégorie
                                    </h3>

                                    <p className="mt-1 text-xs text-neutral-500">
                                        Exemple pour Chaussures : Mocassins,
                                        Mules, Sabots, Baskets.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={addCategoryType}
                                    className="shrink-0 rounded-full bg-black px-4 py-2 text-xs font-black text-white"
                                >
                                    + Type
                                </button>
                            </div>

                            {form.types.length === 0 ? (
                                <div className="mt-4 rounded-2xl bg-white p-4 text-sm font-semibold text-neutral-500">
                                    Aucun type ajouté pour cette catégorie.
                                </div>
                            ) : (
                                <div className="mt-4 space-y-4">
                                    {form.types.map((type, index) => (
                                        <div
                                            key={`${type.id ?? "new"}-${index}`}
                                            className="rounded-3xl bg-white p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-neutral-500">
                                                        Nom du type *
                                                    </label>

                                                    <input
                                                        value={type.name}
                                                        onChange={(event) =>
                                                            updateCategoryType(
                                                                index,
                                                                {
                                                                    name: event
                                                                        .target
                                                                        .value,
                                                                },
                                                            )
                                                        }
                                                        placeholder="Ex: Mocassins"
                                                        className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
                                                    />
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeCategoryType(
                                                            index,
                                                        )
                                                    }
                                                    className="mt-7 rounded-full border border-red-200 p-3 text-red-700 hover:border-red-600"
                                                    aria-label="Supprimer le type"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_100px]">
                                                <div>
                                                    <label className="text-xs font-bold text-neutral-500">
                                                        Slug
                                                    </label>

                                                    <input
                                                        value={type.slug}
                                                        onChange={(event) =>
                                                            updateCategoryType(
                                                                index,
                                                                {
                                                                    slug: event
                                                                        .target
                                                                        .value,
                                                                },
                                                            )
                                                        }
                                                        placeholder="Généré automatiquement"
                                                        className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-bold text-neutral-500">
                                                        Position
                                                    </label>

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={type.position}
                                                        onChange={(event) =>
                                                            updateCategoryType(
                                                                index,
                                                                {
                                                                    position:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                },
                                                            )
                                                        }
                                                        className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-3">
                                                <label className="text-xs font-bold text-neutral-500">
                                                    Description
                                                </label>

                                                <input
                                                    value={type.description}
                                                    onChange={(event) =>
                                                        updateCategoryType(
                                                            index,
                                                            {
                                                                description:
                                                                    event.target
                                                                        .value,
                                                            },
                                                        )
                                                    }
                                                    placeholder="Description courte du type"
                                                    className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
                                                />
                                            </div>

                                            <label className="mt-3 flex items-center justify-between rounded-2xl bg-neutral-50 p-3 text-xs font-bold">
                                                Type actif
                                                <input
                                                    type="checkbox"
                                                    checked={type.isActive}
                                                    onChange={(event) =>
                                                        updateCategoryType(
                                                            index,
                                                            {
                                                                isActive:
                                                                    event.target
                                                                        .checked,
                                                            },
                                                        )
                                                    }
                                                />
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <label className="flex items-center justify-between rounded-2xl bg-neutral-50 p-4 text-sm font-bold">
                            Catégorie active
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
                    <div className="grid gap-5 md:grid-cols-5">
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

                        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                            <p className="text-sm text-neutral-500">
                                Collection
                            </p>

                            <p className="mt-2 text-3xl font-black">
                                {collectionCategories}
                            </p>
                        </div>

                        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                            <p className="text-sm text-neutral-500">Types</p>

                            <p className="mt-2 text-3xl font-black">
                                {totalCategoryTypes}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                        <div className="grid gap-4 md:grid-cols-[1fr_180px_220px]">
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
                                    placeholder="Rechercher nom, slug, description, groupe, type..."
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

                            <select
                                value={groupFilter}
                                onChange={(event) =>
                                    setGroupFilter(
                                        event.target
                                            .value as CategoryGroupFilter,
                                    )
                                }
                                className="rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                            >
                                <option value="ALL">Tous les groupes</option>
                                {categoryMenuGroupOptions.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
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
                            {filteredCategories.map((category) => {
                                const menuGroup = category.menuGroup ?? "AUTRE";
                                const isInactive = !category.isActive;
                                const isUpdating =
                                    actionLoadingId === category.id;
                                const types = category.types ?? [];

                                return (
                                    <article
                                        key={category.id}
                                        className={
                                            isInactive
                                                ? "flex flex-col justify-between gap-5 rounded-3xl border border-red-100 bg-white p-5 opacity-80 md:flex-row md:items-center"
                                                : "flex flex-col justify-between gap-5 rounded-3xl border border-neutral-200 p-5 md:flex-row md:items-center"
                                        }
                                    >
                                        <div className="min-w-0 flex-1">
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

                                                <span
                                                    className={getMenuGroupBadgeClass(
                                                        menuGroup,
                                                    )}
                                                >
                                                    {getMenuGroupLabel(
                                                        menuGroup,
                                                    )}
                                                </span>
                                            </div>

                                            <p className="mt-2 text-sm text-neutral-500">
                                                /{category.slug}
                                            </p>

                                            <p className="mt-2 text-sm font-semibold text-neutral-500">
                                                {getMenuGroupDescription(
                                                    menuGroup,
                                                )}
                                            </p>

                                            <p className="mt-2 text-neutral-600">
                                                {category.description ??
                                                    "Aucune description."}
                                            </p>

                                            <div className="mt-4">
                                                <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                                                    Types de catégorie
                                                </p>

                                                {types.length > 0 ? (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {types.map((type) => (
                                                            <span
                                                                key={type.id}
                                                                className={
                                                                    type.isActive
                                                                        ? "rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-700"
                                                                        : "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                                                                }
                                                            >
                                                                {type.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="mt-2 text-sm text-neutral-500">
                                                        Aucun type ajouté.
                                                    </p>
                                                )}
                                            </div>

                                            {isInactive && (
                                                <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                                                    Cette catégorie est
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
                                                    startEdit(category)
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

                                                {isUpdating
                                                    ? "Mise à jour..."
                                                    : category.isActive
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
