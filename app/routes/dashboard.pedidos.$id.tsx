import { Form, Link, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard.pedidos.$id";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import Order from "~/lib/models/order.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import User from "~/lib/models/user.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  await connectDB();

  const order: any = await Order.findById(params.id).lean();
  if (!order) throw new Response("Pedido no encontrado", { status: 404 });

  if (user.role === "CLIENTE" && order.clientId.toString() !== user._id) {
    throw new Response("No autorizado", { status: 403 });
  }

  if (user.role === "PROVEEDOR") {
    const perfil = await SupplierProfile.findOne({ userId: user._id }).lean();
    if (!perfil || order.supplierId.toString() !== perfil._id.toString()) {
      throw new Response("No autorizado", { status: 403 });
    }
  }

  const cliente: any = await User.findById(order.clientId).select("nombre email telefono").lean();
  const perfilProveedor: any = await SupplierProfile.findById(order.supplierId).lean();
  const proveedor: any = perfilProveedor
    ? await User.findById(perfilProveedor.userId).select("nombre email telefono").lean()
    : null;

  return {
    user,
    order: {
      ...order,
      _id: order._id.toString(),
      clienteNombre: cliente?.nombre || "Desconocido",
      clienteEmail: cliente?.email || "",
      proveedorNombre: proveedor?.nombre || "Desconocido",
      proveedorEmail: proveedor?.email || "",
    },
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);
  await connectDB();

  const order: any = await Order.findById(params.id);
  if (!order) throw new Response("Pedido no encontrado", { status: 404 });

  if (user.role === "PROVEEDOR") {
    const perfil = await SupplierProfile.findOne({ userId: user._id }).lean();
    if (!perfil || order.supplierId.toString() !== perfil._id.toString()) {
      throw new Response("No autorizado", { status: 403 });
    }

    const form = await request.formData();
    const estado = form.get("estado") as string;
    const validEstados = ["confirmado", "en_camino", "entregado", "cancelado"];
    if (!validEstados.includes(estado)) {
      return { error: "Estado inválido" };
    }

    order.estado = estado;
    order.updatedAt = new Date();
    await order.save();
    return redirect(`/dashboard/pedidos/${params.id}`);
  }

  if (user.role === "CLIENTE") {
    if (order.clientId.toString() !== user._id) {
      throw new Response("No autorizado", { status: 403 });
    }

    const form = await request.formData();
    const estado = form.get("estado") as string;
    if (estado === "cancelado" && order.estado === "pendiente") {
      order.estado = "cancelado";
      order.updatedAt = new Date();
      await order.save();
      return redirect(`/dashboard/pedidos/${params.id}`);
    }

    return { error: "No se puede cancelar este pedido" };
  }

  return null;
}

const ESTADO_COLORS: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmado: "bg-blue-100 text-blue-800 border-blue-300",
  en_camino: "bg-purple-100 text-purple-800 border-purple-300",
  entregado: "bg-green-100 text-green-800 border-green-300",
  cancelado: "bg-red-100 text-red-800 border-red-300",
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_camino: "En Camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `Pedido #${loaderData.order._id.slice(-6)} - Proveedores App` }];
}

export default function PedidoDetalle({ loaderData, actionData }: Route.ComponentProps) {
  const { user, order } = loaderData;

  return (
    <div>
      <Link
        to="/dashboard/pedidos"
        className="text-amber-700 hover:text-amber-900 mb-4 inline-block"
      >
        &larr; Volver a pedidos
      </Link>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="bg-amber-800 text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-xl font-bold">
              Pedido #{order._id.slice(-6)}
            </h2>
            <p className="text-amber-200 text-sm">
              {new Date(order.createdAt).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <span
            className={`px-4 py-1.5 rounded-full text-sm font-medium border ${ESTADO_COLORS[order.estado]}`}
          >
            {ESTADO_LABELS[order.estado]}
          </span>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-amber-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-amber-700 mb-1">
                {user.role === "CLIENTE" ? "Proveedor" : "Cliente"}
              </h3>
              <p className="text-amber-900 font-medium">
                {user.role === "CLIENTE" ? order.proveedorNombre : order.clienteNombre}
              </p>
              <p className="text-amber-600 text-sm">
                {user.role === "CLIENTE" ? order.proveedorEmail : order.clienteEmail}
              </p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-amber-700 mb-1">
                Dirección de entrega
              </h3>
              <p className="text-amber-900">
                {order.direccionEntrega.direccion || "Sin dirección"}
              </p>
              <p className="text-amber-600 text-sm">
                {order.direccionEntrega.ciudad}, {order.direccionEntrega.provincia}
              </p>
            </div>
          </div>

          {actionData?.error && (
            <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded-xl">
              {actionData.error}
            </div>
          )}

          <div>
            <h3 className="text-lg font-bold text-amber-900 mb-3">Productos</h3>
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-amber-600 border-b border-amber-200">
                  <th className="pb-2 font-medium">Producto</th>
                  <th className="pb-2 font-medium">Precio</th>
                  <th className="pb-2 font-medium">Cantidad</th>
                  <th className="pb-2 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-amber-100">
                    <td className="py-3 text-amber-900 font-medium">{item.nombre}</td>
                    <td className="py-3 text-amber-700">${item.precio} / {item.unidad}</td>
                    <td className="py-3 text-amber-700">{item.cantidad}</td>
                    <td className="py-3 font-semibold text-amber-800">${item.subtotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right mt-4 pt-4 border-t border-amber-200">
              <span className="text-xl font-bold text-amber-900">
                Total: ${order.total}
              </span>
            </div>
          </div>

          {order.notas && (
            <div className="bg-amber-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-amber-700 mb-1">Notas</h3>
              <p className="text-amber-800">{order.notas}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-amber-200">
            {(user.role === "PROVEEDOR" && order.estado === "pendiente") && (
              <>
                <Form method="post">
                  <input type="hidden" name="estado" value="confirmado" />
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium"
                  >
                    Confirmar Pedido
                  </button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="estado" value="cancelado" />
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium"
                  >
                    Rechazar Pedido
                  </button>
                </Form>
              </>
            )}
            {(user.role === "PROVEEDOR" && order.estado === "confirmado") && (
              <Form method="post">
                <input type="hidden" name="estado" value="en_camino" />
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition font-medium"
                >
                  Marcar En Camino
                </button>
              </Form>
            )}
            {(user.role === "PROVEEDOR" && order.estado === "en_camino") && (
              <Form method="post">
                <input type="hidden" name="estado" value="entregado" />
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
                >
                  Marcar Entregado
                </button>
              </Form>
            )}
            {(user.role === "CLIENTE" && order.estado === "pendiente") && (
              <Form method="post">
                <input type="hidden" name="estado" value="cancelado" />
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium"
                >
                  Cancelar Pedido
                </button>
              </Form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
