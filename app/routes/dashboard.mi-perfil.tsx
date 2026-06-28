import { redirect, useFetcher, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard.mi-perfil";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import ClientProfile from "~/lib/models/client-profile.server";
import User from "~/lib/models/user.server";
import { Button } from "~/components/Button";
import { Card } from "~/components/Card";
import { Input, Textarea } from "~/components/Input";
import { Spinner } from "~/components/Spinner";

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

  const telefono = form.get("telefono") as string;
  await User.findByIdAndUpdate(user._id, { telefono });

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

    if (cuit && !/^\d{2}-\d{8}-\d$/.test(cuit)) {
      return { error: "El CUIT debe tener formato XX-XXXXXXXX-X" };
    }

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
  const fetcher = useFetcher();
  const loading = fetcher.state !== "idle";

  if (user.role === "PROVEEDOR") {
    const p = (perfil as any) || {};
    return (
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-100 mb-6">Perfil de Proveedor</h2>
        <Card>
          <fetcher.Form method="post" className="space-y-4">
            <Textarea label="Descripción" name="descripcion" rows={4} defaultValue={p.descripcion || ""} />
            <Input label="Cobertura de entrega" name="coberturaEntrega" defaultValue={p.coberturaEntrega || ""} placeholder="Ej: CABA, GBA, Zona Norte" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Costo de envío ($)" type="number" name="costoEnvio" defaultValue={p.costoEnvio || 0} />
              <Input label="Pedido mínimo ($)" type="number" name="pedidoMinimo" defaultValue={p.pedidoMinimo || 0} />
            </div>
            <Input label="Teléfono" name="telefono" defaultValue={(user as any).telefono || ""} placeholder="Ej: +54 341 1234567" />
            <Input label="Beneficios (separados por coma)" name="beneficios" defaultValue={(p.beneficios || []).join(", ")} placeholder="Ej: Descuento por volumen, Facturación mensual, Envío gratis" />
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner size={20} /> : null}
              {loading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </fetcher.Form>
        </Card>
      </div>
    );
  }

  const p = (perfil as any) || {};
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-100 mb-6">Perfil de Cliente</h2>
      <Card>
          <fetcher.Form method="post" className="space-y-4">
            {fetcher.data?.error && (
              <p className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 px-4 py-2 rounded-lg text-sm">
                {fetcher.data.error}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Dirección" name="direccion" defaultValue={p.direccion || ""} />
              <Input label="Ciudad" name="ciudad" defaultValue={p.ciudad || ""} />
              <Input label="Provincia" name="provincia" defaultValue={p.provincia || ""} />
              <Input label="Código Postal" name="codigoPostal" defaultValue={p.codigoPostal || ""} />
              <Input label="CUIT" name="cuit" defaultValue={p.cuit || ""} placeholder="XX-XXXXXXXX-X" />
              <Input label="Razón Social" name="razonSocial" defaultValue={p.razonSocial || ""} />
              <Input label="Teléfono" name="telefono" defaultValue={(user as any).telefono || ""} placeholder="Ej: +54 341 1234567" />
              <Input label="Tipo de local" name="tipoLocal" defaultValue={p.tipoLocal || ""} placeholder="Ej: Bar, Restaurante, Cafetería" />
              <Input label="Horario de entrega preferido" name="horarioEntrega" defaultValue={p.horarioEntrega || ""} placeholder="Ej: 9 a 18 hs" />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner size={20} /> : null}
              {loading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </fetcher.Form>
      </Card>
    </div>
  );
}
