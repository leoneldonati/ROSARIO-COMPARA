import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard.carrito";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import Cart from "~/lib/models/cart.server";
import Product from "~/lib/models/product.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import User from "~/lib/models/user.server";
import ClientProfile from "~/lib/models/client-profile.server";
import Order from "~/lib/models/order.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request, ["CLIENTE"]);
  await connectDB();

  const cart = await Cart.findOne({ clientId: user._id }).lean();
  if (!cart || !cart.items.length) {
    return { user, grupos: [], totalGeneral: 0 };
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
    });
    grupo.subtotal += subtotal;
  }

  const grupos = Array.from(gruposMap.values());
  const totalGeneral = grupos.reduce((s: number, g: any) => s + g.subtotal, 0);

  return { user, grupos, totalGeneral };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request, ["CLIENTE"]);
  await connectDB();
  const form = await request.formData();
  const _action = form.get("_action") as string;

  if (_action === "add") {
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
    return null;
  }

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
    return null;
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

    return { success: true, cantidad: orders.length };
  }

  return null;
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Carrito - Proveedores App" }];
}

export default function Carrito({ loaderData, actionData }: Route.ComponentProps) {
  const { grupos, totalGeneral } = loaderData;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-amber-900">Carrito de Compras</h2>
      </div>

      {actionData?.success && (
        <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded-xl mb-6">
          ¡Pedido{actionData.cantidad > 1 ? "s" : ""} creado{actionData.cantidad > 1 ? "s" : ""} correctamente!
          <Link to="/dashboard/pedidos" className="ml-2 underline font-medium">
            Ver mis pedidos
          </Link>
        </div>
      )}

      {actionData?.error && (
        <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded-xl mb-6">
          {actionData.error}
        </div>
      )}

      {grupos.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-md">
          <p className="text-amber-600 text-lg mb-4">Tu carrito está vacío</p>
          <Link
            to="/dashboard/buscar"
            className="inline-block px-6 py-3 bg-amber-700 text-white rounded-xl hover:bg-amber-800 transition font-medium"
          >
            Buscar productos
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((grupo: any) => (
            <div key={grupo.supplierId} className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="bg-amber-800 text-white px-6 py-4">
                <Link
                  to={`/dashboard/proveedor/${grupo.supplierId}`}
                  className="font-bold text-lg hover:text-amber-200 transition"
                >
                  {grupo.proveedorNombre}
                </Link>
                <div className="text-amber-200 text-sm">{grupo.proveedorEmail}</div>
              </div>
              <div className="p-6">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-amber-600 border-b border-amber-200">
                      <th className="pb-2 font-medium">Producto</th>
                      <th className="pb-2 font-medium">Precio</th>
                      <th className="pb-2 font-medium">Cantidad</th>
                      <th className="pb-2 font-medium">Subtotal</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.items.map((item: any) => (
                      <tr key={item.productId} className="border-b border-amber-100">
                        <td className="py-3 text-amber-900 font-medium">{item.nombre}</td>
                        <td className="py-3 text-amber-700">${item.precio} / {item.unidad}</td>
                        <td className="py-3">
                          <Form method="post" className="flex items-center gap-2">
                            <input type="hidden" name="_action" value="update" />
                            <input type="hidden" name="productId" value={item.productId} />
                            <input
                              type="number"
                              name="cantidad"
                              min="1"
                              defaultValue={item.cantidad}
                              className="w-16 px-2 py-1 border border-amber-200 rounded-lg text-center"
                              onChange={(e) => e.target.form?.requestSubmit()}
                            />
                          </Form>
                        </td>
                        <td className="py-3 font-semibold text-amber-800">${item.subtotal}</td>
                        <td className="py-3">
                          <Form method="post">
                            <input type="hidden" name="_action" value="remove" />
                            <input type="hidden" name="productId" value={item.productId} />
                            <button
                              type="submit"
                              className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Eliminar
                            </button>
                          </Form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-amber-200">
                  <div className="text-sm text-amber-600">
                    Envío: {grupo.costoEnvio > 0 ? `$${grupo.costoEnvio}` : "Gratis"}
                    {grupo.pedidoMinimo > 0 && (
                      <span className="ml-3">Pedido mínimo: ${grupo.pedidoMinimo}</span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-amber-900">
                    Subtotal: ${grupo.subtotal}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-amber-900 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xl font-bold">
              Total: ${totalGeneral}
            </div>
            <Form method="post">
              <input type="hidden" name="_action" value="checkout" />
              <button
                type="submit"
                className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition text-lg"
              >
                Confirmar Pedido
              </button>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
