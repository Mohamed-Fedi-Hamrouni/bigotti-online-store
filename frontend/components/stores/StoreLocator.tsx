"use client";

import { Check, ExternalLink, MapPin } from "lucide-react";
import { useState } from "react";
import { bigottiStores, getStoreDirectionsUrl } from "@/data/stores";

export function StoreLocator() {
    const [selectedStoreId, setSelectedStoreId] = useState(
        bigottiStores[0]?.id ?? "",
    );
    const selectedStore =
        bigottiStores.find((store) => store.id === selectedStoreId) ??
        bigottiStores[0];

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
                                className={`rounded-3xl border-2 bg-white p-5 transition sm:p-6 ${
                                    selected
                                        ? "border-black"
                                        : "border-neutral-200 hover:border-neutral-500"
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
                                        {selected ? "Boutique sélectionnée" : "Sélectionner"}
                                    </button>
                                    <a
                                        href={getStoreDirectionsUrl(store)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-center text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                        aria-label={`Voir ${store.name} sur OpenStreetMap (nouvel onglet)`}
                                    >
                                        Voir sur OpenStreetMap
                                        <ExternalLink size={14} aria-hidden="true" />
                                    </a>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section
                aria-labelledby="map-title"
                className="relative min-h-[420px] overflow-hidden rounded-3xl border-2 border-black bg-[#e8e8e3] lg:sticky lg:top-36 lg:h-[min(680px,calc(100vh-10rem))]"
            >
                <div
                    aria-hidden="true"
                    className="absolute inset-0 opacity-35 [background-image:linear-gradient(35deg,transparent_45%,#8b8b84_46%,#8b8b84_48%,transparent_49%),linear-gradient(125deg,transparent_42%,#fff_43%,#fff_47%,transparent_48%),linear-gradient(#b8b8b1_1px,transparent_1px),linear-gradient(90deg,#b8b8b1_1px,transparent_1px)] [background-size:180px_180px,240px_240px,44px_44px,44px_44px]"
                />
                <div className="relative flex h-full min-h-[420px] flex-col justify-between p-6 sm:p-8 md:p-10">
                    <div className="flex items-center justify-between border-b border-black pb-4">
                        <p className="text-xs font-black uppercase tracking-[0.24em]">
                            OpenStreetMap
                        </p>
                        <MapPin size={22} aria-hidden="true" />
                    </div>
                    <div className="my-12 max-w-lg rounded-3xl border border-black bg-white p-6 shadow-[8px_8px_0_0_#000] sm:p-8">
                        <p className="text-sm leading-6 text-neutral-700">
                            Sélectionnez un point de vente pour l’ouvrir sur OpenStreetMap.
                        </p>
                        {selectedStore && (
                            <>
                                <h2 id="map-title" className="mt-6 text-2xl font-black uppercase tracking-[-0.03em] sm:text-3xl">
                                    {selectedStore.name}
                                </h2>
                                <address className="mt-3 not-italic text-sm leading-6 text-neutral-800">
                                    {selectedStore.address}, {selectedStore.city}, Tunisie
                                </address>
                                <a
                                    href={getStoreDirectionsUrl(selectedStore)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-4 text-center text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                    aria-label={`Ouvrir ${selectedStore.name} dans OpenStreetMap (nouvel onglet)`}
                                >
                                    Ouvrir dans OpenStreetMap
                                    <ExternalLink size={15} aria-hidden="true" />
                                </a>
                            </>
                        )}
                    </div>
                    <a
                        href="https://www.openstreetmap.org/copyright"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="self-start rounded bg-white px-3 py-2 text-xs font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                        © OpenStreetMap contributors
                    </a>
                </div>
            </section>
        </div>
    );
}
