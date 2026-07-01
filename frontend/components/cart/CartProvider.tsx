"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import type { Product, ProductVariant } from "@/types/product";

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
};

type CartContextValue = {
    items: CartItem[];
    itemsCount: number;
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

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "bigotti-cart";

function getDeliveryFee(subtotal: number) {
    return subtotal >= 200 || subtotal === 0 ? 0 : 8;
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

    const subtotal = useMemo(
        () =>
            Number(
                items
                    .reduce(
                        (sum, item) => sum + item.unitPrice * item.quantity,
                        0,
                    )
                    .toFixed(3),
            ),
        [items],
    );

    const deliveryFee = getDeliveryFee(subtotal);
    const total = Number((subtotal + deliveryFee).toFixed(3));

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
