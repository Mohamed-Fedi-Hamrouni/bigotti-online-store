"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
    createInternalUser,
    getAdminMe,
    getInternalUsers,
    updateInternalUserRole,
    updateInternalUserStatus,
} from "@/lib/api";
import type { AuthUser, UserRole } from "@/types/auth";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];
const ROLE_LABELS: Record<UserRole, string> = {
    SUPER_ADMIN: "Super administrateur",
    ADMIN: "Administrateur",
    MANAGER: "Manager",
};

export default function InternalUsersPage() {
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        fullName: "",
        email: "",
        password: "",
        role: "ADMIN" as UserRole,
    });

    useEffect(() => {
        Promise.all([getAdminMe(), getInternalUsers()])
            .then(([me, internalUsers]) => {
                setCurrentUser(me);
                setUsers(internalUsers);
            })
            .catch((err) =>
                setError(err instanceof Error ? err.message : "Chargement impossible."),
            )
            .finally(() => setLoading(false));
    }, []);

    function replaceUser(updated: AuthUser) {
        setUsers((items) => items.map((item) => item.id === updated.id ? updated : item));
    }

    async function changeRole(user: AuthUser, role: UserRole) {
        setBusyId(user.id);
        setError("");
        setSuccess("");
        try {
            replaceUser(await updateInternalUserRole(user.id, role));
            setSuccess(`Le rôle de ${user.fullName} a été modifié. Ses sessions ont été fermées.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Modification impossible.");
        } finally {
            setBusyId("");
        }
    }

    async function changeStatus(user: AuthUser) {
        setBusyId(user.id);
        setError("");
        setSuccess("");
        try {
            replaceUser(await updateInternalUserStatus(user.id, !user.isActive));
            setSuccess(
                user.isActive
                    ? `Le compte de ${user.fullName} a été désactivé et ses sessions fermées.`
                    : `Le compte de ${user.fullName} a été activé.`,
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Modification impossible.");
        } finally {
            setBusyId("");
        }
    }

    async function createUser(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSuccess("");
        if (!form.fullName.trim() || !form.email.trim() || !form.password) {
            setError("Tous les champs de création sont obligatoires.");
            return;
        }
        if (form.fullName.trim().length < 2 || form.password.length < 8) {
            setError("Le nom doit contenir 2 caractères et le mot de passe au moins 8.");
            return;
        }
        setCreating(true);
        try {
            const created = await createInternalUser({
                ...form,
                fullName: form.fullName.trim(),
                email: form.email.trim().toLowerCase(),
            });
            setUsers((items) => [created, ...items]);
            setForm({ fullName: "", email: "", password: "", role: "ADMIN" });
            setSuccess(`Le compte de ${created.fullName} a été créé.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Création impossible.");
        } finally {
            setCreating(false);
        }
    }

    return (
        <main className="min-h-screen bg-neutral-50 px-6 py-10 text-neutral-950">
            <div className="mx-auto max-w-7xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.25em] text-neutral-500">Administration</p>
                        <h1 className="mt-2 text-4xl font-black">Utilisateurs internes</h1>
                    </div>
                    <Link href="/admin" className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-black">Retour</Link>
                </div>

                {error && <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
                {success && <p role="status" className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">{success}</p>}

                <form onSubmit={createUser} className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-black">Créer un utilisateur</h2>
                    <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <input aria-label="Nom complet" placeholder="Nom complet" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="rounded-2xl border p-3" />
                        <input aria-label="Email" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-2xl border p-3" />
                        <input aria-label="Mot de passe" type="password" placeholder="Mot de passe (8 caractères minimum)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-2xl border p-3" />
                        <select aria-label="Rôle" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className="rounded-2xl border p-3">
                            {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                        </select>
                    </div>
                    <button disabled={creating} className="mt-5 rounded-full bg-black px-6 py-3 font-black text-white disabled:opacity-50">
                        {creating ? "Création..." : "Créer le compte"}
                    </button>
                </form>

                <section className="mt-8">
                    <h2 className="text-2xl font-black">Comptes internes</h2>
                    {loading ? (
                        <p className="mt-5 rounded-3xl bg-white p-6">Chargement des utilisateurs...</p>
                    ) : users.length === 0 ? (
                        <p className="mt-5 rounded-3xl bg-white p-6">Aucun utilisateur interne.</p>
                    ) : (
                        <div className="mt-5 grid gap-4">
                            {users.map((user) => {
                                const isSelf = user.id === currentUser?.id;
                                return (
                                    <article key={user.id} className="grid items-center gap-4 rounded-3xl bg-white p-6 shadow-sm md:grid-cols-[1fr_1fr_220px_150px_160px]">
                                        <div><p className="font-black">{user.fullName}</p>{isSelf && <p className="text-xs text-neutral-500">Compte actuel</p>}</div>
                                        <p className="break-all text-sm text-neutral-600">{user.email}</p>
                                        <select
                                            aria-label={`Rôle de ${user.fullName}`}
                                            value={user.role}
                                            disabled={isSelf || busyId === user.id}
                                            onChange={(e) => changeRole(user, e.target.value as UserRole)}
                                            className="rounded-xl border p-3 disabled:bg-neutral-100"
                                        >
                                            {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                                        </select>
                                        <span className={user.isActive ? "font-bold text-emerald-700" : "font-bold text-red-700"}>
                                            {user.isActive ? "Actif" : "Inactif"}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={isSelf || busyId === user.id}
                                            onClick={() => changeStatus(user)}
                                            className="rounded-full border border-neutral-300 px-4 py-3 text-sm font-black disabled:opacity-40"
                                        >
                                            {busyId === user.id ? "Modification..." : user.isActive ? "Désactiver" : "Activer"}
                                        </button>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
