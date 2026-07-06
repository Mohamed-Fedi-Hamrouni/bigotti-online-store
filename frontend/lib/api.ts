import type { AuthUser, LoginResponse } from "@/types/auth";
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
    CategoryType,
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

export const COOKIE_SESSION_MARKER = "cookie-session";

function buildAuthHeaders(token?: string | null) {
    if (!token || token === COOKIE_SESSION_MARKER) {
        return {};
    }

    return {
        Authorization: `Bearer ${token}`,
    };
}

async function fetchJson<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        cache: "no-store",
        credentials: "include",
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

function toNumber(value: unknown, fallback = 0) {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function toNullableNumber(value: unknown) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : null;
}

function toMoney(value: number) {
    return Number(value.toFixed(3));
}

function isDateRangeActive(startDate?: string | null, endDate?: string | null) {
    const now = new Date();

    if (startDate && new Date(startDate) > now) {
        return false;
    }

    if (endDate && new Date(endDate) < now) {
        return false;
    }

    return true;
}

function calculateProductPromoPrice(product: Product, price: number) {
    if (!product.isOnSale || !product.discountType || !product.discountValue) {
        return null;
    }

    if (
        !isDateRangeActive(product.discountStartDate, product.discountEndDate)
    ) {
        return null;
    }

    const discountValue = Number(product.discountValue);

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
        return null;
    }

    if (product.discountType === "PERCENTAGE") {
        return Math.max(0, price - (price * discountValue) / 100);
    }

    if (product.discountType === "FIXED_AMOUNT") {
        return Math.max(0, price - discountValue);
    }

    return null;
}

function calculateProductPromoPercentage(product: Product, price: number) {
    if (!product.isOnSale || !product.discountType || !product.discountValue) {
        return 0;
    }

    if (
        !isDateRangeActive(product.discountStartDate, product.discountEndDate)
    ) {
        return 0;
    }

    const discountValue = Number(product.discountValue);

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
        return 0;
    }

    if (product.discountType === "PERCENTAGE") {
        return Math.round(discountValue);
    }

    if (product.discountType === "FIXED_AMOUNT" && price > 0) {
        return Math.round((discountValue / price) * 100);
    }

    return 0;
}

function calculateSaleCampaignPromoPrice(product: Product, price: number) {
    const campaign = product.saleCampaign;

    if (!campaign || !campaign.isActive) {
        return null;
    }

    if (!isDateRangeActive(campaign.startDate, campaign.endDate)) {
        return null;
    }

    if (
        campaign.type !== "REMISE_POURCENTAGE" &&
        campaign.type !== "REMISE_MONTANT_FIXE"
    ) {
        return null;
    }

    const discountValue = Number(campaign.discountValue);

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
        return null;
    }

    if (campaign.type === "REMISE_POURCENTAGE") {
        return Math.max(0, price - (price * discountValue) / 100);
    }

    if (campaign.type === "REMISE_MONTANT_FIXE") {
        return Math.max(0, price - discountValue);
    }

    return null;
}

function calculateSaleCampaignPromoPercentage(product: Product, price: number) {
    const campaign = product.saleCampaign;

    if (!campaign || !campaign.isActive) {
        return 0;
    }

    if (!isDateRangeActive(campaign.startDate, campaign.endDate)) {
        return 0;
    }

    if (
        campaign.type !== "REMISE_POURCENTAGE" &&
        campaign.type !== "REMISE_MONTANT_FIXE"
    ) {
        return 0;
    }

    const discountValue = Number(campaign.discountValue);

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
        return 0;
    }

    if (campaign.type === "REMISE_POURCENTAGE") {
        return Math.round(discountValue);
    }

    if (campaign.type === "REMISE_MONTANT_FIXE" && price > 0) {
        return Math.round((discountValue / price) * 100);
    }

    return 0;
}

function calculateCollectionPromoPrice(product: Product, price: number) {
    const collection = product.collection;

    if (!collection?.promoIsActive || !collection.promoPercentage) {
        return null;
    }

    if (
        !isDateRangeActive(collection.promoStartDate, collection.promoEndDate)
    ) {
        return null;
    }

    const promoPercentage = Number(collection.promoPercentage);

    if (!Number.isFinite(promoPercentage) || promoPercentage <= 0) {
        return null;
    }

    return Math.max(0, price - (price * promoPercentage) / 100);
}

function calculateCollectionPromoPercentage(product: Product) {
    const collection = product.collection;

    if (!collection?.promoIsActive || !collection.promoPercentage) {
        return 0;
    }

    if (
        !isDateRangeActive(collection.promoStartDate, collection.promoEndDate)
    ) {
        return 0;
    }

    const promoPercentage = Number(collection.promoPercentage);

    if (!Number.isFinite(promoPercentage) || promoPercentage <= 0) {
        return 0;
    }

    return Math.round(promoPercentage);
}

function normalizeCategoryType(
    categoryType: CategoryType | null | undefined,
): CategoryType | null {
    if (!categoryType) {
        return null;
    }

    return {
        ...categoryType,
        position: toNumber(categoryType.position),
    };
}

function normalizeCategory(category: Category): Category {
    return {
        ...category,
        menuGroup: category.menuGroup ?? "AUTRE",
        types: category.types?.map((type) => normalizeCategoryType(type)!),
    };
}

function normalizeCollection(collection: Collection | null) {
    if (!collection) {
        return null;
    }

    return {
        ...collection,
        promoPercentage: toNullableNumber(collection.promoPercentage),
    };
}

function normalizeSaleCampaign(
    saleCampaign: SaleCampaign | null | undefined,
): SaleCampaign | null {
    if (!saleCampaign) {
        return null;
    }

    return {
        ...saleCampaign,
        discountValue: toNullableNumber(saleCampaign.discountValue),
        buyQuantity: toNullableNumber(saleCampaign.buyQuantity),
        freeQuantity: toNullableNumber(saleCampaign.freeQuantity),
        position: toNumber(saleCampaign.position),
        products: saleCampaign.products?.map((product) =>
            normalizeProduct(product),
        ),
    };
}

function normalizeProduct(product: Product): Product {
    const normalizedProduct: Product = {
        ...product,
        categoryTypeId: product.categoryTypeId ?? null,
        price: toNumber(product.price),
        discountValue: toNullableNumber(product.discountValue),
        category: normalizeCategory(product.category),
        categoryType: normalizeCategoryType(product.categoryType),
        collection: normalizeCollection(product.collection),
        saleCampaign: normalizeSaleCampaign(product.saleCampaign),
        images: product.images ?? [],
        variants: product.variants ?? [],
        finalPrice: toNumber(product.finalPrice, toNumber(product.price)),
        discountPercentage: toNumber(product.discountPercentage),
        totalStock:
            product.totalStock ??
            (product.variants ?? []).reduce(
                (sum, variant) => sum + Number(variant.stockQuantity ?? 0),
                0,
            ),
    };

    const price = normalizedProduct.price;

    const productPromoPrice = calculateProductPromoPrice(
        normalizedProduct,
        price,
    );

    if (productPromoPrice !== null) {
        return {
            ...normalizedProduct,
            finalPrice: toMoney(productPromoPrice),
            discountPercentage: calculateProductPromoPercentage(
                normalizedProduct,
                price,
            ),
        };
    }

    const campaignPromoPrice = calculateSaleCampaignPromoPrice(
        normalizedProduct,
        price,
    );

    if (campaignPromoPrice !== null) {
        return {
            ...normalizedProduct,
            finalPrice: toMoney(campaignPromoPrice),
            discountPercentage: calculateSaleCampaignPromoPercentage(
                normalizedProduct,
                price,
            ),
        };
    }

    const collectionPromoPrice = calculateCollectionPromoPrice(
        normalizedProduct,
        price,
    );

    if (collectionPromoPrice !== null) {
        return {
            ...normalizedProduct,
            finalPrice: toMoney(collectionPromoPrice),
            discountPercentage:
                calculateCollectionPromoPercentage(normalizedProduct),
        };
    }

    return {
        ...normalizedProduct,
        finalPrice: toMoney(price),
        discountPercentage: 0,
    };
}

export async function getProducts() {
    const products = await fetchJson<Product[]>("/products");

    return products.map((product) => normalizeProduct(product));
}

export async function getProductBySlug(slug: string) {
    const product = await fetchJson<Product>(`/products/slug/${slug}`);

    return normalizeProduct(product);
}

export async function getHomepageSaleCampaigns() {
    const campaigns = await fetchJson<SaleCampaign[]>("/sale-campaigns/home");

    return campaigns.map((campaign) => normalizeSaleCampaign(campaign)!);
}

export async function createOrder(
    payload: CreateOrderPayload,
    customerToken?: string | null,
) {
    return fetchJson<CreatedOrder>("/orders", {
        method: "POST",
        headers: buildAuthHeaders(customerToken),
        body: JSON.stringify(payload),
    });
}

export async function login(payload: { email: string; password: string }) {
    return fetchJson<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function getAdminMe() {
    return fetchJson<AuthUser>("/auth/me");
}

export async function logoutAdmin() {
    return fetchJson<{ message: string }>("/auth/logout", {
        method: "POST",
    });
}

export async function getAdminOrders(token: string) {
    return fetchJson<AdminOrder[]>("/orders/admin", {
        headers: buildAuthHeaders(token),
    });
}

export async function updateOrderStatus(
    token: string,
    orderId: string,
    orderStatus: OrderStatus,
) {
    return fetchJson<AdminOrder>(`/orders/admin/${orderId}/status`, {
        method: "PATCH",
        headers: buildAuthHeaders(token),
        body: JSON.stringify({ orderStatus }),
    });
}

export async function getAdminProducts(token: string) {
    const products = await fetchJson<Product[]>("/products/admin/all", {
        headers: buildAuthHeaders(token),
    });

    return products.map((product) => normalizeProduct(product));
}

export async function getAdminProduct(token: string, productId: string) {
    const product = await fetchJson<Product>(`/products/admin/${productId}`, {
        headers: buildAuthHeaders(token),
    });

    return normalizeProduct(product);
}

export async function createProduct(
    token: string,
    payload: CreateProductPayload,
) {
    const product = await fetchJson<Product>("/products", {
        method: "POST",
        headers: buildAuthHeaders(token),
        body: JSON.stringify(payload),
    });

    return normalizeProduct(product);
}

export async function updateProduct(
    token: string,
    productId: string,
    payload: UpdateProductPayload,
) {
    const product = await fetchJson<Product>(`/products/${productId}`, {
        method: "PATCH",
        headers: buildAuthHeaders(token),
        body: JSON.stringify(payload),
    });

    return normalizeProduct(product);
}

export async function updateProductStatus(
    token: string,
    productId: string,
    status: ProductStatus,
) {
    const product = await fetchJson<Product>(`/products/${productId}/status`, {
        method: "PATCH",
        headers: buildAuthHeaders(token),
        body: JSON.stringify({ status }),
    });

    return normalizeProduct(product);
}

export async function getAdminCategories(token: string) {
    const categories = await fetchJson<Category[]>("/categories/admin", {
        headers: buildAuthHeaders(token),
    });

    return categories.map((category) => normalizeCategory(category));
}

export async function createCategory(
    token: string,
    payload: CreateCategoryPayload,
) {
    const category = await fetchJson<Category>("/categories", {
        method: "POST",
        headers: buildAuthHeaders(token),
        body: JSON.stringify(payload),
    });

    return normalizeCategory(category);
}

export async function updateCategory(
    token: string,
    categoryId: string,
    payload: UpdateCategoryPayload,
) {
    const category = await fetchJson<Category>(`/categories/${categoryId}`, {
        method: "PATCH",
        headers: buildAuthHeaders(token),
        body: JSON.stringify(payload),
    });

    return normalizeCategory(category);
}

export async function updateCategoryStatus(
    token: string,
    categoryId: string,
    isActive: boolean,
) {
    const category = await fetchJson<Category>(
        `/categories/${categoryId}/status`,
        {
            method: "PATCH",
            headers: buildAuthHeaders(token),
            body: JSON.stringify({ isActive }),
        },
    );

    return normalizeCategory(category);
}

export async function getAdminCollections(token: string) {
    return fetchJson<Collection[]>("/collections/admin", {
        headers: buildAuthHeaders(token),
    });
}

export async function createCollection(
    token: string,
    payload: CreateCollectionPayload,
) {
    return fetchJson<Collection>("/collections", {
        method: "POST",
        headers: buildAuthHeaders(token),
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
        headers: buildAuthHeaders(token),
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
        headers: buildAuthHeaders(token),
        body: JSON.stringify({ isActive }),
    });
}

export async function getAdminSaleCampaigns(token: string) {
    const campaigns = await fetchJson<SaleCampaign[]>("/sale-campaigns/admin", {
        headers: buildAuthHeaders(token),
    });

    return campaigns.map((campaign) => normalizeSaleCampaign(campaign)!);
}

export async function createSaleCampaign(
    token: string,
    payload: CreateSaleCampaignPayload,
) {
    const campaign = await fetchJson<SaleCampaign>("/sale-campaigns", {
        method: "POST",
        headers: buildAuthHeaders(token),
        body: JSON.stringify(payload),
    });

    return normalizeSaleCampaign(campaign)!;
}

export async function updateSaleCampaign(
    token: string,
    campaignId: string,
    payload: UpdateSaleCampaignPayload,
) {
    const campaign = await fetchJson<SaleCampaign>(
        `/sale-campaigns/${campaignId}`,
        {
            method: "PATCH",
            headers: buildAuthHeaders(token),
            body: JSON.stringify(payload),
        },
    );

    return normalizeSaleCampaign(campaign)!;
}

export async function updateSaleCampaignStatus(
    token: string,
    campaignId: string,
    isActive: boolean,
) {
    const campaign = await fetchJson<SaleCampaign>(
        `/sale-campaigns/${campaignId}/status`,
        {
            method: "PATCH",
            headers: buildAuthHeaders(token),
            body: JSON.stringify({ isActive }),
        },
    );

    return normalizeSaleCampaign(campaign)!;
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
        credentials: "include",
        headers: buildAuthHeaders(token),
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

export type UploadCampaignMediaResponse = {
    url: string;
    storagePath: string;
    filename: string;
    mediaType: "IMAGE" | "VIDEO";
};

export async function uploadCampaignMedia(token: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/uploads/campaigns`, {
        method: "POST",
        credentials: "include",
        headers: buildAuthHeaders(token),
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        const message = Array.isArray(error?.message)
            ? error.message.join(", ")
            : error?.message;

        throw new Error(message ?? "Erreur lors de l’upload du média.");
    }

    return response.json() as Promise<UploadCampaignMediaResponse>;
}

export async function getManagerDashboard(token: string) {
    return fetchJson<ManagerDashboard>("/dashboard/manager", {
        headers: buildAuthHeaders(token),
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

export async function getCustomerMe(token?: string | null) {
    return fetchJson<Customer>("/customer-auth/me", {
        headers: buildAuthHeaders(token),
    });
}

export async function getCustomerOrders(token?: string | null) {
    return fetchJson<AdminOrder[]>("/customer-auth/orders", {
        headers: buildAuthHeaders(token),
    });
}

export async function updateCustomerProfile(
    token: string | null | undefined,
    payload: UpdateCustomerProfilePayload,
) {
    return fetchJson<Customer>("/customer-auth/profile", {
        method: "PATCH",
        headers: buildAuthHeaders(token),
        body: JSON.stringify(payload),
    });
}

export async function changeCustomerPassword(
    token: string | null | undefined,
    payload: ChangeCustomerPasswordPayload,
) {
    return fetchJson<ChangeCustomerPasswordResponse>(
        "/customer-auth/password",
        {
            method: "PATCH",
            headers: buildAuthHeaders(token),
            body: JSON.stringify(payload),
        },
    );
}

export async function logoutCustomerSession() {
    return fetchJson<{ message: string }>("/customer-auth/logout", {
        method: "POST",
    });
}

export async function getCategories() {
    const categories = await fetchJson<Category[]>("/categories");

    return categories.map((category) => normalizeCategory(category));
}
