"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Promo = { image: string; link: string } | null;

export function PromoBanner() {
  const [promo, setPromo] = useState<Promo | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/home-banners", { cache: "no-store" });
        const json = await res.json();
        if (alive) setPromo(json?.promo ?? null);
      } catch {
        if (alive) setPromo((p) => (p === undefined ? null : p));
      }
    };
    load();
    const t = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (promo === undefined) return <div className="h-28 animate-pulse rounded-2xl bg-white sm:h-40" />;

  if (promo) {
    return (
      <Link href={promo.link || "/shop"} className="block overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={promo.image} alt="" className="h-auto w-full object-cover" />
      </Link>
    );
  }

  return (
    <Link
      href="/shop"
      className="flex h-28 items-center justify-between gap-4 rounded-2xl border-4 border-teal-700 bg-gradient-to-r from-white via-emerald-50 to-white px-6 sm:h-40 sm:px-10"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Super Brand Day</p>
        <p className="text-2xl font-black italic text-teal-900 sm:text-4xl">BIG SAVING</p>
        <p className="text-lg font-black italic text-teal-800 sm:text-3xl">BEAUTIFUL SKIN</p>
      </div>
      <div className="hidden h-20 w-20 flex-col items-center justify-center rounded-full bg-orange-500 text-white sm:flex">
        <span className="text-[10px] font-bold">UP TO</span>
        <span className="text-2xl font-black leading-none">50%</span>
        <span className="text-[10px] font-bold">OFF</span>
      </div>
      <span className="flex items-center gap-2 rounded-full bg-[#f85606] px-5 py-2 text-sm font-black italic text-white sm:px-8 sm:py-3 sm:text-xl">
        SHOP NOW <ArrowRight className="h-5 w-5" />
      </span>
    </Link>
  );
}