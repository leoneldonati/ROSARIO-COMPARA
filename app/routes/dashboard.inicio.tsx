import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard.inicio";
import { requireUser } from "~/lib/auth.server";
import { Card } from "~/components/Card";
import { Package, User, Search } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return { user };
}

export async function action({ request }: Route.ActionArgs) {
  const { logout } = await import("~/lib/auth.server");
  return logout(request);
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Dashboard - Proveedores App" }];
}

export default function DashboardInicio({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-100 mb-2">
        ¡Bienvenido, {user.nombre}!
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mb-8">
        {user.role === "PROVEEDOR"
          ? "Gestioná tus productos y perfil de proveedor desde acá."
          : "Buscá productos y compará proveedores para tu negocio."}
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {user.role === "PROVEEDOR" ? (
          <>
            <Link to="/dashboard/productos">
              <Card className="hover:bg-primary-100 dark:hover:bg-slate-700 transition">
                <Package className="w-10 h-10 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="text-xl font-bold text-primary-900 dark:text-primary-100 mb-2">Mis Productos</h3>
                <p className="text-slate-600 dark:text-slate-400">Administrá tu lista de precios y productos</p>
              </Card>
            </Link>
            <Link to="/dashboard/mi-perfil">
              <Card className="hover:bg-primary-100 dark:hover:bg-slate-700 transition">
                <User className="w-10 h-10 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="text-xl font-bold text-primary-900 dark:text-primary-100 mb-2">Mi Perfil</h3>
                <p className="text-slate-600 dark:text-slate-400">Completá tus datos, beneficios y cobertura</p>
              </Card>
            </Link>
          </>
        ) : (
          <>
            <Link to="/dashboard/buscar">
              <Card className="hover:bg-primary-100 dark:hover:bg-slate-700 transition">
                <Search className="w-10 h-10 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="text-xl font-bold text-primary-900 dark:text-primary-100 mb-2">Buscar Productos</h3>
                <p className="text-slate-600 dark:text-slate-400">Encontrá el mejor proveedor para cada producto</p>
              </Card>
            </Link>
            <Link to="/dashboard/mi-perfil">
              <Card className="hover:bg-primary-100 dark:hover:bg-slate-700 transition">
                <User className="w-10 h-10 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="text-xl font-bold text-primary-900 dark:text-primary-100 mb-2">Mi Perfil</h3>
                <p className="text-slate-600 dark:text-slate-400">Completá tus datos de facturación y entrega</p>
              </Card>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
