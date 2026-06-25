import { Form, Link, useLoaderData, useSearchParams } from "react-router";
import type { Route } from "./+types/dashboard.buscar";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import Product from "~/lib/models/product.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import User from "~/lib/models/user.server";
import { calcularScoreProveedoresCategoria } from "~/lib/scoring.server";
import { PESOS_DEFAULT, BADGE_COLORS } from "~/lib/scoring.shared";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request, ["CLIENTE"]);
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

  const sortOrder = orden === "precio_asc" ? 1 : -1;
  let productos: any[] = await Product.find(filter).sort({ precio: sortOrder }).lean();

  if (!productos.length) return { q, precioMin, precioMax, zona, orden, categorias: [] };

  const supplierIds = [...new Set(productos.map((p) => p.supplierId.toString()))];
  const perfiles = await SupplierProfile.find({ _id: { $in: supplierIds }, activo: true }).lean();
  const perfilesMap = new Map(perfiles.map((p) => [p._id.toString(), p]));
  const userIds = perfiles.map((p) => p.userId.toString());
  const usuarios = await User.find({ _id: { $in: userIds } }).select("nombre email telefono").lean();
  const usuariosMap = new Map(usuarios.map((u) => [u._id.toString(), u]));

  if (zona) {
    const zonaLower = zona.toLowerCase();
    productos = productos.filter((p) => {
      const perfil = perfilesMap.get(p.supplierId.toString());
      return perfil && perfil.coberturaEntrega?.toLowerCase().includes(zonaLower);
    });
  }

  const groupedByCategory = new Map<string, Map<string, any>>();
  for (const p of productos) {
    const cat = p.categoria || "Sin categoría";
    if (!groupedByCategory.has(cat)) groupedByCategory.set(cat, new Map());
    const catMap = groupedByCategory.get(cat)!;
    const sid = p.supplierId.toString();
    if (!catMap.has(sid)) {
      const perfil = perfilesMap.get(sid);
      const usr = perfil ? usuariosMap.get(perfil.userId.toString()) : null;
      catMap.set(sid, {
        supplierId: sid,
        proveedorNombre: usr?.nombre || "Desconocido",
        proveedorEmail: usr?.email || "",
        proveedorTelefono: usr?.telefono || "",
        coberturaEntrega: perfil?.coberturaEntrega || "",
        costoEnvio: perfil?.costoEnvio || 0,
        pedidoMinimo: perfil?.pedidoMinimo || 0,
        beneficios: perfil?.beneficios || [],
        productos: [],
      });
    }
    catMap.get(sid)!.productos.push({
      _id: p._id.toString(),
      nombre: p.nombre,
      precio: p.precio,
      unidad: p.unidad,
      descripcion: p.descripcion,
    });
  }

  const rawPesos: Record<string, string | undefined> = {
    precio: url.searchParams.get("precio") ?? undefined,
    envio: url.searchParams.get("envio") ?? undefined,
    pedido: url.searchParams.get("pedido") ?? undefined,
    beneficios: url.searchParams.get("beneficios") ?? undefined,
    cobertura: url.searchParams.get("cobertura") ?? undefined,
  };

  const categorias = Array.from(groupedByCategory.entries())
    .map(([nombre, suppliers]) => {
      const { proveedores } = calcularScoreProveedoresCategoria(
        Array.from(suppliers.values()),
        rawPesos
      );
      return { nombre, proveedores };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return { q, precioMin, precioMax, zona, orden, categorias };
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Buscar Productos - Proveedores App" }];
}

function Estrellas({ count }: { count: number }) {
  return (
    <span className="text-amber-500 whitespace-nowrap" title={`${count} / 5`}>
      {"★".repeat(count)}
      {"☆".repeat(5 - count)}
    </span>
  );
}

export default function Buscar({ loaderData }: Route.ComponentProps) {
  const { q, precioMin, precioMax, zona, orden, categorias } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPesos = {
    precio: searchParams.get("precio") ? Number(searchParams.get("precio")) : PESOS_DEFAULT.precio,
    envio: searchParams.get("envio") ? Number(searchParams.get("envio")) : PESOS_DEFAULT.envio,
    pedido: searchParams.get("pedido") ? Number(searchParams.get("pedido")) : PESOS_DEFAULT.pedido,
    beneficios: searchParams.get("beneficios") ? Number(searchParams.get("beneficios")) : PESOS_DEFAULT.beneficios,
    cobertura: searchParams.get("cobertura") ? Number(searchParams.get("cobertura")) : PESOS_DEFAULT.cobertura,
  };

  const totalProveedores = categorias.reduce((s, c) => s + c.proveedores.length, 0);
  const totalProductos = categorias.reduce(
    (s, c) => s + c.proveedores.reduce((ps, pv) => ps + pv.productos.length, 0),
    0
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-amber-900 mb-6">Buscar Productos</h2>

      <Form method="get" className="bg-white rounded-2xl p-6 shadow-md mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscá por nombre o categoría..."
            className="w-full sm:flex-1 px-4 py-3 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-base sm:text-lg"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-amber-700 text-white rounded-xl hover:bg-amber-800 transition font-medium"
          >
            Buscar
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <input
            type="number"
            name="precioMin"
            placeholder="Precio min"
            defaultValue={precioMin || ""}
            className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm sm:text-base"
          />
          <input
            type="number"
            name="precioMax"
            placeholder="Precio max"
            defaultValue={precioMax || ""}
            className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm sm:text-base"
          />
          <input
            type="text"
            name="zona"
            placeholder="Zona de entrega"
            defaultValue={zona}
            className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm sm:text-base"
          />
          <select
            name="orden"
            defaultValue={orden}
            className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm sm:text-base"
          >
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
          </select>
        </div>
      </Form>

      {categorias.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 sm:p-12 text-center shadow-md">
          <p className="text-amber-600 text-base sm:text-lg">
            {q
              ? `No se encontraron resultados para "${q}"`
              : "Usá el buscador para encontrar productos"}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <p className="text-amber-600 text-sm">
            {totalProveedores} proveedores · {totalProductos} productos
          </p>

          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-md mb-6">
            <h3 className="text-md font-semibold text-amber-800 mb-4">
              Ajustar ponderación
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {([
                ["precio", "Precio prom."],
                ["envio", "Costo envío"],
                ["pedido", "Pedido mín."],
                ["beneficios", "Beneficios"],
                ["cobertura", "Cobertura"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-amber-700 mb-1">
                    {label}: <span className="font-bold">{currentPesos[key]}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={currentPesos[key]}
                    onChange={(e) => {
                      const next = new URLSearchParams(searchParams);
                      next.set(key, String(e.target.value));
                      setSearchParams(next, { replace: true });
                    }}
                    className="w-full accent-amber-700"
                  />
                </div>
              ))}
            </div>
          </div>

          {categorias.map((cat) => (
            <div key={cat.nombre}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-bold text-amber-900">{cat.nombre}</h3>
                <span className="text-sm text-amber-500">
                  {cat.proveedores.length} proveedor{cat.proveedores.length !== 1 ? "es" : ""}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-2xl shadow-md overflow-hidden">
                  <thead className="bg-amber-800 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Puntaje</th>
                      <th className="px-4 py-3 text-left">Proveedor</th>
                      <th className="px-4 py-3 text-left">Precio prom.</th>
                      <th className="px-4 py-3 text-left">Cobertura</th>
                      <th className="px-4 py-3 text-left">Costo envío</th>
                      <th className="px-4 py-3 text-left">Pedido mín.</th>
                      <th className="px-4 py-3 text-left">Productos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.proveedores.map((pv: any, i: number) => {
                      const isBest = i === 0;
                      return (
                        <tr
                          key={pv.supplierId}
                          className={
                            isBest
                              ? "bg-green-50 border-b-2 border-green-300"
                              : i % 2 === 0
                                ? "bg-amber-50"
                                : "bg-white"
                          }
                        >
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-start gap-1">
                              <Estrellas count={pv.estrellas} />
                              <span className="text-xs font-semibold text-amber-700">
                                {pv.score}
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {pv.badges.map((b: string) => (
                                  <span
                                    key={b}
                                    className={`text-xs px-2 py-0.5 rounded-full border ${BADGE_COLORS[b] || "bg-gray-100 text-gray-600 border-gray-200"}`}
                                  >
                                    {b}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-amber-900">
                            <Link
                              to={`/dashboard/proveedor/${pv.supplierId}`}
                              className="hover:text-amber-600 hover:underline"
                            >
                              {pv.proveedorNombre}
                            </Link>
                            <div className="text-xs text-amber-500 mt-0.5">{pv.proveedorEmail}</div>
                          </td>
                          <td className="px-4 py-3 font-bold text-amber-800">
                            ${pv.precioPromedio}
                          </td>
                          <td className="px-4 py-3 text-amber-700">{pv.coberturaEntrega || "-"}</td>
                          <td className="px-4 py-3 text-amber-700">
                            {pv.costoEnvio > 0 ? `$${pv.costoEnvio}` : "Gratis"}
                          </td>
                          <td className="px-4 py-3 text-amber-700">
                            {pv.pedidoMinimo > 0 ? `$${pv.pedidoMinimo}` : "-"}
                          </td>
                          <td className="px-4 py-3 text-amber-700">
                            <details>
                              <summary className="cursor-pointer text-sm font-medium text-amber-800 hover:text-amber-600">
                                {pv.productos.length} producto{pv.productos.length !== 1 ? "s" : ""}
                              </summary>
                              <ul className="mt-2 space-y-1 text-sm">
                                {pv.productos.map((pr: any) => (
                                  <li key={pr._id} className="flex justify-between gap-4">
                                    <span>{pr.nombre}</span>
                                    <span className="font-semibold text-amber-800">${pr.precio} / {pr.unidad}</span>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
