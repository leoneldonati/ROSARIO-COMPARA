import { useState } from "react";
import { Link, Outlet, useFetcher, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/dashboard";
import type { SafeUser } from "~/lib/auth.server";
import { ThemeToggle } from "~/components/ThemeToggle";
import { Spinner } from "~/components/Spinner";
import { LayoutDashboard, User as UserIcon, Package, Search, ShoppingCart, ClipboardList, Menu, X } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  const { requireUser } = await import("~/lib/auth.server");
  const user = await requireUser(request);
  let cartCount = 0;
  if (user.role === "CLIENTE") {
    const { default: Cart } = await import("~/lib/models/cart.server");
    const cart = await Cart.findOne({ clientId: user._id }).lean();
    cartCount = cart ? cart.items.length : 0;
  }
  return { user, cartCount };
}

export async function action({ request }: Route.ActionArgs) {
  const { logout } = await import("~/lib/auth.server");
  return logout(request);
}

const navItems: { to: string; label: string; icon: React.ReactNode; roles: string[] }[] = [
  { to: "/dashboard", label: "Inicio", icon: <LayoutDashboard className="w-5 h-5" />, roles: ["CLIENTE", "PROVEEDOR"] },
  { to: "/dashboard/mi-perfil", label: "Mi Perfil", icon: <UserIcon className="w-5 h-5" />, roles: ["CLIENTE", "PROVEEDOR"] },
  { to: "/dashboard/productos", label: "Mis Productos", icon: <Package className="w-5 h-5" />, roles: ["PROVEEDOR"] },
  { to: "/dashboard/buscar", label: "Buscar Productos", icon: <Search className="w-5 h-5" />, roles: ["CLIENTE"] },
  { to: "/dashboard/carrito", label: "Carrito", icon: <ShoppingCart className="w-5 h-5" />, roles: ["CLIENTE"] },
  { to: "/dashboard/pedidos", label: "Pedidos", icon: <ClipboardList className="w-5 h-5" />, roles: ["CLIENTE", "PROVEEDOR"] },
];

export default function Dashboard() {
  const { user, cartCount } = useLoaderData() as { user: SafeUser; cartCount: number };
  const navigation = useNavigation();
  const logoutFetcher = useFetcher();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLoading = navigation.state === "loading";
  const loggingOut = logoutFetcher.state !== "idle";

  const visibleNav = navItems.filter(
    (item) => item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2.5 bg-primary-800 text-white rounded-lg shadow-lg hover:bg-primary-700 transition"
        aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-primary-800 dark:bg-primary-950 text-white
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:z-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-6 border-b border-primary-700 dark:border-primary-800">
          <Link
            to="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="text-xl font-bold tracking-tight"
          >
            Proveedores App
          </Link>
          <div className="flex items-center gap-2 mt-3 text-primary-200 text-sm">
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
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-primary-700/60 transition text-primary-200 hover:text-white"
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
              {item.label === "Carrito" && cartCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {cartCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-primary-700 dark:border-primary-800 space-y-2">
          <ThemeToggle />
          <logoutFetcher.Form method="post" action="/dashboard">
            <button
              type="submit"
              disabled={loggingOut}
              className="w-full px-4 py-2.5 bg-accent-600 hover:bg-accent-700 rounded-lg transition text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loggingOut ? <Spinner size={16} className="inline mr-2" /> : null}
              {loggingOut ? "Cerrando sesión..." : "Cerrar Sesión"}
            </button>
          </logoutFetcher.Form>
        </div>
      </aside>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/60 dark:bg-slate-950/60 z-50 flex items-center justify-center">
          <Spinner size={40} />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-20 md:pt-8 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
