export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export type SaleCampaignType =
    | "REMISE_POURCENTAGE"
    | "REMISE_MONTANT_FIXE"
    | "ACHETEZ_X_OBTENEZ_Y"
    | "EVENEMENT_SIMPLE";

export type CampaignMediaType = "IMAGE" | "VIDEO";

export type Category = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
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
    promoIsActive: boolean;
    promoPercentage: number | null;
    promoStartDate: string | null;
    promoEndDate: string | null;
    createdAt?: string;
    updatedAt?: string;
};

export type SaleCampaign = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
    startDate: string | null;
    endDate: string | null;

    type: SaleCampaignType;
    discountValue: number | null;
    buyQuantity: number | null;
    freeQuantity: number | null;

    displayOnHome: boolean;
    heroTitle: string | null;
    heroSubtitle: string | null;

    mediaType: CampaignMediaType | null;
    mediaUrl: string | null;
    mediaPath: string | null;

    position: number;

    products?: Product[];

    createdAt?: string;
    updatedAt?: string;
};

export type ProductImage = {
    id: string;
    productId: string;
    url: string;
    storagePath: string | null;
    altText: string | null;
    color: string | null;
    colorHex: string | null;
    isMain: boolean;
    position: number;
    createdAt: string;
};

export type ProductVariant = {
    id: string;
    productId: string;
    color: string;
    colorHex: string | null;
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

export type CreateProductImagePayload = {
    url: string;
    storagePath?: string | null;
    altText?: string;
    color?: string | null;
    colorHex?: string | null;
    isMain?: boolean;
    position?: number;
};

export type CreateProductVariantPayload = {
    color: string;
    colorHex?: string | null;
    size: string;
    stockQuantity: number;
    sku?: string;
    isActive?: boolean;
};

export type CreateProductPayload = {
    reference: string;
    name: string;
    slug: string;
    shortDescription?: string;
    description?: string;
    categoryId: string;
    collectionId?: string;
    saleCampaignId?: string;
    price: number;
    discountType?: DiscountType;
    discountValue?: number;
    discountStartDate?: string | null;
    discountEndDate?: string | null;
    status: ProductStatus;
    isFeatured: boolean;
    isNewArrival: boolean;
    isOnSale: boolean;
    images: CreateProductImagePayload[];
    variants: CreateProductVariantPayload[];
};

export type UpdateProductPayload = {
    reference?: string;
    name?: string;
    slug?: string;
    shortDescription?: string | null;
    description?: string | null;
    categoryId?: string;
    collectionId?: string | null;
    saleCampaignId?: string | null;
    price?: number;
    discountType?: DiscountType | null;
    discountValue?: number | null;
    discountStartDate?: string | null;
    discountEndDate?: string | null;
    status?: ProductStatus;
    isFeatured?: boolean;
    isNewArrival?: boolean;
    isOnSale?: boolean;
    images?: CreateProductImagePayload[];
    variants?: CreateProductVariantPayload[];
};

export type CreateCategoryPayload = {
    name: string;
    slug?: string;
    description?: string;
    isActive?: boolean;
};

export type UpdateCategoryPayload = {
    name?: string;
    slug?: string;
    description?: string | null;
    isActive?: boolean;
};

export type CreateCollectionPayload = {
    name: string;
    slug?: string;
    description?: string;
    isActive?: boolean;
    isFeatured?: boolean;
    startDate?: string | null;
    endDate?: string | null;
    promoIsActive?: boolean;
    promoPercentage?: number | null;
    promoStartDate?: string | null;
    promoEndDate?: string | null;
};

export type UpdateCollectionPayload = {
    name?: string;
    slug?: string;
    description?: string | null;
    isActive?: boolean;
    isFeatured?: boolean;
    startDate?: string | null;
    endDate?: string | null;
    promoIsActive?: boolean;
    promoPercentage?: number | null;
    promoStartDate?: string | null;
    promoEndDate?: string | null;
};

export type CreateSaleCampaignPayload = {
    name: string;
    slug?: string;
    description?: string;
    isActive?: boolean;
    startDate?: string | null;
    endDate?: string | null;

    type?: SaleCampaignType;
    discountValue?: number | null;
    buyQuantity?: number | null;
    freeQuantity?: number | null;

    displayOnHome?: boolean;
    heroTitle?: string | null;
    heroSubtitle?: string | null;

    mediaType?: CampaignMediaType | null;
    mediaUrl?: string | null;
    mediaPath?: string | null;

    position?: number;
};

export type UpdateSaleCampaignPayload = {
    name?: string;
    slug?: string;
    description?: string | null;
    isActive?: boolean;
    startDate?: string | null;
    endDate?: string | null;

    type?: SaleCampaignType;
    discountValue?: number | null;
    buyQuantity?: number | null;
    freeQuantity?: number | null;

    displayOnHome?: boolean;
    heroTitle?: string | null;
    heroSubtitle?: string | null;

    mediaType?: CampaignMediaType | null;
    mediaUrl?: string | null;
    mediaPath?: string | null;

    position?: number;
};
