import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard.productos";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import Product from "~/lib/models/product.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request, ["PROVEEDOR"]);
  await connectDB();
  const perfil = await SupplierProfile.findOne({ userId: user._id });
  if (!perfil) throw new Error("Perfil de proveedor no encontrado");

  const productos = await Product.find({ supplierId: perfil._id })
    .sort({ createdAt: -1 })
    .lean();

  return { productos, supplierId: perfil._id.toString() };
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Mis Productos - Proveedores App" }];
}

export default function MisProductos({ loaderData }: Route.ComponentProps) {
  const { productos, supplierId } = loaderData;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-amber-900">Mis Productos</h2>
        <Link
          to="/dashboard/productos/nuevo"
          className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition"
        >
          + Nuevo Producto
        </Link>
      </div>

      {productos.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 sm:p-12 text-center shadow-md">
          <p className="text-amber-600 text-base sm:text-lg mb-4">Todavía no cargaste productos.</p>
          <Link
            to="/dashboard/productos/nuevo"
            className="text-amber-800 font-semibold hover:underline"
          >
            Cargá tu primer producto
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {productos.map((p) => (
            <div
              key={p._id.toString()}
              className="bg-white rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <h3 className="font-semibold text-amber-900 text-lg">{p.nombre}</h3>
                <p className="text-amber-600 text-sm">
                  {p.categoria && `${p.categoria} · `}${p.precio} / {p.unidad}
                </p>
                {p.descripcion && (
                  <p className="text-amber-500 text-sm mt-1">{p.descripcion}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    p.stock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {p.stock ? "En stock" : "Sin stock"}
                </span>
                <Link
                  to={`/dashboard/productos/${p._id}/editar`}
                  className="px-3 py-1.5 text-sm bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition"
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
