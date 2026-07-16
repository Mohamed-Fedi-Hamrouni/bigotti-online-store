"use client";

import { Check, ExternalLink, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { bigottiStores } from "@/data/stores";

const StoreMap = dynamic(() => import("@/components/stores/StoreMap"), {
    ssr: false,
    loading: () => (
        <div className="flex h-[440px] items-center justify-center rounded-3xl border-2 border-black bg-neutral-200 px-6 text-center text-sm font-bold lg:h-[min(680px,calc(100vh-10rem))]">
            Chargement de la carte…
        </div>
    ),
});

export function StoreLocator() {
    const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

    return (
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:gap-12">
            <section aria-labelledby="store-list-title" className="min-w-0">
                <h2
                    id="store-list-title"
                    className="mb-6 text-sm font-black uppercase tracking-[0.24em]"
                >
                    Nos boutiques
                </h2>
                <div className="space-y-4">
                    {bigottiStores.map((store, index) => {
                        const selected = store.id === selectedStoreId;

                        return (
                            <article
                                key={store.id}
                                onClick={() => setSelectedStoreId(store.id)}
                                className={`rounded-3xl border-2 bg-white p-5 transition sm:p-6 ${
                                    selected
                                        ? "border-black shadow-[5px_5px_0_0_#000]"
                                        : "cursor-pointer border-neutral-200 hover:border-neutral-500"
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-white">
                                        <MapPin size={19} aria-hidden="true" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-600">
                                                    {String(index + 1).padStart(2, "0")} — {store.city}
                                                </p>
                                                <h3 className="mt-2 text-xl font-black uppercase tracking-[-0.02em]">
                                                    {store.name}
                                                </h3>
                                            </div>
                                            {selected && (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                                                    <Check size={13} aria-hidden="true" />
                                                    Sélectionné
                                                </span>
                                            )}
                                        </div>
                                        <address className="mt-4 not-italic text-sm leading-6 text-neutral-800">
                                            {store.address}
                                        </address>
                                        <p className="mt-2 text-sm font-bold text-black">
                                            {store.openingHours}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-5 flex flex-col gap-3 border-t border-neutral-200 pt-5 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedStoreId(store.id)}
                                        aria-pressed={selected}
                                        className="rounded-full border border-black px-5 py-3 text-xs font-black uppercase tracking-[0.12em] transition hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                    >
                                        {selected ? "Boutique sélectionnée" : "Voir sur la carte"}
                                    </button>
                                    <a
                                        href={store.googleMapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-center text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                        aria-label={`Itinéraire Google Maps vers ${store.name} (nouvel onglet)`}
                                    >
                                        Itinéraire
                                        <ExternalLink size={14} aria-hidden="true" />
                                    </a>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section
                aria-labelledby="store-map-title"
                className="min-w-0 lg:sticky lg:top-36 lg:self-start"
            >
                <h2 id="store-map-title" className="sr-only">
                    Carte interactive des points de vente
                </h2>
                <StoreMap
                    stores={bigottiStores}
                    selectedStoreId={selectedStoreId}
                    onSelectStore={setSelectedStoreId}
                />
            </section>
        </div>
    );
}
