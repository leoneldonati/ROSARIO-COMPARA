import { Form, Link, Outlet, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard";
import { requireUser, logout } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return { user };
}

export async function action({ request }: Route.ActionArgs) {
  return logout(request);
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;

  return (
    <div className="min-h-screen bg-amber-50 flex">
      <aside className="w-64 bg-amber-900 text-white p-6 flex flex-col">
        <Link to="/dashboard" className="text-xl font-bold mb-8">Proveedores App</Link>
        <p className="text-amber-200 text-sm mb-6">
          {user.nombre}
          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
            user.role === "PROVEEDOR" ? "bg-blue-500" : "bg-green-500"
          }`}>
            {user.role === "PROVEEDOR" ? "Proveedor" : "Cliente"}
          </span>
        </p>

        <nav className="space-y-2 flex-1">
          <Link
            to="/dashboard"
            className="block px-3 py-2 rounded-lg hover:bg-amber-800 transition"
          >
            Inicio
          </Link>
          <Link
            to="/dashboard/mi-perfil"
            className="block px-3 py-2 rounded-lg hover:bg-amber-800 transition"
          >
            Mi Perfil
          </Link>

          {user.role === "PROVEEDOR" && (
            <Link
              to="/dashboard/productos"
              className="block px-3 py-2 rounded-lg hover:bg-amber-800 transition"
            >
              Mis Productos
            </Link>
          )}

          {user.role === "CLIENTE" && (
            <Link
              to="/dashboard/buscar"
              className="block px-3 py-2 rounded-lg hover:bg-amber-800 transition"
            >
              Buscar Productos
            </Link>
          )}
        </nav>

        <Form method="post">
          <button
            type="submit"
            className="w-full px-3 py-2 bg-amber-700 rounded-lg hover:bg-amber-600 transition text-sm"
          >
            Cerrar Sesión
          </button>
        </Form>
      </aside>

      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
