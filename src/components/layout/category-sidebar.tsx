"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ChevronRight, ChevronDown } from "lucide-react";

export function CategorySidebar({ categories }: { categories: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);

  const topLevelCategories = categories.filter((c: any) => !c.parentId);

  return (
    <aside 
      className="hidden md:block shrink-0 transition-all duration-300 ease-in-out bg-white shadow-sm border border-gray-200 rounded-sm sticky"
      style={{ 
        width: isOpen ? '260px' : '50px',
        top: '80px',
        maxHeight: 'calc(100vh - 100px)'
      }}
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="h-[50px] flex items-center justify-center cursor-pointer hover:bg-gray-50 relative whitespace-nowrap overflow-hidden border-b border-gray-100"
      >
        <Menu className={`h-6 w-6 text-[#f85606] absolute transition-all duration-300 ${isOpen ? 'left-4' : 'left-1/2 -translate-x-1/2'}`} />
        <div className={`flex items-center gap-2 ml-8 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <span className="font-bold text-gray-800">CATEGORIES</span>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </div>

      {isOpen && (
        <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          {topLevelCategories.map((cat: any) => {
            const subCategories = categories.filter((c: any) => c.parentId === cat.id);
            const hasSubs = subCategories.length > 0;
            
            return (
              <div 
                key={cat.id} 
                className="relative group"
                onMouseEnter={() => hasSubs && setActiveParentId(cat.id)}
                onMouseLeave={() => setActiveParentId(null)}
              >
                <Link 
                  href={`/shop?category=${cat.slug}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 hover:text-[#f85606] transition-colors text-sm text-gray-700 border-b border-gray-50 last:border-0"
                >
                  <span className="truncate">{cat.name}</span>
                  {hasSubs && <ChevronRight className="h-4 w-4 text-gray-400" />}
                </Link>

                {hasSubs && activeParentId === cat.id && (
                  <div className="absolute left-full top-0 w-60 bg-white shadow-xl border border-gray-100 rounded-r-sm p-2 animate-in fade-in slide-in-from-left-2 duration-200 z-50">
                    <div className="text-xs font-bold text-gray-400 px-3 py-2 uppercase tracking-wider border-b mb-1">
                      {cat.name}
                    </div>
                    {subCategories.map((sub: any) => (
                      <Link 
                        key={sub.id} 
                        href={`/shop?category=${sub.slug}`}
                        className="block px-3 py-2 text-sm text-gray-600 hover:bg-orange-50 hover:text-[#f85606] rounded-sm transition-colors"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
      `}</style>
    </aside>
  );
}