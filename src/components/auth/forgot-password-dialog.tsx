"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Step = "contact" | "otp" | "password";
type ApiReply = {
  data?: { sessionToken?: string };
  error?: { message?: string };
  message?: string;
};

export default function ForgotPasswordDialog({
  onBack,
  onDone,
}: {
  onBack: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("contact");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [changeEmail, setChangeEmail] = useState("");

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const sendOtp = async (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setMessage(/^[+\d][\d\s()-]{6,}$/.test(value.trim())
        ? "Phone OTP is temporarily disabled. Use your account email for now."
        : "Enter a valid email address.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const data = await res.json().catch(() => ({} as ApiReply)) as ApiReply;
      if (!res.ok) throw new Error(data.error?.message || "Could not send the code.");

      setEmail(normalized);
      setOtp("");
      setStep("otp");
      setResendSeconds(30);
      setChangeEmailOpen(false);
      toast.success("If the account exists, a code has been sent to its email.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setMessage("Enter the 6-digit code.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/v1/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json().catch(() => ({} as ApiReply)) as ApiReply;
      if (!res.ok) throw new Error(data.error?.message || "Invalid or expired code.");
      if (!data.data?.sessionToken) throw new Error("Could not verify the code. Request a new one.");

      setSessionToken(data.data.sessionToken);
      setStep("password");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not verify the code.");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sessionToken, newPassword: password }),
      });
      const data = await res.json().catch(() => ({} as ApiReply)) as ApiReply;
      if (!res.ok) throw new Error(data.error?.message || "Could not reset the password.");

      const login = await signIn("credentials", { email, password, redirect: false });
      if (!login || login.error) {
        toast.success("Password changed. Please sign in with your new password.");
        onBack();
        return;
      }

      toast.success("Password changed. You are signed in.");
      onDone();
      router.push("/account");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Forgot password">
      <div className="mb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          aria-label="Back to sign in"
          className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">Forgot your password?</h2>
      </div>

      <p className="text-sm text-gray-600">
        {step === "contact" && "Enter your account email. Phone OTP is currently turned off."}
        {step === "otp" && (
          <span>Enter the 6-digit code sent to <strong>{email}</strong>.</span>
        )}
        {step === "password" && "Choose a new password for your account."}
      </p>

      {message && <p role="alert" className="mt-3 text-sm text-red-600">{message}</p>}

      {step === "contact" && (
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void sendOtp(contact);
          }}
        >
          <label className="block text-sm font-medium" htmlFor="reset-contact">
            Phone Number or Email
          </label>
          <input
            id="reset-contact"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            disabled={busy}
            autoFocus
            placeholder="Email address (SMS temporarily off)"
            className="w-full rounded-md border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center rounded-md bg-orange-500 py-2.5 font-medium text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Confirm"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form className="mt-5 space-y-4" onSubmit={verifyOtp}>
          <label className="block text-sm font-medium" htmlFor="reset-otp">One-time code</label>
          <input
            id="reset-otp"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            disabled={busy}
            className="w-full rounded-md border border-gray-300 px-3 py-2.5 tracking-[0.3em] outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-orange-500 py-2.5 font-medium text-white disabled:opacity-60"
          >
            {busy ? "Checking..." : "Verify code"}
          </button>
          <div className="flex items-center justify-between gap-3 text-sm">
            <button
              type="button"
              disabled={busy || resendSeconds > 0}
              onClick={() => void sendOtp(email)}
              className="text-orange-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400"
            >
              {resendSeconds > 0 ? "Resend code in " + resendSeconds + "s" : "Resend code"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setChangeEmail(email);
                setMessage("");
                setChangeEmailOpen(true);
              }}
              className="text-gray-600 hover:text-orange-600 hover:underline disabled:opacity-50"
            >
              Change email
            </button>
          </div>
        </form>
      )}

      {step === "password" && (
        <form className="mt-5 space-y-4" onSubmit={resetPassword}>
          <div>
            <label className="block text-sm font-medium" htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              disabled={busy}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
              disabled={busy}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-orange-500 py-2.5 font-medium text-white disabled:opacity-60"
          >
            {busy ? "Saving..." : "Set new password"}
          </button>
        </form>
      )}

      {changeEmailOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-email-title"
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 id="change-email-title" className="text-lg font-semibold text-gray-900">
                Change email
              </h3>
              <button
                type="button"
                aria-label="Close"
                disabled={busy}
                onClick={() => {
                  setChangeEmailOpen(false);
                  setMessage("");
                }}
                className="rounded px-2 py-1 text-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                ?
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              A fresh code will be sent to this email. After it is sent, the previous code will no longer work.
            </p>
            {message && <p role="alert" className="mt-3 text-sm text-red-600">{message}</p>}
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void sendOtp(changeEmail);
              }}
            >
              <label className="block text-sm font-medium" htmlFor="change-reset-email">
                New email address
              </label>
              <input
                id="change-reset-email"
                type="email"
                required
                autoComplete="email"
                value={changeEmail}
                onChange={(event) => {
                  setChangeEmail(event.target.value);
                  setMessage("");
                }}
                disabled={busy}
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md bg-orange-500 py-2.5 font-medium text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {busy ? "Sending..." : "Send new code"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setChangeEmailOpen(false);
                  setMessage("");
                }}
                className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
              >
                Cancel
              </button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
