export function MiniLoader({ siteName }: { siteName: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-6">
      <style>{"@keyframes tm-fill{0%{clip-path:inset(100% 0 0 0)}70%,100%{clip-path:inset(0 0 0 0)}}"}</style>
      <div className="relative text-3xl font-black tracking-tight">
        <span className="text-orange-100">{siteName}</span>
        <span
          className="absolute inset-0 text-[#f85606]"
          style={{ animation: "tm-fill 1.3s ease-in-out infinite" }}
        >
          {siteName}
        </span>
      </div>
      <p className="text-xs text-gray-400">Searching...</p>
    </div>
  );
}