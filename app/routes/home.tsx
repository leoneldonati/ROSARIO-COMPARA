import { Link } from "react-router";
import type { Route } from "./+types/home";
import { getSession } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  const token = session.get("token");
  return { autenticado: !!token };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Proveedores App - Encuentra los mejores proveedores para tu bar" },
    { name: "description", content: "Plataforma B2B que conecta bares y restaurantes con proveedores gastronómicos" },
  ];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { autenticado } = loaderData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-amber-900">Proveedores App</h1>
        <div className="flex gap-3">
          {autenticado ? (
            <Link
              to="/dashboard"
              className="px-5 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition"
            >
              Ir al Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/iniciar-sesion"
                className="px-5 py-2 text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-100 transition"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/registrarse"
                className="px-5 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-extrabold text-amber-900 mb-6 leading-tight">
            Conectamos bares con los mejores proveedores
          </h2>
          <p className="text-xl text-amber-800 mb-10">
            Compará precios, beneficios y encontrá al proveedor ideal para tu negocio.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/registrarse"
              className="px-8 py-3 bg-amber-700 text-white text-lg rounded-xl hover:bg-amber-800 transition shadow-lg"
            >
              Soy un bar / restaurante
            </Link>
            <Link
              to="/registrarse"
              className="px-8 py-3 bg-white text-amber-800 text-lg border border-amber-300 rounded-xl hover:bg-amber-50 transition shadow-lg"
            >
              Soy un proveedor
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-32">
          <div className="bg-white rounded-2xl p-8 shadow-md">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-amber-900 mb-3">Buscá productos</h3>
            <p className="text-amber-700">
              Encontrá el producto que necesitás y compará precios entre distintos proveedores al instante.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-md">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-amber-900 mb-3">Compará beneficios</h3>
            <p className="text-amber-700">
              Vê descuentos, coberturas de entrega y costos de envio de cada proveedor en un solo lugar.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-md">
            <div className="text-4xl mb-4">⭐</div>
            <h3 className="text-xl font-bold text-amber-900 mb-3">Elegí el mejor</h3>
            <p className="text-amber-700">
              Los proveedores aparecen ordenados por puntuación para que elijas con confianza.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
