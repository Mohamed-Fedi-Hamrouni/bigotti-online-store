type StoreCode = "NABEUL" | "SFAX" | "LAC_2" | "LAFAYETTE" | "SOUKRA";

export type BigottiStore = {
    id: string;
    name: string;
    shortLabel: string;
    city: string;
    address: string;
    openingHours: string;
    latitude: number;
    longitude: number;
    pickupStoreCode: StoreCode;
    googleMapsUrl: string;
};

export const STORE_OPENING_HOURS = "7/7 de 9h jusqu’à 21h";

export const bigottiStores = [
    {
        id: "sou-kra",
        name: "Bigotti Soukra",
        shortLabel: "Soukra",
        city: "Tunis",
        address: "Soukra Ariana, avant Monoprix, à droite",
        openingHours: STORE_OPENING_HOURS,
        latitude: 36.8632133,
        longitude: 10.2145947,
        pickupStoreCode: "SOUKRA",
        googleMapsUrl: "https://maps.app.goo.gl/pU7HJEii7ZfWZSZo6",
    },
    {
        id: "lafayette",
        name: "Bigotti Lafayette",
        shortLabel: "Lafayette",
        city: "Tunis",
        address: "Lafayette, devant Champion",
        openingHours: STORE_OPENING_HOURS,
        latitude: 36.8121819,
        longitude: 10.1798184,
        pickupStoreCode: "LAFAYETTE",
        googleMapsUrl: "https://maps.app.goo.gl/bSTYjhQKj63dXJYB7",
    },
    {
        id: "lac-2",
        name: "Bigotti Lac 2",
        shortLabel: "Lac 2",
        city: "Tunis",
        address: "Lac 2, Jinan Al Bouhayra, à côté de Tunisia Mall",
        openingHours: STORE_OPENING_HOURS,
        latitude: 36.8488125,
        longitude: 10.2774375,
        pickupStoreCode: "LAC_2",
        googleMapsUrl: "https://maps.app.goo.gl/m4YHmJz3hM5sWQxz8",
    },
    {
        id: "nabeul",
        name: "Bigotti Nabeul",
        shortLabel: "Nabeul",
        city: "Nabeul",
        address:
            "Avenue Habib Thameur, à côté de l’Institut Supérieur des Langues",
        openingHours: STORE_OPENING_HOURS,
        latitude: 36.4499316,
        longitude: 10.7241672,
        pickupStoreCode: "NABEUL",
        googleMapsUrl: "https://maps.app.goo.gl/k3bZYr3Kdv6qhzhh7",
    },
    {
        id: "sfax",
        name: "Bigotti Sfax",
        shortLabel: "Sfax",
        city: "Sfax",
        address: "Nasria, Avenue Med Chaabouni, Immeuble El Habib",
        openingHours: STORE_OPENING_HOURS,
        latitude: 34.7412616,
        longitude: 10.7535789,
        pickupStoreCode: "SFAX",
        googleMapsUrl: "https://maps.app.goo.gl/mqyQNVcD9QWpwkxF7",
    },
] satisfies BigottiStore[];
