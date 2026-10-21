"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface FilterSidebarProps {
  categories: Category[];
  currentCategory?: string;
  currentMinPrice?: string;
  currentMaxPrice?: string;
}

export function FilterSidebar({
  categories,
  currentCategory,
  currentMinPrice,
  currentMaxPrice,
}: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [minPrice, setMinPrice] = useState(currentMinPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice ?? "");

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    });
    params.delete("page");
    router.push("/shop?" + params.toString());
  };

  const handleCategoryClick = (slug: string | null) => {
    updateParams({ category: slug });
  };

  const handlePriceApply = () => {
    updateParams({
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
    });
  };

  const handleClearAll = () => {
    setMinPrice("");
    setMaxPrice("");
    router.push("/shop");
  };

  const hasFilters = currentCategory || currentMinPrice || currentMaxPrice;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Filters</h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            Clear all
          </Button>
        )}
      </div>

      <Separator />

      {/* Categories */}
      <div>
        <h4 className="font-medium text-sm mb-3">Categories</h4>
        <ul className="space-y-2">
          <li>
            <button
              type="button"
              onClick={() => handleCategoryClick(null)}
              className={
                "text-sm transition-colors text-left w-full " +
                (!currentCategory
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              All Categories
            </button>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => handleCategoryClick(cat.slug)}
                className={
                  "text-sm transition-colors text-left w-full " +
                  (currentCategory === cat.slug
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Separator />

      {/* Price range */}
      <div>
        <h4 className="font-medium text-sm mb-3">Price range</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label htmlFor="minPrice" className="sr-only">Min</Label>
              <Input
                id="minPrice"
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                min={0}
              />
            </div>
            <span className="text-muted-foreground text-sm">-</span>
            <div className="flex-1">
              <Label htmlFor="maxPrice" className="sr-only">Max</Label>
              <Input
                id="maxPrice"
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                min={0}
              />
            </div>
          </div>
          <Button onClick={handlePriceApply} className="w-full" variant="outline" size="sm">
            Apply Price
          </Button>
        </div>
      </div>
    </div>
  );
}
