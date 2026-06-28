import { Link, redirect, useFetcher } from "react-router";
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
import { Button } from "~/components/Button";
import { Card } from "~/components/Card";
import { Input } from "~/components/Input";
import { Spinner } from "~/components/Spinner";

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

export default function IniciarSesion() {
  const fetcher = useFetcher();
  const loading = fetcher.state !== "idle";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-primary-900 dark:text-primary-100 text-center mb-2">
          Iniciar Sesión
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
          Ingresá a tu cuenta de proveedor o cliente
        </p>

        <fetcher.Form method="post" className="space-y-4">
          {fetcher.data?.error && (
            <p className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 px-4 py-2 rounded-lg text-sm">
              {fetcher.data.error}
            </p>
          )}

          <Input label="Email" type="email" name="email" required />
          <Input label="Contraseña" type="password" name="password" required />

          <Button type="submit" disabled={loading} className="w-full py-3">
            {loading ? <Spinner size={20} /> : null}
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </fetcher.Form>

        <p className="text-center text-slate-600 dark:text-slate-400 mt-6">
          ¿No tenés cuenta?{" "}
          <Link
            to="/registrarse"
            className="text-primary-600 dark:text-primary-400 font-semibold hover:underline"
          >
            Registrate
          </Link>
        </p>
      </Card>
    </div>
  );
}
