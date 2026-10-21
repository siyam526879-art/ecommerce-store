"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import Link from "next/link";

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch live suggestions
  useEffect(() => {
    if (query.length > 1) {
      const fetchSuggestions = async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json();
            setSuggestions(data);
            setShowSuggestions(true);
          }
        } catch (err) { console.error(err); }
      };
      
      const debounce = setTimeout(fetchSuggestions, 300);
      return () => clearTimeout(debounce);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) {
      setIsLoading(true);
      setShowSuggestions(false);
      
      // Trillon Animation Delay
      setTimeout(() => {
        router.push(`/shop?search=${encodeURIComponent(query)}`);
        setIsLoading(false);
      }, 1000); 
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl z-50">
      <form onSubmit={handleSearch} className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 1 && setShowSuggestions(true)}
          placeholder="Search in Trillon Mart..."
          className="w-full py-2.5 pl-4 pr-12 rounded-sm text-gray-800 focus:outline-none bg-white border-0 shadow-sm"
          autoComplete="off"
        />
        
        {/* Trillon Loading Animation Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-sm z-20">
            <div className="flex items-center gap-0.5 text-[#f85606] font-black text-xl tracking-tighter">
              {["T","r","i","l","l","i","o","n"].map((char, i) => (
                <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>{char}</span>
              ))}
            </div>
          </div>
        )}

        <button 
          type="submit"
          disabled={isLoading}
          className="absolute right-0 top-0 h-full px-4 bg-[#f85606] hover:bg-[#d04604] rounded-r-sm text-white disabled:opacity-70 transition-colors"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
        </button>
      </form>

      {/* Live Suggestions Dropdown */}
      {showSuggestions && query.length > 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-sm shadow-xl border border-gray-100 max-h-80 overflow-y-auto">
           {suggestions.length > 0 ? (
             suggestions.map((item: any) => (
               <Link 
                 key={item.id} 
                 href={`/product/${item.id}`}
                 onClick={() => setShowSuggestions(false)}
                 className="block px-4 py-3 hover:bg-gray-50 text-sm text-gray-800 border-b last:border-0 transition-colors flex items-center gap-3"
               >
                 {item.image ? (
                   <img src={item.image} alt="" className="w-8 h-8 object-cover rounded-sm bg-gray-100" />
                 ) : (
                   <div className="w-8 h-8 bg-gray-100 rounded-sm flex items-center justify-center text-xs text-gray-400">IMG</div>
                 )}
                 <span className="truncate">{item.name}</span>
               </Link>
             ))
           ) : (
             <div className="p-4 text-sm text-gray-500 text-center">
               No products found. Press Enter to search anyway.
             </div>
           )}
        </div>
      )}
    </div>
  );
}