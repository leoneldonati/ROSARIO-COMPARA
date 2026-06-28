import { Link, redirect, useFetcher, useLoaderData } from "react-router";
import { useRef, useState } from "react";
import type { Route } from "./+types/dashboard.productos";
import { connectDB } from "~/lib/db.server";
import { requireUser } from "~/lib/auth.server";
import SupplierProfile from "~/lib/models/supplier-profile.server";
import Product from "~/lib/models/product.server";
import { Button } from "~/components/Button";
import { Badge } from "~/components/Badge";
import { Spinner } from "~/components/Spinner";
import { ConfirmDialog } from "~/components/ConfirmDialog";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request, ["PROVEEDOR"]);
  await connectDB();
  const perfil = await SupplierProfile.findOne({ userId: user._id });
  if (!perfil) throw new Response("Perfil de proveedor no encontrado", { status: 404 });

  const productos = (await Product.find({ supplierId: perfil._id })
    .sort({ createdAt: -1 })
    .lean())
    .map((p: any) => ({
      ...p,
      _id: p._id.toString(),
      supplierId: p.supplierId.toString(),
    }));

  return { productos, supplierId: perfil._id.toString() };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request, ["PROVEEDOR"]);
  await connectDB();
  const form = await request.formData();
  const _action = form.get("_action") as string;

  if (_action === "delete") {
    const productId = form.get("productId") as string;
    const perfil = await SupplierProfile.findOne({ userId: user._id });
    if (!perfil) throw new Response("Perfil no encontrado", { status: 404 });

    const producto = await Product.findOne({ _id: productId, supplierId: perfil._id });
    if (!producto) throw new Response("Producto no encontrado", { status: 404 });

    await Product.deleteOne({ _id: productId });
  }

  return redirect("/dashboard/productos");
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Mis Productos - Proveedores App" }];
}

export default function MisProductos({ loaderData }: Route.ComponentProps) {
  const { productos } = loaderData;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-100">Mis Productos</h2>
        <Link to="/dashboard/productos/nuevo">
          <Button>+ Nuevo Producto</Button>
        </Link>
      </div>

      {productos.length === 0 ? (
        <div className="bg-primary-50 dark:bg-slate-800 rounded-lg p-6 sm:p-12 text-center">
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg mb-4">Todavía no cargaste productos.</p>
          <Link
            to="/dashboard/productos/nuevo"
            className="text-primary-600 dark:text-primary-400 font-semibold hover:underline"
          >
            Cargá tu primer producto
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {productos.map((p) => (
            <ProductRow key={p._id.toString()} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductRow({ p }: { p: any }) {
  const delFetcher = useFetcher({ key: `del-${p._id}` });
  const formRef = useRef<HTMLFormElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="bg-primary-50 dark:bg-slate-800 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h3 className="font-semibold text-primary-900 dark:text-primary-100 text-lg">{p.nombre}</h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          {p.categoria && `${p.categoria} · `}${p.precio} / {p.unidad}
        </p>
        {p.descripcion && (
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{p.descripcion}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Badge color={p.stock ? "green" : "red"}>
          {p.stock ? "En stock" : "Sin stock"}
        </Badge>
        <Link
          to={`/dashboard/productos/${p._id}/editar`}
          className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-lg font-medium transition text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-950"
        >
          Editar
        </Link>
        <delFetcher.Form method="post" ref={formRef}>
          <input type="hidden" name="_action" value="delete" />
          <input type="hidden" name="productId" value={p._id.toString()} />
          <Button
            type="button"
            variant="ghost"
            disabled={delFetcher.state !== "idle"}
            onClick={() => setShowConfirm(true)}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            {delFetcher.state !== "idle" ? <Spinner size={16} /> : null}
            {delFetcher.state !== "idle" ? "Eliminando..." : "Eliminar"}
          </Button>
        </delFetcher.Form>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          if (formRef.current) {
            delFetcher.submit(formRef.current, { method: "post" });
          }
          setShowConfirm(false);
        }}
        title="Eliminar producto"
        message={
          <>
            ¿Estás seguro de que querés eliminar <strong>{p.nombre}</strong>?
            <br />
            Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={delFetcher.state !== "idle"}
      />
    </div>
  );
}
