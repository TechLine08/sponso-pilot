import { NextResponse } from "next/server";
import { createUser } from "@/app/lib/auth-db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { ok: false, error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const { user, verificationToken } = await createUser(email, password, name);

    // Send verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/verify-email?token=${verificationToken}`;
    
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: user.email,
        subject: "Verify your SponsoPilot account",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to SponsoPilot!</h2>
            <p>Hi ${user.name},</p>
            <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
            <p style="margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Email Address
              </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="color: #666; font-size: 12px; word-break: break-all;">${verificationUrl}</p>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Don't fail signup if email fails, but log it
    }

    return NextResponse.json({
      ok: true,
      message: "Account created. Please check your email to verify your account.",
    });
  } catch (error: any) {
    if (error.message === "User already exists") {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to create account" },
      { status: 500 }
    );
  }
}






