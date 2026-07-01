import type { LoginResponse } from "@/types/auth";
import type {
    AdminOrder,
    CreateOrderPayload,
    CreatedOrder,
    OrderStatus,
} from "@/types/order";
import type {
    Category,
    Collection,
    CreateProductPayload,
    Product,
    SaleCampaign,
} from "@/types/product";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function fetchJson<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        cache: "no-store",
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers as Record<string, string> | undefined),
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        const message = Array.isArray(error?.message)
            ? error.message.join(", ")
            : error?.message;

        throw new Error(message ?? `Erreur API ${response.status}: ${path}`);
    }

    return response.json();
}

export async function getProducts() {
    return fetchJson<Product[]>("/products");
}

export async function getProductBySlug(slug: string) {
    return fetchJson<Product>(`/products/slug/${slug}`);
}

export async function createOrder(payload: CreateOrderPayload) {
    return fetchJson<CreatedOrder>("/orders", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function login(payload: { email: string; password: string }) {
    return fetchJson<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function getAdminOrders(token: string) {
    return fetchJson<AdminOrder[]>("/orders/admin", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

export async function updateOrderStatus(
    token: string,
    orderId: string,
    orderStatus: OrderStatus,
) {
    return fetchJson<AdminOrder>(`/orders/admin/${orderId}/status`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderStatus }),
    });
}

export async function getAdminProducts(token: string) {
    return fetchJson<Product[]>("/products/admin/all", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

export async function createProduct(
    token: string,
    payload: CreateProductPayload,
) {
    return fetchJson<Product>("/products", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
}

export async function getAdminCategories(token: string) {
    return fetchJson<Category[]>("/categories/admin", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

export async function getAdminCollections(token: string) {
    return fetchJson<Collection[]>("/collections/admin", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

export async function getAdminSaleCampaigns(token: string) {
    return fetchJson<SaleCampaign[]>("/sale-campaigns/admin", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

export type UploadProductImageResponse = {
    url: string;
    storagePath: string;
    filename: string;
};

export async function uploadProductImage(token: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/uploads/products`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        const message = Array.isArray(error?.message)
            ? error.message.join(", ")
            : error?.message;

        throw new Error(message ?? "Erreur lors de l’upload de l’image.");
    }

    return response.json() as Promise<UploadProductImageResponse>;
}
