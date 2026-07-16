import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { StoreLocator } from "@/components/stores/StoreLocator";

export default function PointsDeVentePage() {
    return (
        <>
            <PublicHeader />
            <main className="bg-neutral-50 px-6 py-12 md:py-16">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-10 max-w-2xl">
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-neutral-500">
                            Bigotti Collection
                        </p>
                        <h1 className="mt-4 text-4xl font-black uppercase tracking-tight md:text-5xl">
                            Nos points de vente
                        </h1>
                        <p className="mt-5 leading-7 text-neutral-600">
                            Retrouvez les magasins Bigotti référencés en Tunisie
                            et préparez votre visite. Les informations affichées
                            proviennent des données déjà disponibles sur la
                            boutique.
                        </p>
                    </div>
                    <StoreLocator />
                </div>
            </main>
            <PublicFooter />
        </>
    );
}
