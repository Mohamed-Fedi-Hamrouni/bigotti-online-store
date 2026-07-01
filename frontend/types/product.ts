export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export type Category = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
};

export type Collection = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
    isFeatured: boolean;
    startDate: string | null;
    endDate: string | null;
};

export type SaleCampaign = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
    startDate: string | null;
    endDate: string | null;
};

export type ProductImage = {
    id: string;
    productId: string;
    url: string;
    storagePath: string | null;
    altText: string | null;
    isMain: boolean;
    position: number;
    createdAt: string;
};

export type ProductVariant = {
    id: string;
    productId: string;
    color: string;
    size: string;
    stockQuantity: number;
    sku: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

export type Product = {
    id: string;
    reference: string;
    name: string;
    slug: string;
    shortDescription: string | null;
    description: string | null;
    categoryId: string;
    collectionId: string | null;
    saleCampaignId: string | null;
    price: number;
    discountType: DiscountType | null;
    discountValue: number | null;
    discountStartDate: string | null;
    discountEndDate: string | null;
    status: ProductStatus;
    isFeatured: boolean;
    isNewArrival: boolean;
    isOnSale: boolean;
    createdAt: string;
    updatedAt: string;
    category: Category;
    collection: Collection | null;
    saleCampaign: SaleCampaign | null;
    images: ProductImage[];
    variants: ProductVariant[];
    finalPrice: number;
    discountPercentage: number;
    totalStock: number;
};
