"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyText?: string;
  openUpward?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  emptyText = "No results",
  openUpward = true,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = options.filter((o) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      o.label.toLowerCase().includes(s) ||
      (o.sublabel?.toLowerCase().includes(s) ?? false)
    );
  });

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Auto-focus search input
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={
          "flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ring-offset-background " +
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 " +
          "disabled:cursor-not-allowed disabled:opacity-50 " +
          (open ? "ring-2 ring-ring ring-offset-2" : "")
        }
      >
        <span
          className={
            "truncate text-left " +
            (selected ? "text-foreground" : "text-muted-foreground")
          }
        >
          {selected ? (
            <>
              {selected.label}
              {selected.sublabel && (
                <span className="text-muted-foreground ml-2 text-xs">
                  {selected.sublabel}
                </span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>
        <div className="flex items-center gap-1 ml-2">
          {selected && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground p-0.5 rounded"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={
              "h-4 w-4 opacity-50 transition-transform " +
              (open ? "rotate-180" : "")
            }
          />
        </div>
      </button>

      {/* Dropdown — OPENS UPWARD by default */}
      {open && (
        <div
          className={
            "absolute z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md " +
            (openUpward
              ? "bottom-full mb-1"
              : "top-full mt-1")
          }
        >
          {/* Search input */}
          <div className="p-2 border-b sticky top-0 bg-popover">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 pl-7 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setOpen(false);
                    setSearch("");
                  }
                  if (e.key === "Enter" && filtered.length > 0) {
                    e.preventDefault();
                    handleSelect(filtered[0].value);
                  }
                }}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                {emptyText}
              </p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={
                    "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm cursor-pointer " +
                    "hover:bg-accent hover:text-accent-foreground " +
                    (value === opt.value ? "bg-accent/50" : "")
                  }
                >
                  <span className="truncate text-left">
                    {opt.label}
                    {opt.sublabel && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        {opt.sublabel}
                      </span>
                    )}
                  </span>
                  {value === opt.value && (
                    <span className="text-primary text-xs">✓</span>
                  )}
                </button>
              ))
            )}
          </div>

          {filtered.length > 0 && (
            <div className="px-2 py-1 border-t text-[10px] text-muted-foreground">
              {filtered.length} option{filtered.length === 1 ? "" : "s"} — scroll or type to filter
            </div>
          )}
        </div>
      )}
    </div>
  );
}