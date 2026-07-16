import type { PickupStore } from "@/types/order";

export type BigottiStore = {
    id: string;
    name: string;
    city: string;
    address: string;
    phone?: string;
    openingHours?: string[];
    latitude?: number;
    longitude?: number;
    pickupStoreCode?: PickupStore;
};

export const bigottiStores: BigottiStore[] = [
    {
        id: "sou-kra",
        name: "Bigotti Soukra",
        city: "Tunis",
        address: "Soukra Ariana",
        pickupStoreCode: "SOUKRA",
    },
    {
        id: "lafayette",
        name: "Bigotti Lafayette",
        city: "Tunis",
        address: "Lafayette",
        pickupStoreCode: "LAFAYETTE",
    },
    {
        id: "lac-2",
        name: "Bigotti Lac 2",
        city: "Tunis",
        address: "Lac 2, Jinan Al Bouhayra",
        pickupStoreCode: "LAC_2",
    },
    {
        id: "nabeul",
        name: "Bigotti Nabeul",
        city: "Nabeul",
        address: "Avenue Habib Thameur",
        pickupStoreCode: "NABEUL",
    },
    {
        id: "sfax",
        name: "Bigotti Sfax",
        city: "Sfax",
        address: "Nasria, Avenue Med Chaabouni",
        pickupStoreCode: "SFAX",
    },
];

export function getStoreDirectionsUrl(store: BigottiStore) {
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(
        `${store.name}, ${store.address}, ${store.city}, Tunisie`,
    )}`;
}
