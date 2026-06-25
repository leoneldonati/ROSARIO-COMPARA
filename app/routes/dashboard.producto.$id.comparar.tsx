import { Link, useLoaderData, useSearchParams } from "react-router";
import type { Route } from "./+types/dashboard.producto.$id.comparar";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import Product from "~/lib/models/product.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import User from "~/lib/models/user.server";
import { calcularScoreProveedoresCategoria } from "~/lib/scoring.server";
import { PESOS_DEFAULT, BADGE_COLORS } from "~/lib/scoring.shared";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request, ["CLIENTE"]);
  await connectDB();

  const producto = await Product.findById(params.id).lean();
  if (!producto) throw new Error("Producto no encontrado");

  const categoria = producto.categoria;
  if (!categoria) {
    return {
      producto: { nombre: producto.nombre, categoria: "" },
      categoria: "",
      proveedores: [],
      pesos: PESOS_DEFAULT,
    };
  }

  const productos = await Product.find({
    categoria: { $regex: new RegExp(`^${categoria.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    stock: true,
  })
    .sort({ precio: 1 })
    .lean();

  const supplierIds = [...new Set(productos.map((p) => p.supplierId.toString()))];
  const perfiles = await SupplierProfile.find({ _id: { $in: supplierIds }, activo: true }).lean();
  const perfilesMap = new Map(perfiles.map((p) => [p._id.toString(), p]));
  const userIds = perfiles.map((p) => p.userId.toString());
  const usuarios = await User.find({ _id: { $in: userIds } }).select("nombre email telefono").lean();
  const usuariosMap = new Map(usuarios.map((u) => [u._id.toString(), u]));

  const grouped = new Map<string, any>();
  for (const p of productos) {
    const sid = p.supplierId.toString();
    if (!grouped.has(sid)) {
      const perfil = perfilesMap.get(sid);
      const usr = perfil ? usuariosMap.get(perfil.userId.toString()) : null;
      grouped.set(sid, {
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
    grouped.get(sid)!.productos.push({
      _id: p._id.toString(),
      nombre: p.nombre,
      precio: p.precio,
      unidad: p.unidad,
      descripcion: p.descripcion,
    });
  }

  const url = new URL(request.url);
  const rawPesos: Record<string, string | undefined> = {
    precio: url.searchParams.get("precio") ?? undefined,
    envio: url.searchParams.get("envio") ?? undefined,
    pedido: url.searchParams.get("pedido") ?? undefined,
    beneficios: url.searchParams.get("beneficios") ?? undefined,
    cobertura: url.searchParams.get("cobertura") ?? undefined,
  };

  const { proveedores, pesos } = calcularScoreProveedoresCategoria(
    Array.from(grouped.values()),
    rawPesos
  );

  return {
    producto: { nombre: producto.nombre, categoria },
    categoria,
    proveedores,
    pesos,
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `Comparar: ${(loaderData as any).producto.nombre} - Proveedores App` }];
}

function Estrellas({ count }: { count: number }) {
  return (
    <span className="text-amber-500 whitespace-nowrap" title={`${count} / 5`}>
      {"★".repeat(count)}
      {"☆".repeat(5 - count)}
    </span>
  );
}

export default function Comparar({ loaderData }: Route.ComponentProps) {
  const { producto, categoria, proveedores, pesos } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const handleSlider = (key: string, value: number) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, String(value));
    setSearchParams(next, { replace: true });
  };

  const resetPesos = () => {
    setSearchParams({}, { replace: true });
  };

  const currentPesos = {
    precio: searchParams.get("precio") ? Number(searchParams.get("precio")) : PESOS_DEFAULT.precio,
    envio: searchParams.get("envio") ? Number(searchParams.get("envio")) : PESOS_DEFAULT.envio,
    pedido: searchParams.get("pedido") ? Number(searchParams.get("pedido")) : PESOS_DEFAULT.pedido,
    beneficios: searchParams.get("beneficios") ? Number(searchParams.get("beneficios")) : PESOS_DEFAULT.beneficios,
    cobertura: searchParams.get("cobertura") ? Number(searchParams.get("cobertura")) : PESOS_DEFAULT.cobertura,
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-amber-900 mb-2">
        Comparativa: {producto.nombre}
      </h2>
      {categoria && (
        <p className="text-amber-500 mb-1">
          Categoría: <span className="font-semibold">{categoria}</span>
        </p>
      )}
      <p className="text-amber-600 mb-6">
        {proveedores.length} proveedor{proveedores.length !== 1 ? "es" : ""} encontrado{proveedores.length !== 1 ? "s" : ""}
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
                onChange={(e) => handleSlider(key, Number(e.target.value))}
                className="w-full accent-amber-700"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={resetPesos}
            className="px-4 py-2 text-sm rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition"
          >
            Restablecer
          </button>
        </div>
      </div>

      {proveedores.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 sm:p-12 text-center shadow-md">
          <p className="text-amber-600 text-base sm:text-lg">No hay proveedores disponibles para esta categoría.</p>
        </div>
      ) : (
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
              {proveedores.map((pv: any, i: number) => {
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
      )}
    </div>
  );
}
