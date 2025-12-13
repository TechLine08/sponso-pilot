"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();

      if (!json.ok) {
        toast.error("Request failed", json.error || "Please try again.");
        setLoading(false);
        return;
      }

      toast.success("Email sent", "If an account exists, you'll receive a password reset link.");
      setSent(true);
    } catch (error: any) {
      toast.error("Request failed", error.message || "Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-fuchsia-50 dark:from-[#0b1020] dark:via-[#0b1628] dark:to-[#111126] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-semibold tracking-tight">
            SponsoPilot
          </Link>
          <h1 className="mt-4 text-3xl font-bold">Reset your password</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-8 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-indigo-300 dark:border-white/10 dark:bg-white/5"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <div className="mb-4 text-4xl">✉️</div>
              <h2 className="text-xl font-semibold">Check your email</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                The link will expire in 1 hour. If you don't see the email, check your spam folder.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="mt-4 text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Try a different email
              </button>
            </div>
          )}

          <div className="mt-6 text-center text-sm">
            <Link
              href="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

