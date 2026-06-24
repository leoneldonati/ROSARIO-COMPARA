import { Form, Link, useActionData, redirect } from "react-router";
import type { Route } from "./+types/iniciar-sesion";
import { connectDB } from "~/lib/db.server";
import User from "~/lib/models/user.server";
import {
  createToken,
  getSession,
  getSessionStorage,
  requireGuest,
} from "~/lib/auth.server";
import bcrypt from "bcryptjs";

export async function loader({ request }: Route.LoaderArgs) {
  await requireGuest(request);
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  await connectDB();
  const form = await request.formData();
  const email = form.get("email") as string;
  const password = form.get("password") as string;

  if (!email || !password) {
    return { error: "Completá todos los campos" };
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return { error: "Email o contraseña incorrectos" };
  }

  const valida = await bcrypt.compare(password, user.password);
  if (!valida) {
    return { error: "Email o contraseña incorrectos" };
  }

  const token = createToken(user);
  const session = await getSession(request);
  session.set("token", token);

  return redirect("/dashboard", {
    headers: {
      "Set-Cookie": await getSessionStorage().commitSession(session),
    },
  });
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Iniciar Sesión - Proveedores App" }];
}

export default function IniciarSesion({ actionData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-amber-900 text-center mb-2">
          Iniciar Sesión
        </h1>
        <p className="text-amber-600 text-center mb-6">
          Ingresá a tu cuenta de proveedor o cliente
        </p>

        <Form method="post" className="space-y-4">
          {actionData?.error && (
            <p className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">
              {actionData.error}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition font-medium"
          >
            Ingresar
          </button>
        </Form>

        <p className="text-center text-amber-600 mt-6">
          ¿No tenés cuenta?{" "}
          <Link
            to="/registrarse"
            className="text-amber-800 font-semibold hover:underline"
          >
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
