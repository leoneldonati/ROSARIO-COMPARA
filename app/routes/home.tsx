import { Link } from "react-router";
import type { Route } from "./+types/home";
import { getSession } from "~/lib/auth.server";
import { Card } from "~/components/Card";
import { Search, BarChart3, Star } from "lucide-react";

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

const features = [
  { icon: Search, title: "Buscá productos", desc: "Encontrá el producto que necesitás y compará precios entre distintos proveedores al instante." },
  { icon: BarChart3, title: "Compará beneficios", desc: "Vê descuentos, coberturas de entrega y costos de envio de cada proveedor en un solo lugar." },
  { icon: Star, title: "Elegí el mejor", desc: "Los proveedores aparecen ordenados por puntuación para que elijas con confianza." },
];

export default function Home({ loaderData }: Route.ComponentProps) {
  const { autenticado } = loaderData;

  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-200">Proveedores App</h1>
        <div className="flex gap-2 sm:gap-3 flex-wrap justify-end">
          {autenticado ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition bg-accent-600 text-white hover:bg-accent-700"
            >
              Ir al Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/iniciar-sesion"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-950"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/registrarse"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition bg-accent-600 text-white hover:bg-accent-700"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary-900 dark:text-primary-100 mb-6 leading-tight">
            Conectamos bares con los mejores proveedores
          </h2>
          <p className="text-xl text-primary-700 dark:text-primary-300 mb-10">
            Compará precios, beneficios y encontrá al proveedor ideal para tu negocio.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/registrarse"
              className="w-full sm:w-auto px-8 py-3 text-lg rounded-lg font-medium transition text-center bg-accent-600 text-white hover:bg-accent-700"
            >
              Soy un bar / restaurante
            </Link>
            <Link
              to="/registrarse"
              className="w-full sm:w-auto px-8 py-3 text-lg rounded-lg font-medium transition text-center border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-950"
            >
              Soy un proveedor
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-32">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} as="article">
                <Icon className="w-10 h-10 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="text-xl font-bold text-primary-900 dark:text-primary-100 mb-3">{f.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{f.desc}</p>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
