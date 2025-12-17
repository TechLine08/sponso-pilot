import { NextResponse } from "next/server";
import { verifyEmail } from "@/app/lib/auth-db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Verification token is required" },
        { status: 400 }
      );
    }

    const success = await verifyEmail(token);

    if (!success) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Email verified successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to verify email" },
      { status: 500 }
    );
  }
}







