"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { X, Eye, EyeOff, Smartphone } from "lucide-react";
import ForgotPasswordDialog from "./forgot-password-dialog";

type Mode = "login" | "signup" | "forgot" | null;

const LOGIN_RE = /^\/(auth\/)?login\/?(\?.*)?$/;
const SIGNUP_RE = /^\/(auth\/)?(register|signup|sign-up)\/?(\?.*)?$/;

const inputCls =
  "h-[44px] w-full rounded border border-gray-300 px-3 text-sm text-gray-800 outline-none focus:border-[#f85606]";
const btnCls =
  "flex h-[44px] w-full items-center justify-center gap-2 rounded bg-[#f85606] text-base font-medium text-white hover:bg-[#e04e05] disabled:opacity-60";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-6 w-6">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path fill="#fff" d="M13.5 19v-6h2l.4-2.5h-2.4V9c0-.7.3-1.2 1.3-1.2H16V5.6c-.2 0-.9-.1-1.7-.1-1.8 0-3 1.1-3 3.1v1.9H9.2V13h2.1v6z" />
    </svg>
  );
}

function Social({ label }: { label: string }) {
  return (
    <div className="mt-6 text-center">
      <p className="mb-3 text-sm text-gray-500">{label}</p>
      <div className="flex items-center justify-center gap-8">
        <button type="button" onClick={() => signIn("google", { callbackUrl: "/account" })} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <GoogleIcon /> Google
        </button>
        <button type="button" onClick={() => signIn("facebook")} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <FacebookIcon /> Facebook
        </button>
      </div>
    </div>
  );
}

export function AuthModalHost() {
  const [mode, setMode] = useState<Mode>(null);
  const [tab, setTab] = useState<"password" | "phone">("password");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const pendingRef = useRef<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  const go = (m: Mode) => {
    setMode(m);
    setError("");
    setInfo("");
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      const href = a?.getAttribute("href");
      if (!href) return;
      if (LOGIN_RE.test(href)) {
        e.preventDefault();
        e.stopPropagation();
        setMode("login");
        setError("");
        setInfo("");
      } else if (SIGNUP_RE.test(href)) {
        e.preventDefault();
        e.stopPropagation();
        setMode("signup");
        setError("");
        setInfo("");
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!mode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode(null);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mode]);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((s) => {
        if (alive) setAuthed(!!s?.user);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      pendingRef.current = null;
      setMode((e as CustomEvent).detail === "signup" ? "signup" : "login");
      setError("");
      setInfo("");
    };
    window.addEventListener("open-auth-modal", onOpen);
    return () => window.removeEventListener("open-auth-modal", onOpen);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("forgot") !== "1") return;
    setMode("forgot");
    setError("");
    setInfo("");
    url.searchParams.delete("forgot");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);

  useEffect(() => {
    if (authed !== false) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      const href = a?.getAttribute("href");
      if (href && /^\/checkout\/?(\?.*)?$/.test(href)) {
        e.preventDefault();
        e.stopPropagation();
        pendingRef.current = href;
        setMode("login");
        setError("");
        setInfo("");
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [authed]);

  useEffect(() => {
    if (!mode) pendingRef.current = null;
  }, [mode]);

  if (!mode) return null;

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const ident = (tab === "phone" ? phone : id).trim();
    if (!ident || !pw) {
      setError("Please enter your details and password");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: ident,
        portal: "customer",
        identifier: ident,
        phone: ident,
        username: ident,
        password: pw,
      });
      if (!res || res.error) {
        setError("Phone/Email or password is incorrect");
      } else {
        setMode(null);
        setAuthed(true);
        router.refresh();
        if (pendingRef.current) { const h = pendingRef.current; pendingRef.current = null; router.push(h); }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  };

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    const n = phone.replace(/\D/g, "");
    if (!/^0?1[3-9]\d{8}$/.test(n)) {
      setError("Please enter a valid phone number");
      return;
    }
    if (!agree) {
      setError("Please accept the Terms of Use and Privacy Policy");
      return;
    }
    setError("");
    // TODO: register / verify-otp API ekhane jora hobe
    setInfo("SMS verification is not connected yet.");
  };

  const PhoneField = (
    <div className="flex gap-3">
      <div className="flex h-[44px] w-[90px] shrink-0 items-center justify-center rounded border border-gray-300 text-sm text-gray-800">
        <span className="mr-1 text-xs">BD</span>+880
      </div>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Please enter your phone number"
        inputMode="tel"
        className={inputCls}
      />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setMode(null);
      }}
    >
      <div className="relative max-h-[95vh] w-full max-w-[440px] overflow-y-auto rounded-sm bg-white px-5 py-6 shadow-2xl sm:px-7">
        <button
          type="button"
          aria-label="Close"
          onClick={() => setMode(null)}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-900"
        >
          <X className="h-6 w-6" />
        </button>

        {mode === "login" ? (
          <>
            <div className="mb-6 flex items-center justify-center text-base">
              <button
                type="button"
                onClick={() => { setTab("password"); setError(""); }}
                className={"px-6 " + (tab === "password" ? "text-gray-900" : "text-gray-400")}
              >
                Password
              </button>
              <span className="h-6 w-px bg-gray-200" />
              <button
                type="button"
                onClick={() => { setTab("phone"); setError(""); }}
                className={"px-6 " + (tab === "phone" ? "text-gray-900" : "text-gray-400")}
              >
                Phone Number
              </button>
            </div>

            <form onSubmit={doLogin} className="space-y-4">
              {tab === "password" ? (
                <input
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="Please enter your Phone or Email"
                  className={inputCls}
                />
              ) : (
                PhoneField
              )}
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Please enter your password"
                  className={inputCls + " pr-12"}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPw ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
              </div>
              <div className="-mt-2 text-right">
                <button type="button" onClick={() => go("forgot")} className="text-sm text-gray-500 hover:text-[#f85606]">
                  Forgot password?
                </button>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={busy} className={btnCls}>
                {busy ? "Please wait..." : "LOGIN"}
              </button>
            </form>

            <p className="mt-3 text-center text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <button type="button" onClick={() => go("signup")} className="text-blue-600 hover:underline">
                Sign up
              </button>
            </p>
            <Social label="Or, login with" />
          </>
        ) : mode === "signup" ? (
          <>
            <h2 className="mb-6 text-center text-base text-gray-900">Sign up</h2>
            <form onSubmit={sendCode} className="space-y-4">
              {PhoneField}
              <label className="flex items-start gap-2 text-sm text-gray-500">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0"
                />
                <span>
                  By creating and/or using your account, you agree to our{" "}
                  <a href="/pages/terms" className="text-blue-600 hover:underline">Terms of Use</a> and{" "}
                  <a href="/pages/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
                </span>
              </label>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {info && <p className="text-sm text-gray-600">{info}</p>}
              <button type="submit" className={btnCls}>
                <Smartphone className="h-5 w-5" /> Send code via SMS
              </button>
            </form>

            <p className="mt-3 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <button type="button" onClick={() => go("login")} className="text-blue-600 hover:underline">
                Log in Now
              </button>
            </p>
            <Social label="Or, sign up with" />
          </>
        ) : (
          <ForgotPasswordDialog
            onBack={() => go("login")}
            onDone={() => setMode(null)}
          />
        )}
      </div>
    </div>
  );
}
