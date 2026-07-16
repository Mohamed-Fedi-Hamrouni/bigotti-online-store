"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { useState } from "react";
import {
    bigottiStores,
    getStoreDirectionsUrl,
    type BigottiStore,
} from "@/data/stores";

function hasCoordinates(store: BigottiStore) {
    return (
        typeof store.latitude === "number" &&
        typeof store.longitude === "number"
    );
}

export function StoreLocator() {
    const [selectedStoreId, setSelectedStoreId] = useState(
        bigottiStores[0]?.id ?? "",
    );

    return (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-4">
                {bigottiStores.map((store) => {
                    const selected = store.id === selectedStoreId;
                    const coordinatesAvailable = hasCoordinates(store);

                    return (
                        <article
                            key={store.id}
                            className={`rounded-[2rem] border bg-white p-6 transition ${
                                selected
                                    ? "border-black shadow-lg"
                                    : "border-neutral-200 hover:border-neutral-400"
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                <span className="rounded-full bg-black p-3 text-white">
                                    <MapPin size={20} aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <h2 className="text-lg font-black uppercase tracking-[0.08em]">
                                        {store.name}
                                    </h2>
                                    <p className="mt-1 text-sm font-bold text-neutral-500">
                                        {store.city}
                                    </p>
                                    <p className="mt-3 text-sm leading-6 text-neutral-700">
                                        {store.address}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSelectedStoreId(store.id)}
                                    disabled={!coordinatesAvailable}
                                    className="rounded-full border border-black px-5 py-3 text-xs font-black uppercase tracking-[0.14em] transition hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-white"
                                    title={
                                        coordinatesAvailable
                                            ? undefined
                                            : "Coordonnées géographiques indisponibles"
                                    }
                                >
                                    Voir sur la carte
                                </button>
                                <a
                                    href={getStoreDirectionsUrl(store)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                >
                                    Itinéraire
                                    <ExternalLink size={15} aria-hidden="true" />
                                </a>
                            </div>
                        </article>
                    );
                })}
            </div>

            <section
                aria-label="Carte des points de vente"
                className="min-h-[360px] overflow-hidden rounded-[2rem] border border-neutral-200 bg-neutral-100 lg:sticky lg:top-36 lg:h-[min(680px,calc(100vh-10rem))]"
            >
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center px-8 text-center">
                    <MapPin size={42} aria-hidden="true" />
                    <h2 className="mt-5 text-xl font-black">
                        Carte en attente des coordonnées officielles
                    </h2>
                    <p className="mt-3 max-w-md text-sm leading-6 text-neutral-600">
                        Les adresses disponibles ne contiennent pas de latitude
                        ni de longitude vérifiées. Aucun marqueur approximatif
                        n’est affiché.
                    </p>
                    <a
                        href="https://www.openstreetmap.org/copyright"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-8 text-xs font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                        © OpenStreetMap contributors
                    </a>
                </div>
            </section>
        </div>
    );
}
