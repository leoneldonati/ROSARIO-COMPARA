import jwt from "jsonwebtoken";
import { createCookieSessionStorage, redirect } from "react-router";
import User from "./models/user.server";
import type { UserI } from "./models/user.server";

const SECRET: string = process.env.JWT_SECRET ?? "";
if (!SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export type SafeUser = Omit<UserI, "password">;

export function sanitizeUser(user: UserI): SafeUser {
  const { password: _, ...safe } = user;
  return safe;
}

export function createToken(user: { _id: string; email: string; role: string }) {
  return jwt.sign({ _id: user._id, email: user.email, role: user.role }, SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET) as unknown as { _id: string; email: string; role: string };
}

type SessionData = {
  token: string;
};

type SessionFlashData = {
  error: string;
};

export function getSessionStorage() {
  return createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: "session",
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secrets: [SECRET],
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    },
  });
}

export async function getSession(request: Request) {
  return getSessionStorage().getSession(request.headers.get("Cookie"));
}

export async function requireUser(
  request: Request,
  roles?: string[]
): Promise<SafeUser> {
  const session = await getSession(request);
  const token = session.get("token");
  if (!token) throw redirect("/iniciar-sesion");

  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload._id).select("-password").lean();
    if (!user) throw redirect("/iniciar-sesion");
    if (roles && !roles.includes(user.role)) throw redirect("/dashboard");
    return user as unknown as SafeUser;
  } catch {
    throw redirect("/iniciar-sesion");
  }
}

export async function requireGuest(request: Request) {
  const session = await getSession(request);
  const token = session.get("token");
  if (token) {
    try {
      verifyToken(token);
      throw redirect("/dashboard");
    } catch {
      // token inválido, sigue como invitado
    }
  }
}

export async function logout(request: Request) {
  const session = await getSession(request);
  return redirect("/iniciar-sesion", {
    headers: { "Set-Cookie": await getSessionStorage().destroySession(session) },
  });
}
