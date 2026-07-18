"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { SessionManager } from "@/components/auth/SessionManager";
import {
    changeAdminPassword,
    getAdminMe,
    logoutAdmin,
    updateAdminProfile,
} from "@/lib/api";
import type { AuthUser } from "@/types/auth";

const ROLE_LABELS: Record<AuthUser["role"], string> = {
    MANAGER: "Manager",
    ADMIN: "Administrateur",
    SUPER_ADMIN: "Super administrateur",
};

function clearAdminSession() {
    window.localStorage.removeItem("bigotti-admin-token");
    window.localStorage.removeItem("bigotti-admin-user");
}

export default function AdminProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profileError, setProfileError] = useState("");
    const [profileSuccess, setProfileSuccess] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [showPasswords, setShowPasswords] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        getAdminMe()
            .then((profile) => {
                setUser(profile);
                setFullName(profile.fullName);
            })
            .catch((error) =>
                setProfileError(
                    error instanceof Error
                        ? error.message
                        : "Chargement du profil impossible.",
                ),
            )
            .finally(() => setLoading(false));
    }, []);

    async function saveProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setProfileError("");
        setProfileSuccess("");
        const normalizedName = fullName.trim().replace(/\s+/g, " ");
        if (normalizedName.length < 2 || normalizedName.length > 120) {
            setProfileError(
                "Le nom complet doit contenir entre 2 et 120 caractères.",
            );
            return;
        }
        try {
            setSaving(true);
            const updated = await updateAdminProfile({
                fullName: normalizedName,
            });
            setUser(updated);
            setFullName(updated.fullName);
            window.localStorage.setItem(
                "bigotti-admin-user",
                JSON.stringify(updated),
            );
            setProfileSuccess("Votre profil a été mis à jour.");
        } catch (error) {
            setProfileError(
                error instanceof Error
                    ? error.message
                    : "Mise à jour impossible.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function changePassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setPasswordError("");
        if (newPassword !== confirmNewPassword) {
            setPasswordError("La confirmation du mot de passe ne correspond pas.");
            return;
        }
        if (
            newPassword.length < 8 ||
            newPassword.length > 128 ||
            !/[A-Za-z]/.test(newPassword) ||
            !/\d/.test(newPassword)
        ) {
            setPasswordError(
                "Le nouveau mot de passe doit contenir entre 8 et 128 caractères, au moins une lettre et un chiffre.",
            );
            return;
        }
        try {
            setChangingPassword(true);
            const result = await changeAdminPassword({
                currentPassword,
                newPassword,
                confirmNewPassword,
            });
            await logoutAdmin().catch(() => undefined);
            clearAdminSession();
            window.sessionStorage.setItem(
                "bigotti-admin-login-message",
                result.message,
            );
            router.replace("/admin/login");
        } catch (error) {
            setPasswordError(
                error instanceof Error
                    ? error.message
                    : "Modification du mot de passe impossible.",
            );
        } finally {
            setChangingPassword(false);
        }
    }

    if (loading) {
        return <main className="p-10 text-center">Chargement du profil…</main>;
    }

    return (
        <main className="min-h-screen bg-neutral-50 px-6 py-12 text-neutral-950">
            <div className="mx-auto max-w-5xl">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                            Administration
                        </p>
                        <h1 className="mt-2 text-4xl font-black">Mon profil</h1>
                    </div>
                    <Link href="/admin" className="font-bold underline">
                        Retour
                    </Link>
                </div>

                <div className="mt-10 grid gap-8 lg:grid-cols-2">
                    <form onSubmit={saveProfile} className="rounded-3xl bg-white p-8 shadow-sm">
                        <h2 className="text-2xl font-black">Informations du profil</h2>
                        {profileError && <p className="mt-4 text-sm font-bold text-red-700">{profileError}</p>}
                        {profileSuccess && <p className="mt-4 text-sm font-bold text-green-700">{profileSuccess}</p>}
                        <label className="mt-6 block text-sm font-bold">Nom complet</label>
                        <input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={120} className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3" />
                        <label className="mt-5 block text-sm font-bold">Email</label>
                        <input value={user?.email ?? ""} readOnly className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-neutral-500" />
                        <label className="mt-5 block text-sm font-bold">Rôle</label>
                        <input value={user ? ROLE_LABELS[user.role] : ""} readOnly className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-neutral-500" />
                        <label className="mt-5 block text-sm font-bold">État</label>
                        <input value={user?.isActive ? "Compte actif" : "Compte désactivé"} readOnly className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-neutral-500" />
                        <button disabled={saving} className="mt-7 rounded-full bg-black px-6 py-3 font-bold text-white disabled:opacity-50">
                            {saving ? "Enregistrement…" : "Enregistrer"}
                        </button>
                    </form>

                    <form id="securite" onSubmit={changePassword} className="scroll-mt-8 rounded-3xl bg-white p-8 shadow-sm">
                        <h2 className="text-2xl font-black">Sécurité</h2>
                        <p className="mt-3 text-sm text-neutral-600">Le nouveau mot de passe doit contenir 8 à 128 caractères, une lettre et un chiffre.</p>
                        {passwordError && <p className="mt-4 text-sm font-bold text-red-700">{passwordError}</p>}
                        {[
                            ["Mot de passe actuel", currentPassword, setCurrentPassword],
                            ["Nouveau mot de passe", newPassword, setNewPassword],
                            ["Confirmation", confirmNewPassword, setConfirmNewPassword],
                        ].map(([label, value, setter]) => (
                            <label key={String(label)} className="mt-5 block text-sm font-bold">
                                {String(label)}
                                <input type={showPasswords ? "text" : "password"} value={String(value)} onChange={(event) => (setter as (value: string) => void)(event.target.value)} className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3" />
                            </label>
                        ))}
                        <button type="button" onClick={() => setShowPasswords((value) => !value)} className="mt-4 inline-flex items-center gap-2 text-sm font-bold underline">
                            {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                            {showPasswords ? "Masquer" : "Afficher"}
                        </button>
                        <button disabled={changingPassword} className="mt-7 block rounded-full bg-black px-6 py-3 font-bold text-white disabled:opacity-50">
                            {changingPassword ? "Modification…" : "Modifier mon mot de passe"}
                        </button>
                    </form>
                </div>

                <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
                    <h2 className="text-2xl font-black">Sessions et appareils</h2>
                    <p className="mt-3 text-sm text-neutral-600">
                        Consultez vos sessions administratives et révoquez tout
                        appareil que vous ne reconnaissez pas.
                    </p>
                    <div className="mt-6">
                        <SessionManager scope="admin" />
                    </div>
                </section>
            </div>
        </main>
    );
}
