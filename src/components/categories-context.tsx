"use client";

import { createContext, useContext } from "react";
import { categoryOf, DEFAULT_CATEGORIES, type Category } from "@/lib/domain";

const Ctx = createContext<Category[]>(DEFAULT_CATEGORIES);

export const CategoriesProvider = Ctx.Provider;

/** Categorías del hogar (en el orden elegido) y un buscador tolerante a categorías borradas. */
export function useCategories() {
  const categories = useContext(Ctx);
  return { categories, find: (id: string) => categoryOf(categories, id) };
}
