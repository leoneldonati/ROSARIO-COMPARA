import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard.inicio";
import { requireUser } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return { user };
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Dashboard - Proveedores App" }];
}

export default function DashboardInicio({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;

  return (
    <div>
      <h2 className="text-2xl font-bold text-amber-900 mb-2">
        ¡Bienvenido, {user.nombre}!
      </h2>
      <p className="text-amber-600 mb-8">
        {user.role === "PROVEEDOR"
          ? "Gestioná tus productos y perfil de proveedor desde acá."
          : "Buscá productos y compará proveedores para tu negocio."}
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {user.role === "PROVEEDOR" ? (
          <>
            <Link
              to="/dashboard/productos"
              className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition"
            >
              <span className="text-4xl block mb-4">📦</span>
              <h3 className="text-xl font-bold text-amber-900 mb-2">Mis Productos</h3>
              <p className="text-amber-600">
                Administrá tu lista de precios y productos
              </p>
            </Link>
            <Link
              to="/dashboard/mi-perfil"
              className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition"
            >
              <span className="text-4xl block mb-4">👤</span>
              <h3 className="text-xl font-bold text-amber-900 mb-2">Mi Perfil</h3>
              <p className="text-amber-600">
                Completá tus datos, beneficios y cobertura
              </p>
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/dashboard/buscar"
              className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition"
            >
              <span className="text-4xl block mb-4">🔍</span>
              <h3 className="text-xl font-bold text-amber-900 mb-2">Buscar Productos</h3>
              <p className="text-amber-600">
                Encontrá el mejor proveedor para cada producto
              </p>
            </Link>
            <Link
              to="/dashboard/mi-perfil"
              className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition"
            >
              <span className="text-4xl block mb-4">👤</span>
              <h3 className="text-xl font-bold text-amber-900 mb-2">Mi Perfil</h3>
              <p className="text-amber-600">
                Completá tus datos de facturación y entrega
              </p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
