import { Link, useFetcher, useLoaderData } from "react-router";
import { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/dashboard.proveedor.$id";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import User from "~/lib/models/user.server";
import Product from "~/lib/models/product.server";
import Cart from "~/lib/models/cart.server";
import { Badge } from "~/components/Badge";
import { Spinner } from "~/components/Spinner";
import { Mail, Phone, BarChart3, ShoppingCart } from "lucide-react";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request, ["CLIENTE"]);
  await connectDB();

  const perfil = await SupplierProfile.findById(params.id).lean();
  if (!perfil) throw new Response("Proveedor no encontrado", { status: 404 });

  const usuario = await User.findById(perfil.userId).select("nombre email telefono").lean();
  if (!usuario) throw new Response("Usuario no encontrado", { status: 404 });

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

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request, ["CLIENTE"]);
  await connectDB();
  const form = await request.formData();
  const _action = form.get("_action") as string;

  if (_action === "add-cart") {
    const productId = form.get("productId") as string;
    const cantidad = Math.max(1, Number(form.get("cantidad")) || 1);
    await Cart.findOneAndUpdate(
      { clientId: user._id },
      { $pull: { items: { productId } } }
    );
    await Cart.findOneAndUpdate(
      { clientId: user._id },
      { $push: { items: { productId, cantidad } }, $set: { updatedAt: new Date() } },
      { upsert: true }
    );
    return { ok: true, action: "add-cart" };
  }

  return null;
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData.usuario.nombre} - Proveedores App` }];
}

export default function ProveedorPerfil({ loaderData }: Route.ComponentProps) {
  const { perfil, usuario, categorias } = loaderData;
  const fetcher = useFetcher();
  const submittingProduct = fetcher.state !== "idle"
    ? fetcher.formData?.get("productId") as string
    : null;
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      setToast("✓ Agregado al carrito");
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 2000);
    }
  }, [fetcher.state, fetcher.data]);

  const totalProductos = categorias.reduce((s: number, c) => s + c.productos.length, 0);

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-pulse">
          {toast}
        </div>
      )}

      <div className="bg-primary-50 dark:bg-slate-800 rounded-lg p-6 mb-8">
        <div className="flex items-start gap-6">
          {perfil.logo && (
            <img
              src={perfil.logo}
              alt={usuario.nombre}
              className="w-24 h-24 rounded-lg object-cover border border-slate-300 dark:border-slate-600"
            />
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-100 mb-1">{usuario.nombre}</h2>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400 mt-2">
              {usuario.email && (
                <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {usuario.email}</span>
              )}
              {usuario.telefono && (
                <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {usuario.telefono}</span>
              )}
            </div>
          </div>
        </div>

        {perfil.descripcion && (
          <p className="text-slate-700 dark:text-slate-300 mt-4 leading-relaxed">{perfil.descripcion}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-primary-50 dark:bg-slate-800 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-primary-800 dark:text-primary-200 mb-2">Cobertura de entrega</h4>
          <p className="text-slate-700 dark:text-slate-300">{perfil.coberturaEntrega || "No especificada"}</p>
        </div>
        <div className="bg-primary-50 dark:bg-slate-800 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-primary-800 dark:text-primary-200 mb-2">Costo de envío</h4>
          <p className="text-slate-700 dark:text-slate-300">
            {perfil.costoEnvio > 0 ? `$${perfil.costoEnvio}` : "Gratis"}
          </p>
        </div>
        <div className="bg-primary-50 dark:bg-slate-800 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-primary-800 dark:text-primary-200 mb-2">Pedido mínimo</h4>
          <p className="text-slate-700 dark:text-slate-300">
            {perfil.pedidoMinimo > 0 ? `$${perfil.pedidoMinimo}` : "Sin mínimo"}
          </p>
        </div>
      </div>

      {perfil.beneficios.length > 0 && (
        <div className="bg-primary-50 dark:bg-slate-800 rounded-lg p-5 mb-8">
          <h4 className="text-sm font-semibold text-primary-800 dark:text-primary-200 mb-3">Beneficios</h4>
          <div className="flex flex-wrap gap-2">
            {perfil.beneficios.map((b: string) => (
              <Badge key={b} color="primary">{b}</Badge>
            ))}
          </div>
        </div>
      )}

      <h3 className="text-xl font-bold text-primary-900 dark:text-primary-100 mb-6">
        Productos ({totalProductos})
      </h3>

      <div className="space-y-6">
        {categorias.map((cat) => (
          <div key={cat.nombre}>
            <h4 className="text-lg font-semibold text-primary-800 dark:text-primary-200 mb-3">{cat.nombre}</h4>
            <div className="overflow-x-auto">
              <table className="w-full bg-primary-50 dark:bg-slate-800 rounded-lg overflow-hidden" aria-label={`Productos de ${cat.nombre}`}>
                <caption className="sr-only">Lista de productos en la categoría {cat.nombre}</caption>
                <thead className="bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Producto</th>
                    <th className="px-4 py-3 text-left font-medium">Precio</th>
                    <th className="px-4 py-3 text-left font-medium">Unidad</th>
                    <th className="px-4 py-3 text-left font-medium">Descripción</th>
                    <th className="px-4 py-3 text-left font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.productos.map((p, i) => {
                    const isSubmitting = submittingProduct === p._id;
                    return (
                      <tr
                        key={p._id}
                        className={i % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-primary-50 dark:bg-slate-800/50"}
                      >
                        <td className="px-4 py-3 font-medium text-primary-900 dark:text-primary-100">{p.nombre}</td>
                        <td className="px-4 py-3 font-bold text-primary-800 dark:text-primary-200">${p.precio}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.unidad}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">{p.descripcion || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/dashboard/producto/${p._id}/comparar`}
                              className="inline-flex items-center gap-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 px-2 py-1 rounded hover:bg-primary-200 dark:hover:bg-primary-800 transition font-medium"
                            >
                              <BarChart3 className="w-3 h-3" /> Comparar
                            </Link>
                            <fetcher.Form method="post" className="flex items-center gap-1">
                              <input type="hidden" name="_action" value="add-cart" />
                              <input type="hidden" name="productId" value={p._id} />
                              <input
                                type="number"
                                name="cantidad"
                                min="1"
                                defaultValue="1"
                                className="w-12 px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded text-xs text-center bg-white dark:bg-slate-800 dark:text-slate-100"
                              />
                              <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-1 text-xs bg-accent-600 text-white px-2 py-1 rounded hover:bg-accent-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isSubmitting ? <Spinner size={12} /> : <ShoppingCart className="w-3 h-3" />}
                                {isSubmitting ? "" : "+ Carrito"}
                              </button>
                            </fetcher.Form>
                          </div>
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

      {categorias.length === 0 && (
        <div className="bg-primary-50 dark:bg-slate-800 rounded-lg p-6 sm:p-12 text-center">
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">Este proveedor no tiene productos disponibles.</p>
        </div>
      )}
    </div>
  );
}
