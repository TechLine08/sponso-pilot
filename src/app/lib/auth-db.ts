import bcrypt from "bcryptjs";
import type { User } from "@/types";

// Simple in-memory storage for now (can be replaced with DB later)
// In production, replace this with a real database (PostgreSQL, MongoDB, etc.)
const users: Map<string, UserRecord> = new Map();

type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  passwordResetToken: string | null;
  passwordResetExpires: string | null;
  createdAt: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<{ user: User; verificationToken: string }> {
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new Error("User already exists");
  }

  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const passwordHash = await hashPassword(password);
  const verificationToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const createdAt = new Date().toISOString();

  const userRecord: UserRecord = {
    id,
    email: email.toLowerCase().trim(),
    name,
    passwordHash,
    emailVerified: false,
    emailVerificationToken: verificationToken,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt,
  };

  users.set(id, userRecord);
  users.set(email.toLowerCase().trim(), userRecord); // Also index by email for quick lookup

  const user: User = {
    id,
    email: userRecord.email,
    name,
    emailVerified: false,
    createdAt,
  };

  return { user, verificationToken };
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const normalized = email.toLowerCase().trim();
  // Check if we have it indexed by email
  const record = users.get(normalized);
  if (record) return record;
  
  // Fallback: search through all users
  for (const user of users.values()) {
    if (user.email === normalized) {
      return user;
    }
  }
  return null;
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  return users.get(id) || null;
}

export async function verifyEmail(token: string): Promise<boolean> {
  for (const user of users.values()) {
    if (user.emailVerificationToken === token) {
      user.emailVerified = true;
      user.emailVerificationToken = null;
      return true;
    }
  }
  return false;
}

export async function updateUser(id: string, updates: Partial<UserRecord>): Promise<void> {
  const user = users.get(id);
  if (user) {
    Object.assign(user, updates);
  }
}

export async function setPasswordResetToken(email: string): Promise<string | null> {
  const user = await getUserByEmail(email);
  if (!user) {
    return null; // Don't reveal if user exists
  }

  const resetToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

  await updateUser(user.id, {
    passwordResetToken: resetToken,
    passwordResetExpires: expiresAt,
  });

  return resetToken;
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  for (const user of users.values()) {
    if (user.passwordResetToken === token) {
      // Check if token is expired
      if (user.passwordResetExpires && new Date(user.passwordResetExpires) < new Date()) {
        return false;
      }

      const newHash = await hashPassword(newPassword);
      await updateUser(user.id, {
        passwordHash: newHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      });
      return true;
    }
  }
  return false;
}

// For development: clear all users (useful for testing)
export function clearAllUsers() {
  users.clear();
}


