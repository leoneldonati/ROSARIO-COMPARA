import { useState } from "react";
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

const navItems = [
  { to: "/dashboard", label: "Inicio", icon: "📊", roles: ["CLIENTE", "PROVEEDOR"] },
  { to: "/dashboard/mi-perfil", label: "Mi Perfil", icon: "👤", roles: ["CLIENTE", "PROVEEDOR"] },
  { to: "/dashboard/productos", label: "Mis Productos", icon: "📦", roles: ["PROVEEDOR"] },
  { to: "/dashboard/buscar", label: "Buscar Productos", icon: "🔍", roles: ["CLIENTE"] },
  { to: "/dashboard/carrito", label: "Carrito", icon: "🛒", roles: ["CLIENTE"] },
  { to: "/dashboard/pedidos", label: "Pedidos", icon: "📋", roles: ["CLIENTE", "PROVEEDOR"] },
];

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleNav = navItems.filter(
    (item) => item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2.5 bg-amber-800 text-white rounded-xl shadow-lg hover:bg-amber-700 transition"
        aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {sidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-amber-900 text-white
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:z-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-6 border-b border-amber-800">
          <Link
            to="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="text-xl font-bold tracking-tight"
          >
            Proveedores App
          </Link>
          <div className="flex items-center gap-2 mt-3 text-amber-200 text-sm">
            <span className="truncate max-w-[140px]">{user.nombre}</span>
            <span
              className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                user.role === "PROVEEDOR" ? "bg-blue-500" : "bg-green-500"
              }`}
            >
              {user.role === "PROVEEDOR" ? "Proveedor" : "Cliente"}
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-amber-800/60 transition text-amber-100 hover:text-white"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-amber-800">
          <Form method="post">
            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-amber-700 hover:bg-amber-600 rounded-xl transition text-sm font-medium"
            >
              Cerrar Sesión
            </button>
          </Form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-20 md:pt-8 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
