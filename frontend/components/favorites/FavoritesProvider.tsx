"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import type { Product } from "@/types/product";

type FavoritesContextValue = {
    favorites: Product[];
    favoritesCount: number;
    isFavorite: (productId: string) => boolean;
    toggleFavorite: (product: Product) => void;
    removeFavorite: (productId: string) => void;
    clearFavorites: () => void;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(
    undefined,
);

const STORAGE_KEY = "bigotti-favorites";

export function FavoritesProvider({ children }: { children: ReactNode }) {
    const [favorites, setFavorites] = useState<Product[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const rawFavorites = window.localStorage.getItem(STORAGE_KEY);

        if (rawFavorites) {
            try {
                setFavorites(JSON.parse(rawFavorites));
            } catch {
                setFavorites([]);
            }
        }

        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        }
    }, [favorites, isLoaded]);

    const favoritesCount = favorites.length;

    function isFavorite(productId: string) {
        return favorites.some((product) => product.id === productId);
    }

    function toggleFavorite(product: Product) {
        setFavorites((currentFavorites) => {
            const exists = currentFavorites.some(
                (item) => item.id === product.id,
            );

            if (exists) {
                return currentFavorites.filter(
                    (item) => item.id !== product.id,
                );
            }

            return [product, ...currentFavorites];
        });
    }

    function removeFavorite(productId: string) {
        setFavorites((currentFavorites) =>
            currentFavorites.filter((product) => product.id !== productId),
        );
    }

    function clearFavorites() {
        setFavorites([]);
    }

    const value = useMemo(
        () => ({
            favorites,
            favoritesCount,
            isFavorite,
            toggleFavorite,
            removeFavorite,
            clearFavorites,
        }),
        [favorites, favoritesCount],
    );

    return (
        <FavoritesContext.Provider value={value}>
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    const context = useContext(FavoritesContext);

    if (!context) {
        throw new Error(
            "useFavorites doit être utilisé dans FavoritesProvider.",
        );
    }

    return context;
}
