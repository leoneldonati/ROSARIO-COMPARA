import { Link, redirect, useFetcher, useLoaderData } from "react-router";
import { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/dashboard.carrito";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import Cart from "~/lib/models/cart.server";
import Product from "~/lib/models/product.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import User from "~/lib/models/user.server";
import ClientProfile from "~/lib/models/client-profile.server";
import Order from "~/lib/models/order.server";
import { Button } from "~/components/Button";
import { Card } from "~/components/Card";
import { Spinner } from "~/components/Spinner";
import { ConfirmDialog } from "~/components/ConfirmDialog";
import { ShoppingCart, Trash2, ArrowLeft, AlertTriangle, ImageOff } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request, ["CLIENTE"]);
  await connectDB();

  const cart = await Cart.findOne({ clientId: user._id }).lean();
  if (!cart || !cart.items.length) {
    return { user, grupos: [], totalGeneral: 0, itemsCount: 0, proveedoresCount: 0 };
  }

  const productIds = cart.items.map((i: any) => i.productId);
  const productos = await Product.find({ _id: { $in: productIds } }).lean();
  const prodMap = new Map(productos.map((p: any) => [p._id.toString(), p]));

  const supplierIds = [...new Set(productos.map((p: any) => p.supplierId.toString()))];
  const perfiles = await SupplierProfile.find({ _id: { $in: supplierIds } }).lean();
  const perfilMap = new Map(perfiles.map((p: any) => [p._id.toString(), p]));
  const userIds = perfiles.map((p: any) => p.userId.toString());
  const usuarios = await User.find({ _id: { $in: userIds } }).select("nombre email telefono").lean();
  const usrMap = new Map(usuarios.map((u: any) => [u._id.toString(), u]));

  const gruposMap = new Map<string, any>();
  let itemsCount = 0;
  for (const item of cart.items) {
    const prod: any = prodMap.get(item.productId.toString());
    if (!prod) continue;
    const sid = prod.supplierId.toString();
    if (!gruposMap.has(sid)) {
      const perfil: any = perfilMap.get(sid);
      const usr: any = perfil ? usrMap.get(perfil.userId.toString()) : null;
      gruposMap.set(sid, {
        supplierId: sid,
        proveedorNombre: usr?.nombre || "Desconocido",
        proveedorEmail: usr?.email || "",
        items: [],
        subtotal: 0,
        costoEnvio: perfil?.costoEnvio || 0,
        pedidoMinimo: perfil?.pedidoMinimo || 0,
      });
    }
    const grupo = gruposMap.get(sid);
    const subtotal = prod.precio * item.cantidad;
    grupo.items.push({
      productId: prod._id.toString(),
      nombre: prod.nombre,
      precio: prod.precio,
      unidad: prod.unidad,
      cantidad: item.cantidad,
      subtotal,
      imagen: prod.imagen || "",
      stock: prod.stock,
    });
    grupo.subtotal += subtotal;
    itemsCount++;
  }

  const grupos = Array.from(gruposMap.values());
  const proveedoresCount = grupos.length;
  const totalGeneral = grupos.reduce((s: number, g: any) => s + g.subtotal + g.costoEnvio, 0);
  const totalSinEnvio = grupos.reduce((s: number, g: any) => s + g.subtotal, 0);

  return { user, grupos, totalGeneral, totalSinEnvio, itemsCount, proveedoresCount };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request, ["CLIENTE"]);
  await connectDB();
  const form = await request.formData();
  const _action = form.get("_action") as string;

  if (_action === "update") {
    const productId = form.get("productId") as string;
    const cantidad = Math.max(1, Number(form.get("cantidad")) || 1);
    await Cart.findOneAndUpdate(
      { clientId: user._id, "items.productId": productId },
      { $set: { "items.$.cantidad": cantidad, updatedAt: new Date() } }
    );
    return null;
  }

  if (_action === "remove") {
    const productId = form.get("productId") as string;
    await Cart.findOneAndUpdate(
      { clientId: user._id },
      { $pull: { items: { productId } }, $set: { updatedAt: new Date() } }
    );
    return redirect("/dashboard/carrito");
  }

  if (_action === "clear") {
    await Cart.deleteOne({ clientId: user._id });
    return redirect("/dashboard/carrito");
  }

  if (_action === "checkout") {
    const cart = await Cart.findOne({ clientId: user._id }).lean();
    if (!cart || !cart.items.length) {
      return { error: "El carrito está vacío" };
    }

    const cliente = await ClientProfile.findOne({ userId: user._id }).lean();
    const direccionEntrega = cliente
      ? {
          direccion: cliente.direccion || "",
          ciudad: cliente.ciudad || "",
          provincia: cliente.provincia || "",
          codigoPostal: cliente.codigoPostal || "",
        }
      : { direccion: "", ciudad: "", provincia: "", codigoPostal: "" };

    const productIds = cart.items.map((i: any) => i.productId);
    const productos = await Product.find({ _id: { $in: productIds }, stock: true }).lean();
    const prodMap = new Map(productos.map((p: any) => [p._id.toString(), p]));

    const gruposMap = new Map<string, any[]>();
    for (const item of cart.items) {
      const prod: any = prodMap.get(item.productId.toString());
      if (!prod) continue;
      const sid = prod.supplierId.toString();
      if (!gruposMap.has(sid)) gruposMap.set(sid, []);
      gruposMap.get(sid)!.push({
        productId: prod._id,
        nombre: prod.nombre,
        precio: prod.precio,
        unidad: prod.unidad,
        cantidad: item.cantidad,
        subtotal: prod.precio * item.cantidad,
      });
    }

    const supplierIds = [...gruposMap.keys()];
    const perfiles = await SupplierProfile.find({ _id: { $in: supplierIds } }).lean();
    const perfilMap = new Map(perfiles.map((p: any) => [p._id.toString(), p]));

    const orders = [];
    for (const [supplierId, items] of gruposMap.entries()) {
      const total = items.reduce((s, i) => s + i.subtotal, 0);
      const perfil: any = perfilMap.get(supplierId);
      if (perfil && perfil.pedidoMinimo > 0 && total < perfil.pedidoMinimo) {
        const usr = await User.findById(perfil.userId).select("nombre").lean();
        return { error: `El pedido para ${usr?.nombre || "el proveedor"} no alcanza el mínimo de $${perfil.pedidoMinimo}` };
      }
      orders.push({
        clientId: user._id,
        supplierId,
        items,
        total,
        direccionEntrega,
        estado: "pendiente",
        notas: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (orders.length === 0) {
      return { error: "No se pudieron crear pedidos. Verificá que los productos tengan stock disponible." };
    }

    await Order.insertMany(orders);
    await Cart.deleteOne({ clientId: user._id });

    return redirect("/dashboard/pedidos");
  }

  return null;
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Carrito - Proveedores App" }];
}

export default function Carrito({ loaderData }: Route.ComponentProps) {
  const { grupos, totalGeneral, totalSinEnvio, itemsCount, proveedoresCount } = loaderData;
  const checkoutFetcher = useFetcher();
  const clearFetcher = useFetcher();
  const checkoutLoading = checkoutFetcher.state !== "idle";
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasSinStock = grupos.some((g: any) =>
    g.items.some((i: any) => i.stock === false)
  );

  useEffect(() => {
    if (clearFetcher.state === "idle" && clearFetcher.data) {
      setToast("Carrito vaciado correctamente");
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 3000);
    }
  }, [clearFetcher.state, clearFetcher.data]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-100">Carrito de Compras</h2>
        <Link
          to="/dashboard/buscar"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Seguir comprando
        </Link>
      </div>

      {toast && (
        <div className="bg-green-50 dark:bg-green-900/50 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          {toast}
        </div>
      )}

      {checkoutFetcher.data?.error && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mb-6">
          {checkoutFetcher.data.error}
        </div>
      )}

      {grupos.length === 0 ? (
        <Card className="text-center py-12">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-2">Tu carrito está vacío</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-6">
            Explorá productos y agregalos para empezar a comparar
          </p>
          <Link
            to="/dashboard/buscar"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition bg-accent-600 text-white hover:bg-accent-700"
          >
            Buscar productos
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {itemsCount} producto{itemsCount !== 1 ? "s" : ""} de {proveedoresCount} proveedor{proveedoresCount !== 1 ? "es" : ""}
            </p>
            {hasSinStock && (
              <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> Algunos productos no tienen stock
              </span>
            )}
          </div>

          {grupos.map((grupo: any) => (
            <div key={grupo.supplierId} className="bg-primary-50 dark:bg-slate-800 rounded-lg overflow-hidden">
              <div className="bg-primary-800 dark:bg-primary-900 text-white px-6 py-4">
                <Link
                  to={`/dashboard/proveedor/${grupo.supplierId}`}
                  className="font-bold text-lg hover:text-primary-200 transition"
                >
                  {grupo.proveedorNombre}
                </Link>
                <div className="text-primary-200 text-sm">{grupo.proveedorEmail}</div>
              </div>
              <div className="p-6">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-500 dark:text-slate-400 border-b border-slate-300 dark:border-slate-600">
                      <th className="pb-2 font-medium">Producto</th>
                      <th className="pb-2 font-medium">Precio</th>
                      <th className="pb-2 font-medium">Cantidad</th>
                      <th className="pb-2 font-medium">Subtotal</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.items.map((item: any) => (
                      <ItemRow key={item.productId} item={item} />
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-4 pt-4 border-t border-slate-300 dark:border-slate-600">
                  <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <div>
                      Envío: {grupo.costoEnvio > 0 ? `$${grupo.costoEnvio}` : "Gratis"}
                    </div>
                    {grupo.pedidoMinimo > 0 && (
                      <div className={grupo.subtotal < grupo.pedidoMinimo ? "text-red-500 dark:text-red-400 font-medium" : "text-green-600 dark:text-green-400"}>
                        Pedido mínimo: ${grupo.pedidoMinimo}
                        {grupo.subtotal < grupo.pedidoMinimo ? " (no alcanzado)" : " ✓"}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Subtotal: ${grupo.subtotal}
                    </div>
                    {grupo.costoEnvio > 0 && (
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Envío: ${grupo.costoEnvio}
                      </div>
                    )}
                    <div className="text-lg font-bold text-primary-900 dark:text-primary-100">
                      Total: ${grupo.subtotal + grupo.costoEnvio}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-primary-800 dark:bg-primary-900 text-white rounded-lg p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                {totalSinEnvio !== totalGeneral && (
                  <div className="text-sm text-primary-200 mb-1">
                    Subtotal: ${totalSinEnvio} + Envíos
                  </div>
                )}
                <div className="text-xl font-bold">
                  Total general: ${totalGeneral}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setClearModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Vaciar
                </Button>
                <checkoutFetcher.Form method="post">
                  <input type="hidden" name="_action" value="checkout" />
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={checkoutLoading || hasSinStock}
                    className="px-8 py-3 text-lg"
                  >
                    {checkoutLoading ? <Spinner size={20} /> : null}
                    {checkoutLoading ? "Creando pedidos..." : "Confirmar Pedido"}
                  </Button>
                </checkoutFetcher.Form>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        onConfirm={() => {
          clearFetcher.submit({ _action: "clear" }, { method: "post" });
          setClearModalOpen(false);
        }}
        title="Vaciar carrito"
        message="¿Estás seguro de que querés eliminar todos los productos del carrito?"
        variant="danger"
        confirmLabel="Vaciar carrito"
      />
    </div>
  );
}

function ItemRow({ item }: { item: any }) {
  const updateFetcher = useFetcher({ key: `cart-upd-${item.productId}` });
  const removeFetcher = useFetcher({ key: `cart-rm-${item.productId}` });
  const outOfStock = !item.stock;
  const syncing = updateFetcher.state !== "idle" || removeFetcher.state !== "idle";

  return (
    <tr className={`border-b border-slate-200 dark:border-slate-700 ${outOfStock ? "bg-red-50 dark:bg-red-900/20" : ""}`}>
      <td className="py-3">
        <div className="flex items-center gap-3">
          {item.imagen ? (
            <img
              src={item.imagen}
              alt={item.nombre}
              className="w-12 h-12 rounded object-cover border border-slate-200 dark:border-slate-700 bg-white"
            />
          ) : (
            <div className="w-12 h-12 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <ImageOff className="w-5 h-5 text-slate-400" />
            </div>
          )}
          <div>
            <div className="font-medium text-primary-900 dark:text-primary-100">{item.nombre}</div>
            {outOfStock && (
              <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">
                <AlertTriangle className="w-3 h-3" /> Sin stock
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 text-slate-600 dark:text-slate-400">${item.precio} / {item.unidad}</td>
      <td className="py-3">
        <updateFetcher.Form method="post" className="flex items-center gap-1">
          <input type="hidden" name="_action" value="update" />
          <input type="hidden" name="productId" value={item.productId} />
          <input
            type="number"
            name="cantidad"
            min="1"
            defaultValue={item.cantidad}
            className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-lg text-center bg-white dark:bg-slate-800 dark:text-slate-100"
            onChange={(e) => {
              const form = e.currentTarget.form;
              if (form) updateFetcher.submit(new FormData(form), { method: "post" });
            }}
          />
          {updateFetcher.state !== "idle" && <Spinner size={16} />}
        </updateFetcher.Form>
      </td>
      <td className="py-3 font-semibold text-primary-800 dark:text-primary-200">${item.subtotal}</td>
      <td className="py-3">
        <removeFetcher.Form method="post">
          <input type="hidden" name="_action" value="remove" />
          <input type="hidden" name="productId" value={item.productId} />
          <button
            type="submit"
            disabled={removeFetcher.state !== "idle"}
            className="text-red-500 hover:text-red-700 text-sm font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {removeFetcher.state !== "idle" ? <Spinner size={16} /> : <Trash2 className="w-4 h-4" />}
            {syncing ? "" : "Eliminar"}
          </button>
        </removeFetcher.Form>
      </td>
    </tr>
  );
}
