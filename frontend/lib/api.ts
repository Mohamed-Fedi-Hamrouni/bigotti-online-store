import type { LoginResponse } from "@/types/auth";
import type { ManagerDashboard } from "@/types/dashboard";
import type {
    AdminOrder,
    CreateOrderPayload,
    CreatedOrder,
    OrderStatus,
    TrackedOrder,
} from "@/types/order";
import type {
    Category,
    Collection,
    CreateCategoryPayload,
    CreateCollectionPayload,
    CreateProductPayload,
    CreateSaleCampaignPayload,
    Product,
    ProductStatus,
    SaleCampaign,
    UpdateCategoryPayload,
    UpdateCollectionPayload,
    UpdateProductPayload,
    UpdateSaleCampaignPayload,
} from "@/types/product";

import type {
    ChangeCustomerPasswordPayload,
    ChangeCustomerPasswordResponse,
    Customer,
    CustomerAuthResponse,
    LoginCustomerPayload,
    RegisterCustomerPayload,
    UpdateCustomerProfilePayload,
} from "@/types/customer";

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

export async function createOrder(
    payload: CreateOrderPayload,
    customerToken?: string | null,
) {
    return fetchJson<CreatedOrder>("/orders", {
        method: "POST",
        headers: customerToken
            ? {
                  Authorization: `Bearer ${customerToken}`,
              }
            : undefined,
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

export async function getAdminProduct(token: string, productId: string) {
    return fetchJson<Product>(`/products/admin/${productId}`, {
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

export async function updateProduct(
    token: string,
    productId: string,
    payload: UpdateProductPayload,
) {
    return fetchJson<Product>(`/products/${productId}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
}

export async function updateProductStatus(
    token: string,
    productId: string,
    status: ProductStatus,
) {
    return fetchJson<Product>(`/products/${productId}/status`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
    });
}

export async function getAdminCategories(token: string) {
    return fetchJson<Category[]>("/categories/admin", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

export async function createCategory(
    token: string,
    payload: CreateCategoryPayload,
) {
    return fetchJson<Category>("/categories", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
}

export async function updateCategory(
    token: string,
    categoryId: string,
    payload: UpdateCategoryPayload,
) {
    return fetchJson<Category>(`/categories/${categoryId}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
}

export async function updateCategoryStatus(
    token: string,
    categoryId: string,
    isActive: boolean,
) {
    return fetchJson<Category>(`/categories/${categoryId}/status`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive }),
    });
}

export async function getAdminCollections(token: string) {
    return fetchJson<Collection[]>("/collections/admin", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

export async function createCollection(
    token: string,
    payload: CreateCollectionPayload,
) {
    return fetchJson<Collection>("/collections", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
}

export async function updateCollection(
    token: string,
    collectionId: string,
    payload: UpdateCollectionPayload,
) {
    return fetchJson<Collection>(`/collections/${collectionId}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
}

export async function updateCollectionStatus(
    token: string,
    collectionId: string,
    isActive: boolean,
) {
    return fetchJson<Collection>(`/collections/${collectionId}/status`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive }),
    });
}

export async function getAdminSaleCampaigns(token: string) {
    return fetchJson<SaleCampaign[]>("/sale-campaigns/admin", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

export async function createSaleCampaign(
    token: string,
    payload: CreateSaleCampaignPayload,
) {
    return fetchJson<SaleCampaign>("/sale-campaigns", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
}

export async function updateSaleCampaign(
    token: string,
    campaignId: string,
    payload: UpdateSaleCampaignPayload,
) {
    return fetchJson<SaleCampaign>(`/sale-campaigns/${campaignId}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
}

export async function updateSaleCampaignStatus(
    token: string,
    campaignId: string,
    isActive: boolean,
) {
    return fetchJson<SaleCampaign>(`/sale-campaigns/${campaignId}/status`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive }),
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

export async function getManagerDashboard(token: string) {
    return fetchJson<ManagerDashboard>("/dashboard/manager", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

export async function trackOrder(orderNumber: string, phone: string) {
    const params = new URLSearchParams({
        orderNumber,
        phone,
    });

    return fetchJson<TrackedOrder>(`/orders/track?${params.toString()}`);
}

export async function registerCustomer(payload: RegisterCustomerPayload) {
    return fetchJson<CustomerAuthResponse>("/customer-auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function loginCustomer(payload: LoginCustomerPayload) {
    return fetchJson<CustomerAuthResponse>("/customer-auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function getCustomerMe(token: string) {
    return fetchJson<Customer>("/customer-auth/me", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

export async function getCustomerOrders(token: string) {
    return fetchJson<AdminOrder[]>("/customer-auth/orders", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

export async function updateCustomerProfile(
    token: string,
    payload: UpdateCustomerProfilePayload,
) {
    return fetchJson<Customer>("/customer-auth/profile", {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
}

export async function changeCustomerPassword(
    token: string,
    payload: ChangeCustomerPasswordPayload,
) {
    return fetchJson<ChangeCustomerPasswordResponse>(
        "/customer-auth/password",
        {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        },
    );
}
