import { Form, Link, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard.buscar";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import Product from "~/lib/models/product.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import User from "~/lib/models/user.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request, ["CLIENTE"]);
  await connectDB();

  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const precioMin = Number(url.searchParams.get("precioMin")) || 0;
  const precioMax = Number(url.searchParams.get("precioMax")) || 0;
  const zona = url.searchParams.get("zona") || "";
  const orden = url.searchParams.get("orden") || "precio_asc";

  const filter: any = { stock: true };

  if (q) {
    const regex = new RegExp(q, "i");
    filter.$or = [{ nombre: regex }, { categoria: regex }];
  }
  if (precioMin > 0) filter.precio = { ...filter.precio, $gte: precioMin };
  if (precioMax > 0) filter.precio = { ...filter.precio, $lte: precioMax };

  let productos: any[] = await Product.find(filter).sort({ precio: orden === "precio_asc" ? 1 : -1 }).lean();

  if (!productos.length) return { q, precioMin, precioMax, zona, orden, results: [] };

  const supplierIds = [...new Set(productos.map((p) => p.supplierId.toString()))];
  const perfiles = await SupplierProfile.find({ _id: { $in: supplierIds }, activo: true }).lean();
  const perfilesMap = new Map(perfiles.map((p) => [p._id.toString(), p]));
  const userIds = perfiles.map((p) => p.userId.toString());
  const usuarios = await User.find({ _id: { $in: userIds } }).select("nombre").lean();
  const usuariosMap = new Map(usuarios.map((u) => [u._id.toString(), u]));

  if (zona) {
    const zonaLower = zona.toLowerCase();
    productos = productos.filter((p) => {
      const perfil = perfilesMap.get(p.supplierId.toString());
      return perfil && perfil.coberturaEntrega?.toLowerCase().includes(zonaLower);
    });
  }

  const results = productos.map((p) => {
    const perfil = perfilesMap.get(p.supplierId.toString());
    const usr = perfil ? usuariosMap.get(perfil.userId.toString()) : null;
    return {
      ...p,
      _id: p._id.toString(),
      proveedorNombre: usr?.nombre || "Desconocido",
      proveedorId: perfil?._id.toString() || "",
      coberturaEntrega: perfil?.coberturaEntrega || "",
      beneficios: perfil?.beneficios || [],
      costoEnvio: perfil?.costoEnvio || 0,
      pedidoMinimo: perfil?.pedidoMinimo || 0,
    };
  });

  return { q, precioMin, precioMax, zona, orden, results };
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Buscar Productos - Proveedores App" }];
}

export default function Buscar({ loaderData }: Route.ComponentProps) {
  const { q, precioMin, precioMax, zona, orden, results } = loaderData;

  return (
    <div>
      <h2 className="text-2xl font-bold text-amber-900 mb-6">Buscar Productos</h2>

      <Form method="get" className="bg-white rounded-2xl p-6 shadow-md mb-8 space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscá por nombre o categoría..."
            className="flex-1 px-4 py-3 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-lg"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-amber-700 text-white rounded-xl hover:bg-amber-800 transition font-medium"
          >
            Buscar
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <input
            type="number"
            name="precioMin"
            placeholder="Precio min"
            defaultValue={precioMin || ""}
            className="px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="number"
            name="precioMax"
            placeholder="Precio max"
            defaultValue={precioMax || ""}
            className="px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="text"
            name="zona"
            placeholder="Zona de entrega"
            defaultValue={zona}
            className="px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <select
            name="orden"
            defaultValue={orden}
            className="px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
          </select>
        </div>
      </Form>

      {results.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-md">
          <p className="text-amber-600 text-lg">
            {q
              ? `No se encontraron resultados para "${q}"`
              : "Usá el buscador para encontrar productos"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {results.map((p: any) => (
            <div
              key={p._id}
              className="bg-white rounded-xl p-5 shadow-sm flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-amber-900 text-lg">{p.nombre}</h3>
                  {p.categoria && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                      {p.categoria}
                    </span>
                  )}
                </div>
                <p className="text-amber-700 font-medium mt-1">
                  ${p.precio} / {p.unidad}
                </p>
                <p className="text-amber-600 text-sm mt-1">
                  Proveedor: <span className="font-medium">{p.proveedorNombre}</span>
                </p>
                <div className="flex gap-3 mt-2 text-sm text-amber-500">
                  {p.coberturaEntrega && <span>📦 {p.coberturaEntrega}</span>}
                  {p.beneficios?.length > 0 && (
                    <span>🎯 {p.beneficios.slice(0, 2).join(", ")}</span>
                  )}
                </div>
              </div>
              <Link
                to={`/dashboard/producto/${p._id}/comparar`}
                className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition font-medium text-sm whitespace-nowrap"
              >
                Comparar
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
