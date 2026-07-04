"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import type {
    Product,
    ProductVariant,
    SaleCampaignType,
} from "@/types/product";

export type CartItem = {
    variantId: string;
    productId: string;
    productSlug: string;
    productName: string;
    productReference: string;
    imageUrl: string | null;
    color: string;
    size: string;
    unitPrice: number;
    quantity: number;
    stockQuantity: number;

    saleCampaignId?: string | null;
    saleCampaignName?: string | null;
    saleCampaignType?: SaleCampaignType | null;
    saleCampaignIsActive?: boolean;
    saleCampaignStartDate?: string | null;
    saleCampaignEndDate?: string | null;
    saleCampaignBuyQuantity?: number | null;
    saleCampaignFreeQuantity?: number | null;
};

export type CartPromotionSummary = {
    campaignId: string;
    campaignName: string;
    buyQuantity: number;
    freeQuantity: number;
    freeItemsCount: number;
    discountAmount: number;
};

type CartContextValue = {
    items: CartItem[];
    itemsCount: number;
    subtotalBeforePromotion: number;
    promotionDiscount: number;
    appliedPromotions: CartPromotionSummary[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    addToCart: (
        product: Product,
        variant: ProductVariant,
        quantity: number,
    ) => void;
    removeFromCart: (variantId: string) => void;
    updateQuantity: (variantId: string, quantity: number) => void;
    clearCart: () => void;
};

type PromotionUnit = {
    variantId: string;
    price: number;
};

type PromotionGroup = {
    campaignId: string;
    campaignName: string;
    buyQuantity: number;
    freeQuantity: number;
    units: PromotionUnit[];
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "bigotti-cart";

function toMoney(value: number) {
    return Number(value.toFixed(3));
}

function getDeliveryFee(subtotal: number) {
    return subtotal >= 200 || subtotal === 0 ? 0 : 8;
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

function isBuyXGetYCampaignActive(item: CartItem) {
    if (!item.saleCampaignId) {
        return false;
    }

    if (!item.saleCampaignIsActive) {
        return false;
    }

    if (item.saleCampaignType !== "ACHETEZ_X_OBTENEZ_Y") {
        return false;
    }

    if (
        !item.saleCampaignBuyQuantity ||
        item.saleCampaignBuyQuantity <= 0 ||
        !item.saleCampaignFreeQuantity ||
        item.saleCampaignFreeQuantity <= 0
    ) {
        return false;
    }

    return isDateRangeActive(
        item.saleCampaignStartDate,
        item.saleCampaignEndDate,
    );
}

function calculateBuyXGetYPromotions(items: CartItem[]) {
    const groups = new Map<string, PromotionGroup>();

    for (const item of items) {
        if (!isBuyXGetYCampaignActive(item)) {
            continue;
        }

        const campaignId = item.saleCampaignId!;
        const campaignName = item.saleCampaignName ?? "Offre spéciale Bigotti";
        const buyQuantity = Number(item.saleCampaignBuyQuantity);
        const freeQuantity = Number(item.saleCampaignFreeQuantity);

        const existingGroup = groups.get(campaignId);

        const group =
            existingGroup ??
            ({
                campaignId,
                campaignName,
                buyQuantity,
                freeQuantity,
                units: [],
            } satisfies PromotionGroup);

        for (let index = 0; index < item.quantity; index += 1) {
            group.units.push({
                variantId: item.variantId,
                price: item.unitPrice,
            });
        }

        groups.set(campaignId, group);
    }

    const discountsByVariantId = new Map<string, number>();
    const summaries: CartPromotionSummary[] = [];
    let totalDiscount = 0;

    for (const group of groups.values()) {
        const groupSize = group.buyQuantity + group.freeQuantity;

        if (groupSize <= 0) {
            continue;
        }

        const freeItemsCount = Math.min(
            group.units.length,
            Math.floor(group.units.length / groupSize) * group.freeQuantity,
        );

        if (freeItemsCount <= 0) {
            continue;
        }

        const freeUnits = [...group.units]
            .sort((a, b) => a.price - b.price)
            .slice(0, freeItemsCount);

        const discountAmount = toMoney(
            freeUnits.reduce((sum, unit) => sum + unit.price, 0),
        );

        for (const unit of freeUnits) {
            discountsByVariantId.set(
                unit.variantId,
                toMoney(
                    (discountsByVariantId.get(unit.variantId) ?? 0) +
                        unit.price,
                ),
            );
        }

        totalDiscount += discountAmount;

        summaries.push({
            campaignId: group.campaignId,
            campaignName: group.campaignName,
            buyQuantity: group.buyQuantity,
            freeQuantity: group.freeQuantity,
            freeItemsCount,
            discountAmount,
        });
    }

    return {
        promotionDiscount: toMoney(totalDiscount),
        appliedPromotions: summaries,
        discountsByVariantId,
    };
}

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const rawCart = window.localStorage.getItem(STORAGE_KEY);

        if (rawCart) {
            try {
                setItems(JSON.parse(rawCart));
            } catch {
                setItems([]);
            }
        }

        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        }
    }, [items, isLoaded]);

    const subtotalBeforePromotion = useMemo(
        () =>
            toMoney(
                items.reduce(
                    (sum, item) => sum + item.unitPrice * item.quantity,
                    0,
                ),
            ),
        [items],
    );

    const { promotionDiscount, appliedPromotions } = useMemo(
        () => calculateBuyXGetYPromotions(items),
        [items],
    );

    const subtotal = toMoney(
        Math.max(0, subtotalBeforePromotion - promotionDiscount),
    );

    const deliveryFee = getDeliveryFee(subtotal);
    const total = toMoney(subtotal + deliveryFee);

    const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

    function addToCart(
        product: Product,
        variant: ProductVariant,
        quantity: number,
    ) {
        const mainImage =
            product.images.find((image) => image.isMain) ?? product.images[0];

        setItems((currentItems) => {
            const existingItem = currentItems.find(
                (item) => item.variantId === variant.id,
            );

            if (existingItem) {
                return currentItems.map((item) =>
                    item.variantId === variant.id
                        ? {
                              ...item,
                              quantity: Math.min(
                                  item.quantity + quantity,
                                  variant.stockQuantity,
                              ),
                              stockQuantity: variant.stockQuantity,
                              unitPrice: product.finalPrice,
                              saleCampaignId: product.saleCampaign?.id ?? null,
                              saleCampaignName:
                                  product.saleCampaign?.name ?? null,
                              saleCampaignType:
                                  product.saleCampaign?.type ?? null,
                              saleCampaignIsActive:
                                  product.saleCampaign?.isActive ?? false,
                              saleCampaignStartDate:
                                  product.saleCampaign?.startDate ?? null,
                              saleCampaignEndDate:
                                  product.saleCampaign?.endDate ?? null,
                              saleCampaignBuyQuantity:
                                  product.saleCampaign?.buyQuantity ?? null,
                              saleCampaignFreeQuantity:
                                  product.saleCampaign?.freeQuantity ?? null,
                          }
                        : item,
                );
            }

            return [
                ...currentItems,
                {
                    variantId: variant.id,
                    productId: product.id,
                    productSlug: product.slug,
                    productName: product.name,
                    productReference: product.reference,
                    imageUrl: mainImage?.url ?? null,
                    color: variant.color,
                    size: variant.size,
                    unitPrice: product.finalPrice,
                    quantity: Math.min(quantity, variant.stockQuantity),
                    stockQuantity: variant.stockQuantity,
                    saleCampaignId: product.saleCampaign?.id ?? null,
                    saleCampaignName: product.saleCampaign?.name ?? null,
                    saleCampaignType: product.saleCampaign?.type ?? null,
                    saleCampaignIsActive:
                        product.saleCampaign?.isActive ?? false,
                    saleCampaignStartDate:
                        product.saleCampaign?.startDate ?? null,
                    saleCampaignEndDate: product.saleCampaign?.endDate ?? null,
                    saleCampaignBuyQuantity:
                        product.saleCampaign?.buyQuantity ?? null,
                    saleCampaignFreeQuantity:
                        product.saleCampaign?.freeQuantity ?? null,
                },
            ];
        });
    }

    function removeFromCart(variantId: string) {
        setItems((currentItems) =>
            currentItems.filter((item) => item.variantId !== variantId),
        );
    }

    function updateQuantity(variantId: string, quantity: number) {
        setItems((currentItems) =>
            currentItems.map((item) =>
                item.variantId === variantId
                    ? {
                          ...item,
                          quantity: Math.max(
                              1,
                              Math.min(quantity, item.stockQuantity),
                          ),
                      }
                    : item,
            ),
        );
    }

    function clearCart() {
        setItems([]);
    }

    return (
        <CartContext.Provider
            value={{
                items,
                itemsCount,
                subtotalBeforePromotion,
                promotionDiscount,
                appliedPromotions,
                subtotal,
                deliveryFee,
                total,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error("useCart doit être utilisé dans CartProvider.");
    }

    return context;
}
