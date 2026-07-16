import Link from "next/link";
import {
    Mail,
    MapPin,
    PackageCheck,
    Phone,
    ShieldCheck,
    ShoppingBag,
    Smile,
    Truck,
} from "lucide-react";
import { bigottiStores } from "@/data/stores";

const storeLocations = Object.entries(
    bigottiStores.reduce<Record<string, string[]>>((locations, store) => {
        locations[store.city] = [...(locations[store.city] ?? []), store.address];
        return locations;
    }, {}),
).map(([city, stores]) => ({ city, stores }));

const socialLinks = [
    {
        label: "Facebook",
        href: "https://www.facebook.com/Bigotti.collection?utm_source=ig&utm_medium=social&utm_content=link_in_bio",
        initials: "FB",
    },
    {
        label: "Instagram",
        href: "https://www.instagram.com/bigotti.collection/",
        initials: "IG",
    },
    {
        label: "TikTok",
        href: "https://www.tiktok.com/@bigotti_collection",
        initials: "TT",
    },
];

export function PublicFooter() {
    return (
        <footer
            id="contact"
            className="border-t border-neutral-800 bg-[#211d1e] text-white"
        >
            <section className="mx-auto max-w-7xl px-6 py-14">
                <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.45em] text-neutral-400">
                        Bigotti Collection
                    </p>
                </div>

                <div className="mt-10 border-y border-white/15 py-8">
                    <div className="grid gap-8 text-center md:grid-cols-5">
                        <div className="flex flex-col items-center gap-3">
                            <Truck size={28} />

                            <p className="text-sm font-medium text-neutral-200">
                                Livraison à domicile
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <ShieldCheck size={28} />

                            <p className="text-sm font-medium text-neutral-200">
                                Paiement à la livraison
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <ShoppingBag size={28} />

                            <p className="text-sm font-medium text-neutral-200">
                                Commande simple et rapide
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <Smile size={28} />

                            <p className="text-sm font-medium text-neutral-200">
                                Style élégant et moderne
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <MapPin size={28} />

                            <p className="text-sm font-medium text-neutral-200">
                                Points de vente en Tunisie
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-10 border-b border-white/15 py-12 lg:grid-cols-[1fr_1px_1fr]">
                    <div>
                        <h3 className="text-xl font-black">
                            Inscrivez-vous à la newsletter Bigotti
                            <span className="ml-1 text-red-500">×</span>
                        </h3>

                        <p className="mt-4 max-w-xl text-sm leading-7 text-neutral-300">
                            Recevez les nouveautés, les nouvelles collections et
                            les informations de la boutique directement par
                            email.
                        </p>

                        <form
                            action="mailto:stes2514@gmail.com"
                            method="post"
                            encType="text/plain"
                            className="mt-6 flex max-w-xl overflow-hidden rounded-full bg-white"
                        >
                            <input
                                name="email"
                                type="email"
                                placeholder="EMAIL"
                                className="min-w-0 flex-1 px-6 py-4 text-sm font-semibold text-black outline-none"
                            />

                            <button
                                type="submit"
                                className="flex items-center justify-center px-6 text-black transition hover:bg-neutral-100"
                                aria-label="Envoyer"
                            >
                                <Mail size={20} />
                            </button>
                        </form>

                        <p className="mt-5 max-w-xl text-xs leading-6 text-neutral-400">
                            En vous inscrivant, vous acceptez de recevoir les
                            communications de Bigotti Collection. Vous pourrez
                            vous désinscrire à tout moment.
                        </p>
                    </div>

                    <div className="hidden bg-white/15 lg:block" />

                    <div className="lg:pl-14">
                        <h3 className="text-xl font-black">
                            Suivez-nous sur les réseaux
                        </h3>

                        <p className="mt-4 max-w-xl text-sm leading-7 text-neutral-300">
                            Rejoignez Bigotti Collection pour suivre les
                            nouveautés, les arrivages, les looks et les offres.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xs font-black text-white transition hover:border-white hover:bg-white hover:text-black"
                                    aria-label={social.label}
                                >
                                    {social.initials}
                                </a>
                            ))}
                        </div>

                        <div className="mt-8 space-y-3 text-sm text-neutral-300">
                            <a
                                href="tel:+21698134593"
                                className="flex items-center gap-3 transition hover:text-white"
                            >
                                <Phone size={18} />
                                +216 98 134 593
                            </a>

                            <a
                                href="mailto:stes2514@gmail.com"
                                className="flex items-center gap-3 transition hover:text-white"
                            >
                                <Mail size={18} />
                                stes2514@gmail.com
                            </a>
                        </div>
                    </div>
                </div>

                <div className="grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-5">
                    <div>
                        <h3 className="text-lg font-black">Bigotti</h3>

                        <div className="mt-5 space-y-3 text-sm text-neutral-300">
                            <p>
                                Boutique homme moderne : costumes, chaussures,
                                chemises, pantalons et nouveautés.
                            </p>

                            <Link
                                href="/boutique"
                                className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-black text-black transition hover:bg-neutral-200"
                            >
                                Voir la boutique
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-black">Collection</h3>

                        <div className="mt-5 space-y-3 text-sm text-neutral-300">
                            <Link
                                href="/#nouveautes"
                                className="block transition hover:text-white"
                            >
                                Nouveautés
                            </Link>

                            <Link
                                href="/boutique"
                                className="block transition hover:text-white"
                            >
                                Costumes
                            </Link>

                            <Link
                                href="/boutique"
                                className="block transition hover:text-white"
                            >
                                Chaussures
                            </Link>

                            <Link
                                href="/boutique"
                                className="block transition hover:text-white"
                            >
                                Toute la boutique
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-black">Services</h3>

                        <div className="mt-5 space-y-3 text-sm text-neutral-300">
                            <Link
                                href="/suivi-commande"
                                className="block transition hover:text-white"
                            >
                                Suivi commande
                            </Link>

                            <Link
                                href="/panier"
                                className="block transition hover:text-white"
                            >
                                Panier
                            </Link>

                            <Link
                                href="/compte/login"
                                className="block transition hover:text-white"
                            >
                                Mon compte
                            </Link>

                            <p>Paiement à la livraison</p>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-black">
                            Nos points de vente
                        </h3>

                        <div className="mt-5 space-y-5 text-sm text-neutral-300">
                            {storeLocations.map((location) => (
                                <div key={location.city}>
                                    <p className="font-black uppercase text-white">
                                        {location.city}
                                    </p>

                                    <ul className="mt-2 space-y-1">
                                        {location.stores.map((store) => (
                                            <li
                                                key={store}
                                                className="flex gap-2"
                                            >
                                                <span>•</span>
                                                <span>{store}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-black">Besoin d’aide ?</h3>

                        <a
                            href="tel:+21698134593"
                            className="mt-5 inline-flex rounded-full bg-red-600 px-6 py-3 text-sm font-black text-white transition hover:bg-red-700"
                        >
                            +216 98 134 593
                        </a>

                        <p className="mt-5 text-sm leading-7 text-neutral-300">
                            Contactez-nous pour vos questions sur les produits,
                            les commandes, la disponibilité ou les points de
                            vente.
                        </p>

                        <a
                            href="mailto:stes2514@gmail.com"
                            className="mt-4 block text-sm font-semibold text-white underline underline-offset-4"
                        >
                            stes2514@gmail.com
                        </a>
                    </div>
                </div>
            </section>

            <div className="border-t border-white/15 px-6 py-6">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs text-neutral-400 md:flex-row md:items-center md:justify-between">
                    <p>© 2026 Bigotti Collection. Tous droits réservés.</p>

                    <div className="flex flex-wrap gap-5">
                        <Link
                            href="/boutique"
                            className="transition hover:text-white"
                        >
                            Boutique
                        </Link>

                        <Link
                            href="/suivi-commande"
                            className="transition hover:text-white"
                        >
                            Suivi commande
                        </Link>

                        <Link
                            href="/admin/login"
                            className="transition hover:text-white"
                        >
                            Espace admin
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        <PackageCheck size={16} />
                        <span>Paiement à la livraison disponible</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
