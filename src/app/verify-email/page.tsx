"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error" | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      verifyToken(token);
    } else {
      setStatus("error");
    }
  }, [searchParams]);

  async function verifyToken(token: string) {
    try {
      const res = await fetch(`/api/auth/verify-email?token=${token}`);
      const json = await res.json();

      if (json.ok) {
        setStatus("success");
        toast.success("Email verified!", "You can now log in to your account.");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setStatus("error");
        toast.error("Verification failed", json.error || "Invalid or expired token.");
      }
    } catch (error: any) {
      setStatus("error");
      toast.error("Verification failed", "Please try again.");
    }
  }

  async function resendVerification() {
    if (!email) {
      toast.error("Email required", "Please enter your email address.");
      return;
    }

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();

      if (json.ok) {
        toast.success("Email sent", "Please check your inbox for the verification link.");
      } else {
        toast.error("Failed to send", json.error || "Please try again.");
      }
    } catch (error: any) {
      toast.error("Failed to send", "Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-fuchsia-50 dark:from-[#0b1020] dark:via-[#0b1628] dark:to-[#111126] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-semibold tracking-tight">
            SponsoPilot
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-8 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 text-center">
          {status === "loading" && (
            <>
              <div className="mb-4 text-4xl">⏳</div>
              <h1 className="text-2xl font-bold">Verifying your email...</h1>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Please wait while we verify your email address.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mb-4 text-4xl">✅</div>
              <h1 className="text-2xl font-bold">Email verified!</h1>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Your email has been successfully verified. Redirecting to login...
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500"
              >
                Go to Login
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mb-4 text-4xl">❌</div>
              <h1 className="text-2xl font-bold">Verification failed</h1>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                The verification link is invalid or has expired.
              </p>
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="resend-email" className="mb-1 block text-sm font-medium">
                    Enter your email to resend verification
                  </label>
                  <input
                    id="resend-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-indigo-300 dark:border-white/10 dark:bg-white/5"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  onClick={resendVerification}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500"
                >
                  Resend Verification Email
                </button>
              </div>
              <div className="mt-4">
                <Link
                  href="/login"
                  className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}







