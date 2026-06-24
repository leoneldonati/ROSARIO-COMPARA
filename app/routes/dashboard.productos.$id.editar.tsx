import { Form, redirect, useActionData, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard.productos.$id.editar";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import Product from "~/lib/models/product.server";
import mongoose from "mongoose";

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
    { nombre, categoria, precio, unidad, descripcion, stock }
  );

  return redirect("/dashboard/productos");
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Editar Producto - Proveedores App" }];
}

export default function EditarProducto({ loaderData, actionData }: Route.ComponentProps) {
  const { producto } = loaderData;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-amber-900 mb-6">Editar Producto</h2>
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
            defaultValue={producto.nombre}
            className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-800 mb-1">Categoría</label>
          <input
            type="text"
            name="categoria"
            defaultValue={producto.categoria || ""}
            className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">Precio ($)</label>
            <input
              type="number"
              step="0.01"
              name="precio"
              required
              defaultValue={producto.precio}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">Unidad</label>
            <select
              name="unidad"
              defaultValue={producto.unidad}
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
            defaultValue={producto.descripcion || ""}
            className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-amber-800">
            <input
              type="checkbox"
              name="stock"
              value="true"
              defaultChecked={producto.stock}
              className="rounded border-amber-300"
            />
            <span className="text-sm font-medium">Producto disponible</span>
          </label>
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
