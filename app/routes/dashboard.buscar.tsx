import { Form, Link, useFetcher, useLoaderData, useSearchParams } from "react-router";
import { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/dashboard.buscar";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import Product from "~/lib/models/product.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import User from "~/lib/models/user.server";
import ClientProfile from "~/lib/models/client-profile.server";
import Cart from "~/lib/models/cart.server";
import { calcularScoreProveedoresCategoria } from "~/lib/scoring.server";
import type { SupplierCategoryInput } from "~/lib/scoring.server";
import type { ProveedorCategoriaScore } from "~/lib/scoring.shared";
import { PESOS_DEFAULT, BADGE_COLORS } from "~/lib/scoring.shared";
import { escapeRegex } from "~/lib/utils";
import { Button } from "~/components/Button";
import { Stars } from "~/components/Stars";
import { ShoppingCart, BarChart3, Star } from "lucide-react";
import { Spinner } from "~/components/Spinner";

export async function loader({ request }: Route.LoaderArgs) {
  const currentUser = await requireUser(request, ["CLIENTE"]);
  await connectDB();

  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const precioMin = Number(url.searchParams.get("precioMin")) || 0;
  const precioMax = Number(url.searchParams.get("precioMax")) || 0;
  const zona = url.searchParams.get("zona") || "";
  const orden = url.searchParams.get("orden") || "precio_asc";
  const proveedorFiltro = url.searchParams.get("proveedor") || "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const PAGE_SIZE = 50;

  const filter: Record<string, unknown> = { stock: true };

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ nombre: regex }, { categoria: regex }];
  }
  if (precioMin > 0) filter.precio = { $gte: precioMin };
  if (precioMax > 0) {
    const existing = filter.precio as Record<string, unknown> | undefined;
    filter.precio = { ...(existing || {}), $lte: precioMax };
  }

  const sortOrder = orden === "precio_asc" ? 1 : -1;
  let productos: any[] = await Product.find(filter).sort({ precio: sortOrder }).lean();

  const profile = await ClientProfile.findOne({ userId: currentUser._id }).lean();
  const favoritos: string[] = profile
    ? profile.favoritos.map((f: any) => f.toString())
    : [];

  if (!productos.length) {
    return {
      q, precioMin, precioMax, zona, orden, proveedorFiltro, page,
      totalPages: 0, totalCount: 0, categorias: [], favoritos, proveedoresDisponibles: [],
    };
  }

  const supplierIds = [...new Set(productos.map((p) => p.supplierId.toString()))];
  const perfiles = await SupplierProfile.find({ _id: { $in: supplierIds }, activo: true }).lean();
  const perfilesMap = new Map(perfiles.map((p) => [p._id.toString(), p]));
  const userIds = perfiles.map((p) => p.userId.toString());
  const usuarios = await User.find({ _id: { $in: userIds } }).select("nombre email telefono").lean();
  const usuariosMap = new Map(usuarios.map((u) => [u._id.toString(), u]));

  const proveedoresDisponibles = perfiles
    .map((p) => {
      const usr = usuariosMap.get(p.userId.toString());
      return { id: p._id.toString(), nombre: usr?.nombre || "Desconocido" };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  if (proveedorFiltro) {
    productos = productos.filter((p) => p.supplierId.toString() === proveedorFiltro);
  }

  if (zona) {
    const zonaLower = zona.toLowerCase();
    productos = productos.filter((p) => {
      const perfil = perfilesMap.get(p.supplierId.toString());
      return perfil && perfil.coberturaEntrega?.toLowerCase().includes(zonaLower);
    });
  }

  const totalCount = productos.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  productos = productos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const groupedByCategory = new Map<string, Map<string, SupplierCategoryInput>>();
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
    const entry = catMap.get(sid);
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

  return {
    q, precioMin, precioMax, zona, orden, proveedorFiltro, page,
    totalPages, totalCount, categorias, favoritos, proveedoresDisponibles,
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

  if (_action === "toggle-favorite") {
    const productId = form.get("productId") as string;
    const profile = await ClientProfile.findOne({ userId: user._id });
    if (profile) {
      const idx = profile.favoritos.findIndex((f: any) => f.toString() === productId);
      if (idx >= 0) {
        profile.favoritos.splice(idx, 1);
      } else {
        profile.favoritos.push(productId as any);
      }
      await profile.save();
    }
    return { ok: true, action: "toggle-favorite" };
  }

  return null;
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Buscar Productos - Proveedores App" }];
}

export default function Buscar({ loaderData }: Route.ComponentProps) {
  const {
    q, precioMin, precioMax, zona, orden, proveedorFiltro, page,
    totalPages, totalCount, categorias, favoritos, proveedoresDisponibles,
  } = loaderData;
  const favSet = new Set(favoritos);
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher();
  const lastActionRef = useRef<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (fetcher.state === "submitting") {
      lastActionRef.current = fetcher.formData?.get("_action") as string;
    }
    if (fetcher.state === "idle" && lastActionRef.current) {
      const action = lastActionRef.current;
      lastActionRef.current = null;
      if (action === "add-cart") setToast("✓ Agregado al carrito");
      else if (action === "toggle-favorite") setToast("✓ Favorito actualizado");

      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 2000);
    }
  }, [fetcher.state]);

  const submittingProduct = fetcher.state !== "idle"
    ? fetcher.formData?.get("productId") as string
    : null;

  const currentPesos = {
    precio: searchParams.get("precio") ? Number(searchParams.get("precio")) : PESOS_DEFAULT.precio,
    envio: searchParams.get("envio") ? Number(searchParams.get("envio")) : PESOS_DEFAULT.envio,
    pedido: searchParams.get("pedido") ? Number(searchParams.get("pedido")) : PESOS_DEFAULT.pedido,
    beneficios: searchParams.get("beneficios") ? Number(searchParams.get("beneficios")) : PESOS_DEFAULT.beneficios,
    cobertura: searchParams.get("cobertura") ? Number(searchParams.get("cobertura")) : PESOS_DEFAULT.cobertura,
  };

  const totalProveedores = categorias.reduce((s, c) => s + c.proveedores.length, 0);
  const totalProductosMuestra = categorias.reduce(
    (s, c) => s + c.proveedores.reduce((ps, pv) => ps + pv.productos.length, 0),
    0
  );

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next, { replace: true });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-100 mb-6">Buscar Productos</h2>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-pulse">
          {toast}
        </div>
      )}

      <Form method="get" className="bg-primary-50 dark:bg-slate-800 rounded-lg p-6 mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscá por nombre o categoría..."
            className="w-full sm:flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100 text-base sm:text-lg transition"
          />
          <Button type="submit" className="px-6 py-3">Buscar</Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <input
            type="number"
            name="precioMin"
            placeholder="Precio min"
            defaultValue={precioMin || ""}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100 text-sm sm:text-base transition"
          />
          <input
            type="number"
            name="precioMax"
            placeholder="Precio max"
            defaultValue={precioMax || ""}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100 text-sm sm:text-base transition"
          />
          <input
            type="text"
            name="zona"
            placeholder="Zona de entrega"
            defaultValue={zona}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100 text-sm sm:text-base transition"
          />
          <select
            name="proveedor"
            defaultValue={proveedorFiltro}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100 text-sm sm:text-base transition"
          >
            <option value="">Todos los proveedores</option>
            {proveedoresDisponibles.map((sp) => (
              <option key={sp.id} value={sp.id}>{sp.nombre}</option>
            ))}
          </select>
          <select
            name="orden"
            defaultValue={orden}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100 text-sm sm:text-base transition"
          >
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
          </select>
        </div>
      </Form>

      {categorias.length === 0 ? (
        <div className="bg-primary-50 dark:bg-slate-800 rounded-lg p-6 sm:p-12 text-center">
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">
            {q
              ? `No se encontraron resultados para "${q}"`
              : "Usá el buscador para encontrar productos"}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {totalProveedores} proveedores · {totalProductosMuestra} productos
            {totalCount > totalProductosMuestra && (
              <span className="ml-1">(mostrando {totalProductosMuestra} de {totalCount})</span>
            )}
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
                    onChange={(e) => setParam(key, e.target.value)}
                    className="w-full accent-primary-600"
                  />
                </div>
              ))}
            </div>
          </div>

          {categorias.map((cat) => (
            <div key={cat.nombre}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-bold text-primary-900 dark:text-primary-100">{cat.nombre}</h3>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {cat.proveedores.length} proveedor{cat.proveedores.length !== 1 ? "es" : ""}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full bg-primary-50 dark:bg-slate-800 rounded-lg overflow-hidden">
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
                    {cat.proveedores.map((pv: ProveedorCategoriaScore, i: number) => {
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
                                      <Link
                                        to={`/dashboard/producto/${pr._id}/comparar`}
                                        className="text-xs bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 px-2 py-1 rounded hover:bg-primary-200 dark:hover:bg-primary-800 transition font-medium flex items-center gap-1"
                                      >
                                        <BarChart3 className="w-3 h-3" /> Comparar
                                      </Link>
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
                                          className="text-xs bg-accent-600 text-white px-2 py-1 rounded hover:bg-accent-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                        >
                                          {isSubmitting ? <Spinner size={12} /> : <ShoppingCart className="w-3 h-3" />}
                                          {isSubmitting ? "" : "+ Carrito"}
                                        </button>
                                      </fetcher.Form>
                                      <fetcher.Form method="post">
                                        <input type="hidden" name="_action" value="toggle-favorite" />
                                        <input type="hidden" name="productId" value={pr._id} />
                                        <button
                                          type="submit"
                                          disabled={isSubmitting}
                                          className="text-accent-500 hover:scale-110 transition cursor-pointer disabled:opacity-50"
                                        >
                                          {isSubmitting ? (
                                            <Spinner size={14} />
                                          ) : (
                                            <Star className={`w-4 h-4 ${favSet.has(pr._id) ? "fill-current" : ""}`} />
                                          )}
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
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setParam("page", String(page - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-50 dark:hover:bg-primary-950 transition bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-slate-400">...</span>
                    )}
                    <button
                      onClick={() => setParam("page", String(p))}
                      className={`px-3 py-1.5 text-sm rounded-lg transition font-medium ${
                        p === page
                          ? "bg-primary-600 text-white"
                          : "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-950"
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setParam("page", String(page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-50 dark:hover:bg-primary-950 transition bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
