export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="uniqueSwoosh" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffc400" />
          <stop offset="100%" stopColor="#ff7300" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill="#f85606" />
      <rect x="11" y="11" width="26" height="8" rx="4" fill="#ffffff" />
      <rect x="20" y="11" width="8" height="24" rx="4" fill="#ffffff" />
      {/* Unique Gradient Swoosh */}
      <path d="M10 38 Q24 47 38 38" stroke="url(#uniqueSwoosh)" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* Unique Small Accent Dot */}
      <circle cx="39" cy="36" r="2.5" fill="#ffffff" />
    </svg>
  );
}

export function LogoMarkOrange({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="uniqueSwooshOrange" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffc400" />
          <stop offset="100%" stopColor="#ff7300" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill="#f85606" />
      <rect x="11" y="11" width="26" height="8" rx="4" fill="#ffffff" />
      <rect x="20" y="11" width="8" height="24" rx="4" fill="#ffffff" />
      {/* Unique Gradient Swoosh */}
      <path d="M10 38 Q24 47 38 38" stroke="url(#uniqueSwooshOrange)" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* Unique Small Accent Dot */}
      <circle cx="39" cy="36" r="2.5" fill="#ffffff" />
    </svg>
  );
}

export function Logo({ name = "Trillion Mart", variant = "white" }: { name?: string; variant?: "white" | "orange" }) {
  const [first, ...rest] = name.split(" ");
  const text = variant === "white" ? "text-white" : "text-[#f85606]";
  return (
    <span className={"flex items-center gap-2.5 " + text}>
      {variant === "white" ? <LogoMark className="h-10 w-10 shrink-0" /> : <LogoMarkOrange className="h-10 w-10 shrink-0" />}
      <span className="flex flex-col leading-none">
        <span className="flex items-baseline gap-1 whitespace-nowrap">
          <span className="text-[26px] font-extrabold tracking-tight">{first}</span>
          <span className="text-[26px] font-light tracking-tight">{rest.join(" ")}</span>
        </span>
        <span className="mt-1 h-2 w-full rounded-b-[100%] border-b-[3px] border-[#ffc400]" />
      </span>
    </span>
  );
}
