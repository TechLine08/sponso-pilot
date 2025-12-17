import { NextResponse } from "next/server";
import { resetPassword } from "@/app/lib/auth-db";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { ok: false, error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const success = await resetPassword(token, password);

    if (!success) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}





