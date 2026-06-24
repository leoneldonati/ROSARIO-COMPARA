import { Form, redirect, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard.mi-perfil";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import ClientProfile from "~/lib/models/client-profile.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  await connectDB();

  let perfil = null;
  if (user.role === "PROVEEDOR") {
    perfil = await SupplierProfile.findOne({ userId: user._id }).lean();
  } else {
    perfil = await ClientProfile.findOne({ userId: user._id }).lean();
  }

  return { user, perfil };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);
  await connectDB();
  const form = await request.formData();

  if (user.role === "PROVEEDOR") {
    const descripcion = form.get("descripcion") as string;
    const coberturaEntrega = form.get("coberturaEntrega") as string;
    const costoEnvio = Number(form.get("costoEnvio")) || 0;
    const pedidoMinimo = Number(form.get("pedidoMinimo")) || 0;
    const beneficiosRaw = form.get("beneficios") as string;

    await SupplierProfile.findOneAndUpdate(
      { userId: user._id },
      {
        descripcion,
        coberturaEntrega,
        costoEnvio,
        pedidoMinimo,
        beneficios: beneficiosRaw ? beneficiosRaw.split(",").map((b: string) => b.trim()).filter(Boolean) : [],
      }
    );
  } else {
    const direccion = form.get("direccion") as string;
    const ciudad = form.get("ciudad") as string;
    const provincia = form.get("provincia") as string;
    const codigoPostal = form.get("codigoPostal") as string;
    const cuit = form.get("cuit") as string;
    const razonSocial = form.get("razonSocial") as string;
    const tipoLocal = form.get("tipoLocal") as string;
    const horarioEntrega = form.get("horarioEntrega") as string;

    await ClientProfile.findOneAndUpdate(
      { userId: user._id },
      { direccion, ciudad, provincia, codigoPostal, cuit, razonSocial, tipoLocal, horarioEntrega }
    );
  }

  return redirect("/dashboard/mi-perfil");
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Mi Perfil - Proveedores App" }];
}

export default function MiPerfil({ loaderData }: Route.ComponentProps) {
  const { user, perfil } = loaderData;

  if (user.role === "PROVEEDOR") {
    const p = perfil as any || {};
    return (
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold text-amber-900 mb-6">Perfil de Proveedor</h2>
        <Form method="post" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">Descripción</label>
            <textarea
              name="descripcion"
              rows={4}
              defaultValue={p.descripcion || ""}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">Cobertura de entrega</label>
            <input
              type="text"
              name="coberturaEntrega"
              defaultValue={p.coberturaEntrega || ""}
              placeholder="Ej: CABA, GBA, Zona Norte"
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-1">Costo de envío ($)</label>
              <input
                type="number"
                name="costoEnvio"
                defaultValue={p.costoEnvio || 0}
                className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-1">Pedido mínimo ($)</label>
              <input
                type="number"
                name="pedidoMinimo"
                defaultValue={p.pedidoMinimo || 0}
                className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">
              Beneficios (separados por coma)
            </label>
            <input
              type="text"
              name="beneficios"
              defaultValue={(p.beneficios || []).join(", ")}
              placeholder="Ej: Descuento por volumen, Facturación mensual, Envío gratis"
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition font-medium"
          >
            Guardar cambios
          </button>
        </Form>
      </div>
    );
  }

  const p = perfil as any || {};
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-amber-900 mb-6">Perfil de Cliente</h2>
      <Form method="post" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">Dirección</label>
            <input
              type="text"
              name="direccion"
              defaultValue={p.direccion || ""}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">Ciudad</label>
            <input
              type="text"
              name="ciudad"
              defaultValue={p.ciudad || ""}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">Provincia</label>
            <input
              type="text"
              name="provincia"
              defaultValue={p.provincia || ""}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">Código Postal</label>
            <input
              type="text"
              name="codigoPostal"
              defaultValue={p.codigoPostal || ""}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">CUIT</label>
            <input
              type="text"
              name="cuit"
              defaultValue={p.cuit || ""}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">Razón Social</label>
            <input
              type="text"
              name="razonSocial"
              defaultValue={p.razonSocial || ""}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">Tipo de local</label>
            <input
              type="text"
              name="tipoLocal"
              defaultValue={p.tipoLocal || ""}
              placeholder="Ej: Bar, Restaurante, Cafetería"
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">Horario de entrega preferido</label>
            <input
              type="text"
              name="horarioEntrega"
              defaultValue={p.horarioEntrega || ""}
              placeholder="Ej: 9 a 18 hs"
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition font-medium"
        >
          Guardar cambios
        </button>
      </Form>
    </div>
  );
}
