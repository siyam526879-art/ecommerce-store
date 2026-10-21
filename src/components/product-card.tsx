"use client";

import Link from "next/link";
import { Star, ShoppingCart, ImageOff } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { LoginModal } from "@/components/auth/login-modal";
import { toast } from "sonner";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image?: string | null;
    rating?: number;
    discount?: number | null;
    originalPrice?: number | null;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const { data: session } = useSession();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!session) {
      setIsLoginOpen(true);
    } else {
      toast.success("Added to cart!");
    }
  };

  // Check if image is valid
  const hasValidImage = product.image && product.image.trim() !== "" && !imgError;

  return (
    <>
      <Link href={`/product/${product.id}`} className="bg-white group hover:shadow-lg transition-shadow block h-full flex flex-col">
        <div className="aspect-square bg-gray-100 overflow-hidden relative flex items-center justify-center">
          {hasValidImage ? (
            <img 
              src={product.image!} 
              alt={product.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              onError={() => setImgError(true)}
            />
          ) : (
            // Fallback UI when no image is available
            <div className="flex flex-col items-center text-gray-400">
              <ImageOff className="h-12 w-12 mb-2 opacity-50" />
              <span className="text-xs font-medium">No Image</span>
            </div>
          )}
          
          {/* Overlay Add to Cart Button */}
          <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10">
            <button 
              onClick={handleAddToCart}
              className="w-full bg-[#f85606] text-white py-2 text-sm font-medium hover:bg-[#d04604] flex items-center justify-center gap-2 rounded-sm shadow-md"
            >
              <ShoppingCart className="h-4 w-4" /> Add to Cart
            </button>
          </div>
          
          {/* Discount Badge */}
          {product.discount && product.discount > 0 && (
            <span className="absolute top-0 right-0 bg-[#f85606] text-white text-xs px-2 py-1 font-bold rounded-bl-sm">
              -{product.discount}%
            </span>
          )}
        </div>
        
        <div className="p-3 flex-grow flex flex-col">
          <h3 className="text-sm text-gray-800 line-clamp-2 h-10 mb-2 leading-tight">{product.name}</h3>
          <div className="mt-auto">
            <div className="text-[#f85606] font-bold text-base">৳{product.price}</div>
            {product.originalPrice && product.originalPrice > product.price && (
              <div className="text-xs text-gray-400 line-through">৳{product.originalPrice}</div>
            )}
            <div className="flex items-center gap-1 mt-1">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-3 w-3 ${i < (product.rating || 0) ? 'fill-current' : 'stroke-current'}`} />
                ))}
              </div>
              <span className="text-xs text-gray-400">({Math.floor(Math.random() * 50) + 10})</span>
            </div>
          </div>
        </div>
      </Link>

      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onSuccess={() => {
          toast.success("Logged in successfully! Try adding to cart again.");
        }}
      />
    </>
  );
}