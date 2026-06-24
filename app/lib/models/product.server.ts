import mongoose from "mongoose";

export interface ProductI {
  _id: string;
  supplierId: mongoose.Types.ObjectId;
  nombre: string;
  categoria: string;
  precio: number;
  unidad: string;
  descripcion: string;
  imagen: string;
  stock: boolean;
  createdAt: Date;
}

const productSchema = new mongoose.Schema<ProductI>({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "SupplierProfile", required: true },
  nombre: { type: String, required: true },
  categoria: { type: String, default: "" },
  precio: { type: Number, required: true },
  unidad: { type: String, default: "unidad" },
  descripcion: { type: String, default: "" },
  imagen: { type: String, default: "" },
  stock: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const Product =
  mongoose.models.Product || mongoose.model<ProductI>("Product", productSchema);
export default Product;
