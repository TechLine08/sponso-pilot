import { NextResponse } from "next/server";
import { getUserByEmail, updateUser } from "@/app/lib/auth-db";
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

    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        ok: true,
        message: "If an account exists with this email, a verification link has been sent.",
      });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { ok: false, error: "Email is already verified" },
        { status: 400 }
      );
    }

    // Generate new verification token
    const verificationToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await updateUser(user.id, { emailVerificationToken: verificationToken });

    const verificationUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/verify-email?token=${verificationToken}`;
    
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: user.email,
        subject: "Verify your SponsoPilot account",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verify your SponsoPilot account</h2>
            <p>Hi ${user.name},</p>
            <p>Please verify your email address by clicking the button below:</p>
            <p style="margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Email Address
              </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="color: #666; font-size: 12px; word-break: break-all;">${verificationUrl}</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      return NextResponse.json(
        { ok: false, error: "Failed to send verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Verification email sent. Please check your inbox.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to resend verification email" },
      { status: 500 }
    );
  }
}





