"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { SignOutConfirm } from "./sign-out-confirm";

interface SignOutButtonProps {
  className?: string;
  showIcon?: boolean;
  label?: string;
  iconClassName?: string;
}

export function SignOutButton({
  className,
  showIcon = true,
  label = "Sign out",
  iconClassName = "h-4 w-4",
}: SignOutButtonProps) {
  const [open, setOpen] = useState(false);
  const defaultClass =
    "flex items-center gap-3 px-3 py-2 rounded-md text-sm w-full text-left hover:bg-muted transition-colors text-destructive";

  return (
    <>
      <button type="button" className={className || defaultClass} onClick={() => setOpen(true)}>
        {showIcon && <LogOut className={iconClassName} />}
        {label}
      </button>
      <SignOutConfirm open={open} onClose={() => setOpen(false)} />
    </>
  );
}