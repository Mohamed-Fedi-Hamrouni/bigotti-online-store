import type { PickupStore } from "@/types/order";

export type BigottiStore = {
    id: string;
    name: string;
    city: string;
    address: string;
    pickupLabel: string;
    phone?: string;
    openingHours: string;
    latitude?: number;
    longitude?: number;
    pickupStoreCode: PickupStore;
};

export const STORE_OPENING_HOURS = "7/7 de 9h jusqu’à 21h";

export const bigottiStores = [
    {
        id: "sou-kra",
        name: "Bigotti Soukra",
        city: "Tunis",
        address: "Soukra Ariana, avant Monoprix, à droite",
        pickupLabel: "Soukra",
        openingHours: STORE_OPENING_HOURS,
        pickupStoreCode: "SOUKRA",
    },
    {
        id: "lafayette",
        name: "Bigotti Lafayette",
        city: "Tunis",
        address: "Lafayette, devant Champion",
        pickupLabel: "Lafayette",
        openingHours: STORE_OPENING_HOURS,
        pickupStoreCode: "LAFAYETTE",
    },
    {
        id: "lac-2",
        name: "Bigotti Lac 2",
        city: "Tunis",
        address: "Lac 2, Jinan Al Bouhayra, à côté de Tunisia Mall",
        pickupLabel: "Lac 2",
        openingHours: STORE_OPENING_HOURS,
        pickupStoreCode: "LAC_2",
    },
    {
        id: "nabeul",
        name: "Bigotti Nabeul",
        city: "Nabeul",
        address:
            "Avenue Habib Thameur, à côté de l’Institut Supérieur des Langues",
        pickupLabel: "Nabeul",
        openingHours: STORE_OPENING_HOURS,
        pickupStoreCode: "NABEUL",
    },
    {
        id: "sfax",
        name: "Bigotti Sfax",
        city: "Sfax",
        address: "Nasria, Avenue Med Chaabouni, Immeuble El Habib",
        pickupLabel: "Sfax",
        openingHours: STORE_OPENING_HOURS,
        pickupStoreCode: "SFAX",
    },
] satisfies BigottiStore[];

export function getStoreDirectionsUrl(store: BigottiStore) {
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(
        `${store.address}, ${store.city}, Tunisie`,
    )}`;
}
