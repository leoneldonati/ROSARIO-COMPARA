import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard.proveedor.$id";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import User from "~/lib/models/user.server";
import Product from "~/lib/models/product.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request, ["CLIENTE"]);
  await connectDB();

  const perfil = await SupplierProfile.findById(params.id).lean();
  if (!perfil) throw new Error("Proveedor no encontrado");

  const usuario = await User.findById(perfil.userId).select("nombre email telefono").lean();
  if (!usuario) throw new Error("Usuario no encontrado");

  const productos = await Product.find({ supplierId: perfil._id, stock: true })
    .sort({ categoria: 1, precio: 1 })
    .lean();

  const grouped = new Map<string, typeof productos>();
  for (const p of productos) {
    const cat = p.categoria || "Sin categoría";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(p);
  }

  return {
    perfil: {
      descripcion: perfil.descripcion,
      logo: perfil.logo,
      coberturaEntrega: perfil.coberturaEntrega,
      costoEnvio: perfil.costoEnvio,
      pedidoMinimo: perfil.pedidoMinimo,
      beneficios: perfil.beneficios,
    },
    usuario: {
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
    },
    categorias: Array.from(grouped.entries()).map(([nombre, prods]) => ({
      nombre,
      productos: prods.map((p) => ({
        _id: p._id.toString(),
        nombre: p.nombre,
        precio: p.precio,
        unidad: p.unidad,
        descripcion: p.descripcion,
        imagen: p.imagen,
      })),
    })),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${(loaderData as any).usuario.nombre} - Proveedores App` }];
}

export default function ProveedorPerfil({ loaderData }: Route.ComponentProps) {
  const { perfil, usuario, categorias } = loaderData;

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <div className="flex items-start gap-6">
          {perfil.logo && (
            <img
              src={perfil.logo}
              alt={usuario.nombre}
              className="w-24 h-24 rounded-xl object-cover border border-amber-200"
            />
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-amber-900 mb-1">{usuario.nombre}</h2>
            <div className="flex flex-wrap gap-4 text-sm text-amber-600 mt-2">
              {usuario.email && (
                <span className="flex items-center gap-1">📧 {usuario.email}</span>
              )}
              {usuario.telefono && (
                <span className="flex items-center gap-1">📞 {usuario.telefono}</span>
              )}
            </div>
          </div>
        </div>

        {perfil.descripcion && (
          <p className="text-amber-700 mt-4 leading-relaxed">{perfil.descripcion}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h4 className="text-sm font-semibold text-amber-800 mb-2">Cobertura de entrega</h4>
          <p className="text-amber-700">{perfil.coberturaEntrega || "No especificada"}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h4 className="text-sm font-semibold text-amber-800 mb-2">Costo de envío</h4>
          <p className="text-amber-700">
            {perfil.costoEnvio > 0 ? `$${perfil.costoEnvio}` : "Gratis"}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h4 className="text-sm font-semibold text-amber-800 mb-2">Pedido mínimo</h4>
          <p className="text-amber-700">
            {perfil.pedidoMinimo > 0 ? `$${perfil.pedidoMinimo}` : "Sin mínimo"}
          </p>
        </div>
      </div>

      {perfil.beneficios.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-5 mb-8">
          <h4 className="text-sm font-semibold text-amber-800 mb-3">Beneficios</h4>
          <div className="flex flex-wrap gap-2">
            {perfil.beneficios.map((b: string) => (
              <span
                key={b}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      )}

      <h3 className="text-xl font-bold text-amber-900 mb-6">
        Productos ({categorias.reduce((s: number, c: any) => s + c.productos.length, 0)})
      </h3>

      <div className="space-y-6">
        {categorias.map((cat: any) => (
          <div key={cat.nombre}>
            <h4 className="text-lg font-semibold text-amber-800 mb-3">{cat.nombre}</h4>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-2xl shadow-md overflow-hidden">
                <thead className="bg-amber-100 text-amber-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Producto</th>
                    <th className="px-4 py-3 text-left font-medium">Precio</th>
                    <th className="px-4 py-3 text-left font-medium">Unidad</th>
                    <th className="px-4 py-3 text-left font-medium">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.productos.map((p: any, i: number) => (
                    <tr
                      key={p._id}
                      className={i % 2 === 0 ? "bg-white" : "bg-amber-50"}
                    >
                      <td className="px-4 py-3 font-medium text-amber-900">{p.nombre}</td>
                      <td className="px-4 py-3 font-bold text-amber-800">${p.precio}</td>
                      <td className="px-4 py-3 text-amber-700">{p.unidad}</td>
                      <td className="px-4 py-3 text-amber-600 text-sm">{p.descripcion || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {categorias.length === 0 && (
        <div className="bg-white rounded-2xl p-6 sm:p-12 text-center shadow-md">
          <p className="text-amber-600 text-base sm:text-lg">Este proveedor no tiene productos disponibles.</p>
        </div>
      )}
    </div>
  );
}
