import { Link, redirect, useFetcher, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard.pedidos.$id";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import Order from "~/lib/models/order.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import User from "~/lib/models/user.server";
import { Button } from "~/components/Button";
import { Badge } from "~/components/Badge";
import { Spinner } from "~/components/Spinner";

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_camino: "En Camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const ESTADO_BADGE: Record<string, "primary" | "accent" | "green" | "red" | "blue" | "purple"> = {
  pendiente: "accent",
  confirmado: "blue",
  en_camino: "purple",
  entregado: "green",
  cancelado: "red",
};

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

    const transicionesValidas: Record<string, string[]> = {
      pendiente: ["confirmado", "cancelado"],
      confirmado: ["en_camino", "cancelado"],
      en_camino: ["entregado"],
      entregado: [],
      cancelado: [],
    };

    const permitidos = transicionesValidas[order.estado];
    if (!permitidos || !permitidos.includes(estado)) {
      return { error: `No se puede cambiar de "${order.estado}" a "${estado}"` };
    }

    order.estado = estado;
    order.updatedAt = new Date();
    await order.save();
    return redirect(`/dashboard/pedidos/${params.id}`);
  }

  if (user.role === "CLIENTE") {
    const form = await request.formData();
    const estado = form.get("estado") as string;

    if (order.clientId.toString() !== user._id) {
      throw new Response("No autorizado", { status: 403 });
    }

    if (order.estado !== "pendiente" || estado !== "cancelado") {
      return { error: "Solo podés cancelar pedidos pendientes" };
    }

    order.estado = "cancelado";
    order.updatedAt = new Date();
    await order.save();
    return redirect(`/dashboard/pedidos/${params.id}`);
  }

  return null;
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `Pedido #${loaderData.order._id.slice(-6)} - Proveedores App` }];
}

export default function PedidoDetalle({ loaderData }: Route.ComponentProps) {
  const { user, order } = loaderData;

  const confirmarFetcher = useFetcher({ key: `pedido-${order._id}-confirmar` });
  const rechazarFetcher = useFetcher({ key: `pedido-${order._id}-rechazar` });
  const caminoFetcher = useFetcher({ key: `pedido-${order._id}-camino` });
  const entregadoFetcher = useFetcher({ key: `pedido-${order._id}-entregado` });
  const cancelarFetcher = useFetcher({ key: `pedido-${order._id}-cancelar` });

  return (
    <div>
      <Link
        to="/dashboard/pedidos"
        className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 mb-4 inline-block"
      >
        &larr; Volver a pedidos
      </Link>

      <div className="bg-primary-50 dark:bg-slate-800 rounded-lg overflow-hidden">
        <div className="bg-primary-800 dark:bg-primary-900 text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-xl font-bold">
              Pedido #{order._id.slice(-6)}
            </h2>
            <p className="text-primary-200 text-sm">
              {new Date(order.createdAt).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <Badge color={ESTADO_BADGE[order.estado] || "primary"}>
            {ESTADO_LABELS[order.estado]}
          </Badge>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-primary-100 dark:bg-primary-900 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-1">
                {user.role === "CLIENTE" ? "Proveedor" : "Cliente"}
              </h3>
              <p className="text-primary-900 dark:text-primary-100 font-medium">
                {user.role === "CLIENTE" ? order.proveedorNombre : order.clienteNombre}
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {user.role === "CLIENTE" ? order.proveedorEmail : order.clienteEmail}
              </p>
            </div>
            <div className="bg-primary-100 dark:bg-primary-900 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-1">
                Dirección de entrega
              </h3>
              <p className="text-primary-900 dark:text-primary-100">
                {order.direccionEntrega.direccion || "Sin dirección"}
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {order.direccionEntrega.ciudad}, {order.direccionEntrega.provincia}
              </p>
            </div>
          </div>

          {rechazarFetcher.data?.error && (
            <div className="bg-red-50 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
              {rechazarFetcher.data.error}
            </div>
          )}
          {cancelarFetcher.data?.error && (
            <div className="bg-red-50 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
              {cancelarFetcher.data.error}
            </div>
          )}

          <div>
            <h3 className="text-lg font-bold text-primary-900 dark:text-primary-100 mb-3">Productos</h3>
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-500 dark:text-slate-400 border-b border-slate-300 dark:border-slate-600">
                  <th className="pb-2 font-medium">Producto</th>
                  <th className="pb-2 font-medium">Precio</th>
                  <th className="pb-2 font-medium">Cantidad</th>
                  <th className="pb-2 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-primary-900 dark:text-primary-100 font-medium">{item.nombre}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">${item.precio} / {item.unidad}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">{item.cantidad}</td>
                    <td className="py-3 font-semibold text-primary-800 dark:text-primary-200">${item.subtotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right mt-4 pt-4 border-t border-slate-300 dark:border-slate-600">
              <span className="text-xl font-bold text-primary-900 dark:text-primary-100">
                Total: ${order.total}
              </span>
            </div>
          </div>

          {order.notas && (
            <div className="bg-primary-100 dark:bg-primary-900 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-1">Notas</h3>
              <p className="text-primary-900 dark:text-primary-100">{order.notas}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-300 dark:border-slate-600">
            {(user.role === "PROVEEDOR" && order.estado === "pendiente") && (
              <>
                <confirmarFetcher.Form method="post">
                  <input type="hidden" name="estado" value="confirmado" />
                  <Button type="submit" variant="primary" disabled={confirmarFetcher.state !== "idle"}>
                    {confirmarFetcher.state !== "idle" ? <Spinner size={16} /> : null}
                    {confirmarFetcher.state !== "idle" ? "Confirmando..." : "Confirmar Pedido"}
                  </Button>
                </confirmarFetcher.Form>
                <rechazarFetcher.Form method="post">
                  <input type="hidden" name="estado" value="cancelado" />
                  <Button type="submit" variant="danger" disabled={rechazarFetcher.state !== "idle"}>
                    {rechazarFetcher.state !== "idle" ? <Spinner size={16} /> : null}
                    {rechazarFetcher.state !== "idle" ? "Rechazando..." : "Rechazar Pedido"}
                  </Button>
                </rechazarFetcher.Form>
              </>
            )}
            {(user.role === "PROVEEDOR" && order.estado === "confirmado") && (
              <caminoFetcher.Form method="post">
                <input type="hidden" name="estado" value="en_camino" />
                <Button type="submit" variant="primary" disabled={caminoFetcher.state !== "idle"}>
                  {caminoFetcher.state !== "idle" ? <Spinner size={16} /> : null}
                  {caminoFetcher.state !== "idle" ? "Actualizando..." : "Marcar En Camino"}
                </Button>
              </caminoFetcher.Form>
            )}
            {(user.role === "PROVEEDOR" && order.estado === "en_camino") && (
              <entregadoFetcher.Form method="post">
                <input type="hidden" name="estado" value="entregado" />
                <Button type="submit" variant="primary" disabled={entregadoFetcher.state !== "idle"}>
                  {entregadoFetcher.state !== "idle" ? <Spinner size={16} /> : null}
                  {entregadoFetcher.state !== "idle" ? "Actualizando..." : "Marcar Entregado"}
                </Button>
              </entregadoFetcher.Form>
            )}
            {(user.role === "CLIENTE" && order.estado === "pendiente") && (
              <cancelarFetcher.Form method="post">
                <input type="hidden" name="estado" value="cancelado" />
                <Button type="submit" variant="danger" disabled={cancelarFetcher.state !== "idle"}>
                  {cancelarFetcher.state !== "idle" ? <Spinner size={16} /> : null}
                  {cancelarFetcher.state !== "idle" ? "Cancelando..." : "Cancelar Pedido"}
                </Button>
              </cancelarFetcher.Form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
