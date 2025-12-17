import { NextResponse } from "next/server";
import { setPasswordResetToken } from "@/app/lib/auth-db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const resetToken = await setPasswordResetToken(email);

    // Always return success to prevent email enumeration
    // If user exists, send reset email
    if (resetToken) {
      const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;
      
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          to: email,
          subject: "Reset your SponsoPilot password",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Reset your password</h2>
              <p>Hi there,</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <p style="margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Reset Password
                </a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="color: #666; font-size: 12px; word-break: break-all;">${resetUrl}</p>
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
        // Still return success to prevent email enumeration
      }
    }

    return NextResponse.json({
      ok: true,
      message: "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to process password reset request" },
      { status: 500 }
    );
  }
}




