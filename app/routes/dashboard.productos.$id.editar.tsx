import { redirect, useFetcher, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard.productos.$id.editar";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import Product from "~/lib/models/product.server";
import { Button } from "~/components/Button";
import { Card } from "~/components/Card";
import { Input, Textarea } from "~/components/Input";
import { Spinner } from "~/components/Spinner";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request, ["PROVEEDOR"]);
  await connectDB();
  const perfil = await SupplierProfile.findOne({ userId: user._id });

  const producto = await Product.findOne({
    _id: params.id,
    supplierId: perfil!._id,
  }).lean();

  if (!producto) throw new Error("Producto no encontrado");
  return { producto };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request, ["PROVEEDOR"]);
  await connectDB();
  const perfil = await SupplierProfile.findOne({ userId: user._id });

  const form = await request.formData();
  const nombre = form.get("nombre") as string;
  const categoria = form.get("categoria") as string;
  const precio = Number(form.get("precio")) || 0;
  const unidad = form.get("unidad") as string;
  const descripcion = form.get("descripcion") as string;
  const stock = form.get("stock") === "true";

  if (!nombre || precio <= 0) {
    return { error: "El nombre y el precio son obligatorios" };
  }

  await Product.findOneAndUpdate(
    { _id: params.id, supplierId: perfil!._id },
    { nombre, categoria, precio, unidad, descripcion, stock },
  );

  return redirect("/dashboard/productos");
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Editar Producto - Proveedores App" }];
}

export default function EditarProducto({ loaderData }: Route.ComponentProps) {
  const { producto } = loaderData;
  const fetcher = useFetcher();
  const loading = fetcher.state !== "idle";

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-100 mb-6">
        Editar Producto
      </h2>
      <Card>
        <fetcher.Form method="post" className="space-y-4">
          {fetcher.data?.error && (
            <p className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 px-4 py-2 rounded-lg text-sm">
              {fetcher.data.error}
            </p>
          )}

          <Input
            label="Nombre del producto"
            name="nombre"
            required
            defaultValue={producto.nombre}
          />
          <Input
            label="Categoría"
            name="categoria"
            defaultValue={producto.categoria || ""}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Precio ($)"
              type="number"
              step="0.01"
              name="precio"
              defaultValue={producto.precio}
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Unidad
              </label>
              <select
                name="unidad"
                defaultValue={producto.unidad}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition"
              >
                <option value="kg">kg</option>
                <option value="unidad">unidad</option>
                <option value="litro">litro</option>
                <option value="docena">docena</option>
              </select>
            </div>
          </div>

          <Textarea
            label="Descripción"
            name="descripcion"
            rows={3}
            defaultValue={producto.descripcion || ""}
          />

          <div>
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                name="stock"
                value="true"
                defaultChecked={producto.stock}
                className="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium">Producto disponible</span>
            </label>
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
