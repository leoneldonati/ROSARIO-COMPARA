import { Form, Link, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard.pedidos";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import Order from "~/lib/models/order.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import User from "~/lib/models/user.server";
import { Badge } from "~/components/Badge";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  await connectDB();

  let orders: any[] = [];
  if (user.role === "CLIENTE") {
    orders = await Order.find({ clientId: user._id })
      .sort({ createdAt: -1 })
      .lean();
  } else {
    const perfil = await SupplierProfile.findOne({ userId: user._id }).lean();
    if (perfil) {
      orders = await Order.find({ supplierId: perfil._id })
        .sort({ createdAt: -1 })
        .lean();
    }
  }

  const clientIds = [...new Set(orders.map((o: any) => o.clientId.toString()))];
  const supplierIds = [...new Set(orders.map((o: any) => o.supplierId.toString()))];
  const clientes = await User.find({ _id: { $in: clientIds } }).select("nombre email").lean();
  const perfiles = await SupplierProfile.find({ _id: { $in: supplierIds } }).lean();
  const perfilesUserIds = perfiles.map((p: any) => p.userId.toString());
  const proveedores = await User.find({ _id: { $in: perfilesUserIds } }).select("nombre email").lean();
  const clienteMap = new Map(clientes.map((c: any) => [c._id.toString(), c]));
  const proveedorMap = new Map(proveedores.map((p: any) => [p._id.toString(), p]));
  const perfilMap = new Map(perfiles.map((p: any) => [p._id.toString(), p]));

  const ordersConNombres = orders.map((o: any) => {
    const cliente = clienteMap.get(o.clientId.toString());
    const perfil = perfilMap.get(o.supplierId.toString());
    const proveedor = perfil ? proveedorMap.get(perfil.userId.toString()) : null;
    return {
      ...o,
      _id: o._id.toString(),
      clienteNombre: cliente?.nombre || "Desconocido",
      proveedorNombre: proveedor?.nombre || "Desconocido",
    };
  });

  return { user, orders: ordersConNombres };
}

const ESTADO_BADGE: Record<string, "accent" | "blue" | "purple" | "green" | "red"> = {
  pendiente: "accent",
  confirmado: "blue",
  en_camino: "purple",
  entregado: "green",
  cancelado: "red",
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_camino: "En Camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function meta({}: Route.MetaArgs) {
  return [{ title: "Pedidos - Proveedores App" }];
}

export default function Pedidos({ loaderData }: Route.ComponentProps) {
  const { user, orders } = loaderData;

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-100 mb-6">Pedidos</h2>

      {orders.length === 0 ? (
        <div className="bg-primary-50 dark:bg-slate-800 rounded-lg p-12 text-center">
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-4">No hay pedidos todavía</p>
          {user.role === "CLIENTE" && (
            <Link
              to="/dashboard/buscar"
              className="inline-block px-6 py-3 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition font-medium"
            >
              Buscar productos
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-primary-50 dark:bg-slate-800 rounded-lg overflow-hidden">
            <thead className="bg-primary-800 dark:bg-primary-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                {user.role === "PROVEEDOR" && (
                  <th className="px-4 py-3 text-left">Cliente</th>
                )}
                {user.role === "CLIENTE" && (
                  <th className="px-4 py-3 text-left">Proveedor</th>
                )}
                <th className="px-4 py-3 text-left">Productos</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any, i: number) => (
                <tr
                  key={order._id}
                  className={i % 2 === 0 ? "bg-primary-50 dark:bg-slate-800" : "bg-white dark:bg-slate-800/50"}
                >
                  <td className="px-4 py-3 font-mono text-sm text-slate-500 dark:text-slate-400">
                    {order._id.slice(-6)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                    {new Date(order.createdAt).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  {user.role === "PROVEEDOR" && (
                    <td className="px-4 py-3 font-medium text-primary-900 dark:text-primary-100">
                      {order.clienteNombre}
                    </td>
                  )}
                  {user.role === "CLIENTE" && (
                    <td className="px-4 py-3 font-medium text-primary-900 dark:text-primary-100">
                      {order.proveedorNombre}
                    </td>
                  )}
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                    {order.items.length} producto{order.items.length !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 font-bold text-primary-800 dark:text-primary-200">
                    ${order.total}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/dashboard/pedidos/${order._id}`}>
                      <Badge color={ESTADO_BADGE[order.estado] || "primary"}>
                        {ESTADO_LABELS[order.estado] || order.estado}
                      </Badge>
                    </Link>
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
