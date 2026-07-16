import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { StoreLocator } from "@/components/stores/StoreLocator";
import { STORE_OPENING_HOURS } from "@/data/stores";

export default function PointsDeVentePage() {
    return (
        <>
            <PublicHeader />
            <main className="overflow-hidden bg-[#f7f7f5] px-5 py-12 text-black sm:px-6 md:py-16">
                <div className="mx-auto max-w-[1440px]">
                    <header className="mb-12 border-b border-black pb-10 md:mb-14 md:pb-12">
                        <p className="text-xs font-black uppercase tracking-[0.32em]">
                            BIGOTTI COLLECTION
                        </p>
                        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] lg:items-end">
                            <div>
                                <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-[-0.04em] sm:text-5xl md:text-7xl xl:text-8xl">
                                    NOS POINTS DE VENTE
                                </h1>
                                <p className="mt-6 max-w-xl text-sm leading-6 text-neutral-700 md:text-base">
                                    Retrouvez nos cinq boutiques en Tunisie et
                                    préparez votre visite.
                                </p>
                            </div>
                            <div className="lg:border-l lg:border-black lg:pl-10">
                                <h2 className="font-serif text-3xl italic leading-none md:text-4xl">
                                    HORAIRES
                                </h2>
                                <p className="mt-4 text-2xl font-black uppercase leading-tight tracking-[-0.03em] sm:text-3xl xl:text-4xl">
                                    {STORE_OPENING_HOURS.toLocaleUpperCase(
                                        "fr-FR",
                                    )}
                                </p>
                            </div>
                        </div>
                    </header>
                    <StoreLocator />
                </div>
            </main>
            <PublicFooter />
        </>
    );
}
