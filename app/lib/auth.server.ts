import jwt from "jsonwebtoken";
import { createCookieSessionStorage, redirect } from "react-router";
import type { UserI } from "./models/user.server";

const SECRET = process.env.JWT_SECRET || "dev-secret";

export function createToken(user: { _id: string; email: string; role: string }) {
  return jwt.sign({ _id: user._id, email: user.email, role: user.role }, SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET) as { _id: string; email: string; role: string };
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
): Promise<UserI> {
  const session = await getSession(request);
  const token = session.get("token");
  if (!token) throw redirect("/iniciar-sesion");

  try {
    const payload = verifyToken(token);
    const { default: User } = await import("./models/user.server");
    const user = await User.findById(payload._id).lean();
    if (!user) throw redirect("/iniciar-sesion");
    if (roles && !roles.includes(user.role)) throw redirect("/dashboard");
    return user as unknown as UserI;
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
