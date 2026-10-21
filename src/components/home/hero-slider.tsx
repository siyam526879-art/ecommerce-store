"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type HeroProduct = { id: string; name: string; image: string | null };
type Banner = { id: string; image: string; link: string };

const slides = [
  { tag: "10.10 SHOPPING FEST", t1: "FLASH", t2: "SALE", sub: "LIMITED TIME & STOCK", off: "80%", bg: "from-orange-800 via-orange-600 to-orange-500", offset: 0 },
  { tag: "MEGA DEALS", t1: "SUPER", t2: "SAVER", sub: "FREE DELIVERY OVER 500", off: "70%", bg: "from-red-800 via-orange-600 to-amber-500", offset: 2 },
  { tag: "NEW ARRIVALS", t1: "FRESH", t2: "PICKS", sub: "TRENDING THIS WEEK", off: "50%", bg: "from-amber-700 via-orange-500 to-orange-400", offset: 4 },
];

export function HeroSlider({ products }: { products: HeroProduct[] }) {
  const [index, setIndex] = useState(0);
  const [banners, setBanners] = useState<Banner[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/home-banners", { cache: "no-store" });
        const json = await res.json();
        if (alive) setBanners(Array.isArray(json?.hero) ? json.hero : []);
      } catch {
        if (alive) setBanners((b) => b ?? []);
      }
    };
    load();
    const t = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const useBanners = !!banners && banners.length > 0;
  const count = useBanners ? banners!.length : slides.length;

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 4500);
    return () => clearInterval(t);
  }, [count]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  const prev = () => setIndex((i) => (i - 1 + count) % count);
  const next = () => setIndex((i) => (i + 1) % count);

  const pick = (offset: number) => {
    if (products.length === 0) return [];
    return Array.from({ length: Math.min(4, products.length) }, (_, k) => products[(offset + k) % products.length]);
  };

  const box = "relative h-[260px] overflow-hidden rounded-sm sm:h-[340px] lg:h-[422px]";

  if (banners === null) return <div className={box + " animate-pulse bg-orange-100"} />;

  return (
    <div className={box}>
      {useBanners
        ? banners!.map((b, i) => (
            <Link
              key={b.id}
              href={b.link || "/shop"}
              className={"absolute inset-0 block transition-opacity duration-700 " + (i === index ? "opacity-100" : "pointer-events-none opacity-0")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image} alt="" className="h-full w-full object-cover" />
            </Link>
          ))
        : slides.map((s, i) => (
            <div
              key={i}
              className={`absolute inset-0 flex items-center bg-gradient-to-br ${s.bg} px-6 transition-opacity duration-700 sm:px-10 ${
                i === index ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <div className="absolute -top-10 left-1/3 h-72 w-24 rotate-[25deg] bg-yellow-300/30 blur-sm" />
              <div className="absolute -top-10 left-1/2 h-72 w-16 rotate-[-20deg] bg-yellow-300/20 blur-sm" />

              <div className="relative z-10 w-full max-w-[48%] text-white">
                <span className="mb-2 inline-block bg-white px-3 py-1 text-sm font-black italic text-orange-600 sm:text-xl">{s.tag}</span>
                <h2 className="text-4xl font-black italic leading-[0.9] text-yellow-300 drop-shadow-[0_4px_0_rgba(0,0,0,0.25)] sm:text-6xl lg:text-8xl">
                  {s.t1}
                  <br />
                  {s.t2}
                </h2>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full bg-white text-orange-600 sm:h-24 sm:w-24">
                    <span className="text-[10px] font-bold sm:text-xs">UP TO</span>
                    <span className="text-xl font-black italic leading-none sm:text-4xl">{s.off}</span>
                    <span className="text-[10px] font-bold sm:text-xs">OFF</span>
                  </div>
                </div>
                <p className="mt-3 text-sm font-bold tracking-wide sm:text-xl">{s.sub}</p>
                <Link href="/shop" className="mt-3 inline-block rounded-full bg-white px-8 py-2 text-sm font-bold text-orange-600 shadow-md transition hover:scale-105">
                  Shop Now
                </Link>
              </div>

              <div className="absolute bottom-6 right-4 z-10 hidden gap-3 md:flex lg:right-8">
                {pick(s.offset).map((p, k) => (
                  <Link
                    key={p.id + k}
                    href="/shop"
                    className={`relative block h-28 w-28 overflow-hidden rounded-xl bg-white shadow-xl transition hover:-translate-y-1 lg:h-36 lg:w-36 ${
                      k % 2 === 0 ? "-rotate-3" : "rotate-3 mt-6"
                    }`}
                  >
                    {p.image ? (
                      <Image src={p.image} alt={p.name} fill sizes="150px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">No image</div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}

      {count > 1 && (
        <>
          <button onClick={prev} aria-label="Previous slide" className="absolute left-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={next} aria-label="Next slide" className="absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}