"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageTitle } from "@/components/admin/page-title";
import { toast } from "sonner";
import { FolderTree } from "lucide-react";

const schema = z.object({
  parentId: z.string().min(1, "Please select a parent category"),
  name: z.string().min(2, "Sub-category name must be at least 2 characters"),
  description: z.string().optional(),
});

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function SubCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema) as any,
    defaultValues: { parentId: "", name: "", description: "" },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/v1/admin/categories?pageSize=100");
        const json = await res.json();
        const data = json?.data ?? [];
        // Only show top-level categories as parents
        const topLevel = data.filter((c: any) => !c.parentId);
        setCategories(topLevel);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    fetchCategories();
  }, []);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          parentId: data.parentId,
          isActive: true,
          order: 0,
        }),
      });

      if (!res.ok) throw new Error("Failed to create sub-category");

      toast.success("Sub-category created successfully!");
      reset({ parentId: "", name: "", description: "" });
    } catch (err) {
      toast.error("Failed to create sub-category. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <PageTitle title="Sub Categories" description="Create and manage sub-categories under main categories" />
      
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-[#f85606]" />
              Create New Sub-Category
            </CardTitle>
            <CardDescription>
              Select a parent category from the list and provide a name for the new sub-category.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Parent Category Select */}
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Category *</Label>
                <select
                  id="parentId"
                  {...register("parentId")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Select a Parent Category --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.parentId && (
                  <p className="text-sm text-red-500">{errors.parentId.message}</p>
                )}
              </div>

              {/* Sub Category Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Sub-Category Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Mobile Phones"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Brief description of this sub-category"
                  {...register("description")}
                />
              </div>

              <Button type="submit" className="w-full bg-[#f85606] hover:bg-[#d04604]" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Sub-Category"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}