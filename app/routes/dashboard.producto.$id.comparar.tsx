import { useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard.producto.$id.comparar";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import Product from "~/lib/models/product.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import User from "~/lib/models/user.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request, ["CLIENTE"]);
  await connectDB();

  const producto = await Product.findById(params.id).lean();
  if (!producto) throw new Error("Producto no encontrado");

  const mismoNombre = await Product.find({
    nombre: { $regex: new RegExp(`^${producto.nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    stock: true,
  })
    .sort({ precio: 1 })
    .lean();

  const supplierIds = [...new Set(mismoNombre.map((p) => p.supplierId.toString()))];
  const perfiles = await SupplierProfile.find({ _id: { $in: supplierIds }, activo: true }).lean();
  const perfilesMap = new Map(perfiles.map((p) => [p._id.toString(), p]));
  const userIds = perfiles.map((p) => p.userId.toString());
  const usuarios = await User.find({ _id: { $in: userIds } }).select("nombre email telefono").lean();
  const usuariosMap = new Map(usuarios.map((u) => [u._id.toString(), u]));

  const proveedores = mismoNombre.map((p) => {
    const perfil = perfilesMap.get(p.supplierId.toString());
    const usr = perfil ? usuariosMap.get(perfil.userId.toString()) : null;
    return {
      _id: p._id.toString(),
      nombre: p.nombre,
      precio: p.precio,
      unidad: p.unidad,
      descripcion: p.descripcion,
      proveedorNombre: usr?.nombre || "Desconocido",
      proveedorEmail: usr?.email || "",
      proveedorTelefono: usr?.telefono || "",
      coberturaEntrega: perfil?.coberturaEntrega || "",
      costoEnvio: perfil?.costoEnvio || 0,
      pedidoMinimo: perfil?.pedidoMinimo || 0,
      beneficios: perfil?.beneficios || [],
    };
  });

  return { producto: { nombre: producto.nombre }, proveedores };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `Comparar: ${(loaderData as any).producto.nombre} - Proveedores App` }];
}

export default function Comparar({ loaderData }: Route.ComponentProps) {
  const { producto, proveedores } = loaderData;

  return (
    <div>
      <h2 className="text-2xl font-bold text-amber-900 mb-2">
        Comparativa: {producto.nombre}
      </h2>
      <p className="text-amber-600 mb-6">
        {proveedores.length} proveedor{proveedores.length !== 1 ? "es" : ""} encontrado{proveedores.length !== 1 ? "s" : ""}
      </p>

      {proveedores.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-md">
          <p className="text-amber-600 text-lg">No hay proveedores disponibles para este producto.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-2xl shadow-md overflow-hidden">
            <thead className="bg-amber-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left">Proveedor</th>
                <th className="px-4 py-3 text-left">Precio</th>
                <th className="px-4 py-3 text-left">Unidad</th>
                <th className="px-4 py-3 text-left">Cobertura</th>
                <th className="px-4 py-3 text-left">Costo envío</th>
                <th className="px-4 py-3 text-left">Pedido mínimo</th>
                <th className="px-4 py-3 text-left">Beneficios</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((p: any, i: number) => (
                <tr key={p._id} className={i % 2 === 0 ? "bg-amber-50" : "bg-white"}>
                  <td className="px-4 py-3 font-medium text-amber-900">
                    {p.proveedorNombre}
                    <div className="text-xs text-amber-500 mt-0.5">{p.proveedorEmail}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-amber-800">${p.precio}</td>
                  <td className="px-4 py-3 text-amber-700">{p.unidad}</td>
                  <td className="px-4 py-3 text-amber-700">{p.coberturaEntrega || "-"}</td>
                  <td className="px-4 py-3 text-amber-700">
                    {p.costoEnvio > 0 ? `$${p.costoEnvio}` : "Gratis"}
                  </td>
                  <td className="px-4 py-3 text-amber-700">
                    {p.pedidoMinimo > 0 ? `$${p.pedidoMinimo}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-amber-700">
                    {p.beneficios?.length > 0
                      ? p.beneficios.map((b: string) => (
                          <span
                            key={b}
                            className="inline-block mr-1 mb-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs"
                          >
                            {b}
                          </span>
                        ))
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
