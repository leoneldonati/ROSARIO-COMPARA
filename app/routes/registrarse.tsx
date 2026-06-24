import { Form, Link, redirect, useActionData } from "react-router";
import type { Route } from "./+types/registrarse";
import { connectDB } from "~/lib/db.server";
import User from "~/lib/models/user.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import ClientProfile from "~/lib/models/client-profile.server";
import {
  createToken,
  getSession,
  getSessionStorage,
  requireGuest,
} from "~/lib/auth.server";
import bcrypt from "bcryptjs";
import { useState } from "react";

export async function loader({ request }: Route.LoaderArgs) {
  await requireGuest(request);
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  await connectDB();
  const form = await request.formData();
  const email = form.get("email") as string;
  const password = form.get("password") as string;
  const nombre = form.get("nombre") as string;
  const role = form.get("role") as string;

  if (!email || !password || !nombre || !role) {
    return { error: "Completá todos los campos" };
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres" };
  }

  if (role !== "CLIENTE" && role !== "PROVEEDOR") {
    return { error: "Rol inválido" };
  }

  const existe = await User.findOne({ email: email.toLowerCase() });
  if (existe) {
    return { error: "Ya existe una cuenta con ese email" };
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: email.toLowerCase(),
    password: hash,
    role,
    nombre,
  });

  if (role === "PROVEEDOR") {
    await SupplierProfile.create({ userId: user._id });
  } else {
    await ClientProfile.create({ userId: user._id });
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
  return [{ title: "Registrarse - Proveedores App" }];
}

export default function Registrarse({ actionData }: Route.ComponentProps) {
  const [rol, setRol] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-amber-900 text-center mb-2">
          Crear Cuenta
        </h1>
        <p className="text-amber-600 text-center mb-6">
          Elegí tu rol y completá tus datos
        </p>

        <Form method="post" className="space-y-4">
          {actionData?.error && (
            <p className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">
              {actionData.error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setRol("CLIENTE")}
              className={`flex-1 py-3 px-4 rounded-xl border-2 text-center transition ${
                rol === "CLIENTE"
                  ? "border-amber-700 bg-amber-50 text-amber-900"
                  : "border-amber-200 text-amber-600 hover:border-amber-300"
              }`}
            >
              <span className="text-2xl block mb-1">🏪</span>
              <span className="font-medium">Cliente</span>
              <span className="text-xs block mt-1">Bar / Restaurante</span>
            </button>
            <button
              type="button"
              onClick={() => setRol("PROVEEDOR")}
              className={`flex-1 py-3 px-4 rounded-xl border-2 text-center transition ${
                rol === "PROVEEDOR"
                  ? "border-amber-700 bg-amber-50 text-amber-900"
                  : "border-amber-200 text-amber-600 hover:border-amber-300"
              }`}
            >
              <span className="text-2xl block mb-1">📦</span>
              <span className="font-medium">Proveedor</span>
              <span className="text-xs block mt-1">
                Distribuidor / Fabricante
              </span>
            </button>
          </div>

          <input type="hidden" name="role" value={rol} />

          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">
              Nombre del negocio
            </label>
            <input
              type="text"
              name="nombre"
              required
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

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
              minLength={6}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={!rol}
            className="w-full py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Crear cuenta
          </button>
        </Form>

        <p className="text-center text-amber-600 mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link
            to="/iniciar-sesion"
            className="text-amber-800 font-semibold hover:underline"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
