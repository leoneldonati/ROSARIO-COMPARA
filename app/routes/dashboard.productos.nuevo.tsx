import { Form, redirect, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard.productos.nuevo";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import Product from "~/lib/models/product.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request, ["PROVEEDOR"]);
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request, ["PROVEEDOR"]);
  await connectDB();
  const perfil = await SupplierProfile.findOne({ userId: user._id });

  const form = await request.formData();
  const nombre = form.get("nombre") as string;
  const categoria = form.get("categoria") as string;
  const precio = Number(form.get("precio")) || 0;
  const unidad = form.get("unidad") as string;
  const descripcion = form.get("descripcion") as string;

  if (!nombre || precio <= 0) {
    return { error: "El nombre y el precio son obligatorios" };
  }

  await Product.create({
    supplierId: perfil!._id,
    nombre,
    categoria,
    precio,
    unidad,
    descripcion,
  });

  return redirect("/dashboard/productos");
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Nuevo Producto - Proveedores App" }];
}

export default function NuevoProducto({ actionData }: Route.ComponentProps) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-amber-900 mb-6">Nuevo Producto</h2>
      <Form method="post" className="space-y-4">
        {actionData?.error && (
          <p className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{actionData.error}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-amber-800 mb-1">Nombre del producto</label>
          <input
            type="text"
            name="nombre"
            required
            className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-800 mb-1">Categoría</label>
          <input
            type="text"
            name="categoria"
            placeholder="Ej: Lácteos, Carnes, Bebidas"
            className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">Precio ($)</label>
            <input
              type="number"
              step="0.01"
              name="precio"
              required
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">Unidad</label>
            <select
              name="unidad"
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="kg">kg</option>
              <option value="unidad">unidad</option>
              <option value="litro">litro</option>
              <option value="docena">docena</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-800 mb-1">Descripción</label>
          <textarea
            name="descripcion"
            rows={3}
            className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <button
          type="submit"
          className="px-6 py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition font-medium"
        >
          Crear Producto
        </button>
      </Form>
    </div>
  );
}
