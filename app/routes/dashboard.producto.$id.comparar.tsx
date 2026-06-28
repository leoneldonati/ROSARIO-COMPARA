import { Link, useFetcher, useLoaderData, useSearchParams } from "react-router";
import { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/dashboard.producto.$id.comparar";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import Product from "~/lib/models/product.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import User from "~/lib/models/user.server";
import Cart from "~/lib/models/cart.server";
import { calcularScoreProveedoresCategoria } from "~/lib/scoring.server";
import type { SupplierCategoryInput } from "~/lib/scoring.server";
import type { ProveedorCategoriaScore } from "~/lib/scoring.shared";
import { PESOS_DEFAULT, BADGE_COLORS } from "~/lib/scoring.shared";
import { escapeRegex } from "~/lib/utils";
import { Button } from "~/components/Button";
import { Spinner } from "~/components/Spinner";
import { Stars } from "~/components/Stars";
import { ShoppingCart } from "lucide-react";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request, ["CLIENTE"]);
  await connectDB();

  if (!params.id) throw new Response("ID de producto no especificado", { status: 400 });

  const producto = await Product.findById(params.id).lean();
  if (!producto) throw new Response("Producto no encontrado", { status: 404 });

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
    categoria: { $regex: new RegExp(`^${escapeRegex(categoria)}$`, "i") },
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

  const grouped = new Map<string, SupplierCategoryInput>();
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
    const entry = grouped.get(sid);
    if (entry) {
      entry.productos.push({
        _id: p._id.toString(),
        nombre: p.nombre,
        precio: p.precio,
        unidad: p.unidad,
        descripcion: p.descripcion,
      });
    }
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
  return [{ title: `Comparar: ${loaderData.producto.nombre} - Proveedores App` }];
}

export default function Comparar({ loaderData }: Route.ComponentProps) {
  const { producto, categoria, proveedores, pesos } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
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
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-pulse">
          {toast}
        </div>
      )}

      <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-100 mb-2">
        Comparativa: {producto.nombre}
      </h2>
      {categoria && (
        <p className="text-slate-500 dark:text-slate-400 mb-1">
          Categoría: <span className="font-semibold text-primary-800 dark:text-primary-200">{categoria}</span>
        </p>
      )}
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        {proveedores.length} proveedor{proveedores.length !== 1 ? "es" : ""} encontrado{proveedores.length !== 1 ? "s" : ""}
      </p>

      <div className="bg-primary-50 dark:bg-slate-800 rounded-lg p-4 sm:p-6 mb-6">
        <h3 className="text-md font-semibold text-primary-800 dark:text-primary-200 mb-4">
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {label}: <span className="font-bold text-primary-600 dark:text-primary-400">{currentPesos[key]}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={currentPesos[key]}
                onChange={(e) => handleSlider(key, Number(e.target.value))}
                className="w-full accent-primary-600"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <Button variant="secondary" onClick={resetPesos}>Restablecer</Button>
        </div>
      </div>

      {proveedores.length === 0 ? (
        <div className="bg-primary-50 dark:bg-slate-800 rounded-lg p-6 sm:p-12 text-center">
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">No hay proveedores disponibles para esta categoría.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-primary-50 dark:bg-slate-800 rounded-lg overflow-hidden" aria-label="Comparativa de proveedores">
            <caption className="sr-only">Comparación de precios y beneficios entre proveedores para {producto.nombre}</caption>
            <thead className="bg-primary-800 dark:bg-primary-900 text-white">
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
              {proveedores.map((pv: ProveedorCategoriaScore, i: number) => {
                const isBest = i === 0;
                return (
                  <tr
                    key={pv.supplierId}
                    className={
                      isBest
                        ? "bg-primary-100 dark:bg-primary-900/50 border-b-2 border-primary-300 dark:border-primary-700"
                        : i % 2 === 0
                          ? "bg-primary-50 dark:bg-slate-800"
                          : "bg-white dark:bg-slate-800/50"
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <Stars count={pv.estrellas} />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {pv.score}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pv.badges.map((b: string) => (
                            <span
                              key={b}
                              className={`text-xs px-2 py-0.5 rounded-full border ${BADGE_COLORS[b] || "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"}`}
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-primary-900 dark:text-primary-100">
                      <Link
                        to={`/dashboard/proveedor/${pv.supplierId}`}
                        className="hover:text-primary-600 dark:hover:text-primary-400 hover:underline"
                      >
                        {pv.proveedorNombre}
                      </Link>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{pv.proveedorEmail}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary-800 dark:text-primary-200">
                      ${pv.precioPromedio}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{pv.coberturaEntrega || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {pv.costoEnvio > 0 ? `$${pv.costoEnvio}` : "Gratis"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {pv.pedidoMinimo > 0 ? `$${pv.pedidoMinimo}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      <details>
                        <summary className="cursor-pointer text-sm font-medium text-primary-800 dark:text-primary-200 hover:text-primary-600 dark:hover:text-primary-400">
                          {pv.productos.length} producto{pv.productos.length !== 1 ? "s" : ""}
                        </summary>
                        <ul className="mt-2 space-y-2 text-sm">
                          {pv.productos.map((pr) => {
                            const isSubmitting = submittingProduct === pr._id;
                            return (
                              <li key={pr._id} className="flex flex-wrap items-center gap-2">
                                <span className="flex-1 min-w-[120px]">{pr.nombre}</span>
                                <span className="font-semibold text-primary-800 dark:text-primary-200">${pr.precio} / {pr.unidad}</span>
                                <fetcher.Form method="post" className="flex items-center gap-1">
                                  <input type="hidden" name="_action" value="add-cart" />
                                  <input type="hidden" name="productId" value={pr._id} />
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
                              </li>
                            );
                          })}
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
