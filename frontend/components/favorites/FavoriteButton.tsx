"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/components/favorites/FavoritesProvider";
import type { Product } from "@/types/product";

type FavoriteButtonProps = {
    product: Product;
    className?: string;
};

export function FavoriteButton({
    product,
    className = "",
}: FavoriteButtonProps) {
    const { isFavorite, toggleFavorite } = useFavorites();

    const active = isFavorite(product.id);

    return (
        <button
            type="button"
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleFavorite(product);
            }}
            className={
                className ||
                "rounded-full bg-white p-3 text-black shadow transition hover:scale-105"
            }
            aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
            title={active ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
            <Heart
                size={19}
                className={active ? "fill-red-600 text-red-600" : ""}
            />
        </button>
    );
}
