import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "toxic-jwt-secret-change-me-in-production",
);

export type AuthUser = {
  sub:   string;
  email: string;
  role:  "admin" | "customer";
};

export async function signJWT(
  payload: AuthUser,
  expiresIn: string = "7d",
): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      sub:   payload.sub as string,
      email: payload.email as string,
      role:  payload.role as "admin" | "customer",
    };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Extrait et vérifie le Bearer token de la requête */
export async function getAuthedUser(
  req: NextRequest,
): Promise<AuthUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyJWT(authHeader.slice(7));
}

/** Vérifie que l'utilisateur est admin */
export function isAdmin(user: AuthUser): boolean {
  return user.role === "admin";
}
