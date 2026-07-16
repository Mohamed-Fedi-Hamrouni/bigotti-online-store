"use client";

import L, { type Marker as LeafletMarker } from "leaflet";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { BigottiStore } from "@/data/stores";

type StoreMapProps = {
    stores: BigottiStore[];
    selectedStoreId: string | null;
    onSelectStore: (storeId: string) => void;
};

function createMarkerIcon(selected: boolean) {
    return L.divIcon({
        className: "bigotti-map-marker-shell",
        html: `<span class="bigotti-map-marker${selected ? " bigotti-map-marker--selected" : ""}" aria-hidden="true"><span></span></span>`,
        iconSize: selected ? [44, 52] : [38, 46],
        iconAnchor: selected ? [22, 52] : [19, 46],
        popupAnchor: [0, -44],
    });
}

function SelectedStoreController({
    selectedStore,
    markerRefs,
}: {
    selectedStore: BigottiStore | null;
    markerRefs: RefObject<Record<string, LeafletMarker | null>>;
}) {
    const map = useMap();

    useEffect(() => {
        if (!selectedStore) {
            return;
        }

        const marker = markerRefs.current[selectedStore.id];

        if (!marker) {
            return;
        }

        map.flyTo(
            [selectedStore.latitude, selectedStore.longitude],
            17,
            { duration: 0.8 },
        );
        marker.openPopup();
    }, [map, markerRefs, selectedStore]);

    return null;
}

export default function StoreMap({
    stores,
    selectedStoreId,
    onSelectStore,
}: StoreMapProps) {
    const markerRefs = useRef<Record<string, LeafletMarker | null>>({});
    const bounds = useMemo(
        () =>
            L.latLngBounds(
                stores.map((store) => [
                    store.latitude,
                    store.longitude,
                ]),
            ),
        [stores],
    );
    const selectedStore =
        stores.find((store) => store.id === selectedStoreId) ?? null;

    return (
        <div className="h-[440px] w-full overflow-hidden rounded-3xl border-2 border-black bg-neutral-200 lg:h-[min(680px,calc(100vh-10rem))]">
            <MapContainer
                bounds={bounds}
                boundsOptions={{ padding: [36, 36] }}
                className="h-full w-full"
                scrollWheelZoom
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {stores.map((store) => {
                    const selected = store.id === selectedStoreId;

                    return (
                        <Marker
                            key={store.id}
                            position={[store.latitude, store.longitude]}
                            icon={createMarkerIcon(selected)}
                            ref={(marker) => {
                                markerRefs.current[store.id] = marker;
                            }}
                            eventHandlers={{
                                click: () => onSelectStore(store.id),
                            }}
                            title={store.name}
                        >
                            <Popup>
                                <div className="min-w-56 font-sans text-black">
                                    <h3 className="text-base font-black uppercase">
                                        {store.name}
                                    </h3>
                                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-neutral-600">
                                        {store.city}
                                    </p>
                                    <p className="mt-3 text-sm leading-5">
                                        {store.address}
                                    </p>
                                    <p className="mt-2 text-sm font-bold">
                                        {store.openingHours}
                                    </p>
                                    <a
                                        href={store.googleMapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-4 inline-flex rounded-full bg-black px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                        aria-label={`Itinéraire Google Maps vers ${store.name} (nouvel onglet)`}
                                    >
                                        Itinéraire Google Maps
                                    </a>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
                <SelectedStoreController
                    selectedStore={selectedStore}
                    markerRefs={markerRefs}
                />
            </MapContainer>
        </div>
    );
}
