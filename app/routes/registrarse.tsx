import { Link, redirect, useFetcher } from "react-router";
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
import { Button } from "~/components/Button";
import { Card } from "~/components/Card";
import { Input } from "~/components/Input";
import { Spinner } from "~/components/Spinner";
import { Store, Package } from "lucide-react";

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

export default function Registrarse() {
  const [rol, setRol] = useState("");
  const fetcher = useFetcher();
  const loading = fetcher.state !== "idle";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-primary-900 dark:text-primary-100 text-center mb-2">
          Crear Cuenta
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
          Elegí tu rol y completá tus datos
        </p>

        <fetcher.Form method="post" className="space-y-4">
          {fetcher.data?.error && (
            <p className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 px-4 py-2 rounded-lg text-sm">
              {fetcher.data.error}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setRol("CLIENTE")}
              className={`flex-1 py-3 px-4 rounded-lg border-2 text-center transition cursor-pointer ${
                rol === "CLIENTE"
                  ? "border-primary-600 bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-100"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-300 dark:hover:border-primary-700"
              }`}
            >
              <Store className="w-8 h-8 mx-auto mb-1" />
              <span className="font-medium">Cliente</span>
              <span className="text-xs block mt-1">Bar / Restaurante</span>
            </button>
            <button
              type="button"
              onClick={() => setRol("PROVEEDOR")}
              className={`flex-1 py-3 px-4 rounded-lg border-2 text-center transition cursor-pointer ${
                rol === "PROVEEDOR"
                  ? "border-primary-600 bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-100"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-300 dark:hover:border-primary-700"
              }`}
            >
              <Package className="w-8 h-8 mx-auto mb-1" />
              <span className="font-medium">Proveedor</span>
              <span className="text-xs block mt-1">Distribuidor / Fabricante</span>
            </button>
          </div>

          <input type="hidden" name="role" value={rol} />

          <Input label="Nombre del negocio" type="text" name="nombre" required />
          <Input label="Email" type="email" name="email" required />
          <Input label="Contraseña" type="password" name="password" required minLength={6} />

          <Button
            type="submit"
            disabled={!rol || loading}
            className="w-full py-3"
          >
            {loading ? <Spinner size={20} /> : null}
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </fetcher.Form>

        <p className="text-center text-slate-600 dark:text-slate-400 mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link
            to="/iniciar-sesion"
            className="text-primary-600 dark:text-primary-400 font-semibold hover:underline"
          >
            Iniciá sesión
          </Link>
        </p>
      </Card>
    </div>
  );
}
