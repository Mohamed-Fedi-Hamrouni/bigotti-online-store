import Link from "next/link";

export function PublicFooter() {
    return (
        <footer id="contact" className="border-t border-neutral-200 bg-white">
            <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
                <div>
                    <img
                        src="/images/bigotti-logo.jpg"
                        alt="Bigotti Collection"
                        className="h-20 w-auto object-contain"
                    />

                    <p className="mt-5 max-w-md leading-7 text-neutral-600">
                        Bigotti Collection propose une sélection homme élégante,
                        moderne et adaptée au quotidien comme aux occasions.
                    </p>
                </div>

                <div>
                    <h3 className="font-bold">Boutique</h3>

                    <div className="mt-4 space-y-3 text-sm text-neutral-600">
                        <Link
                            href="/#boutique"
                            className="block hover:text-black"
                        >
                            Produits
                        </Link>

                        <Link
                            href="/#collections"
                            className="block hover:text-black"
                        >
                            Collections
                        </Link>

                        <Link href="/panier" className="block hover:text-black">
                            Panier
                        </Link>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold">Services</h3>

                    <div className="mt-4 space-y-3 text-sm text-neutral-600">
                        <p>Livraison à domicile</p>
                        <p>Paiement à la livraison</p>
                        <p>Commande simple et rapide</p>
                    </div>
                </div>
            </div>

            <div className="border-t border-neutral-200 px-6 py-5 text-center text-sm text-neutral-500">
                © 2026 Bigotti Collection. Tous droits réservés.
            </div>
        </footer>
    );
}
