import type { Product } from "@/types/product";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Erreur API ${response.status}: ${path}`);
    }

    return response.json();
}

export async function getProducts() {
    return fetchJson<Product[]>("/products");
}

export async function getProductBySlug(slug: string) {
    return fetchJson<Product>(`/products/slug/${slug}`);
}
