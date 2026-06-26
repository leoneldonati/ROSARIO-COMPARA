import mongoose from "mongoose";

export interface OrderItem {
  productId: mongoose.Types.ObjectId;
  nombre: string;
  precio: number;
  unidad: string;
  cantidad: number;
  subtotal: number;
}

export interface DireccionEntrega {
  direccion: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
}

export interface OrderI {
  _id: string;
  clientId: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  items: OrderItem[];
  total: number;
  direccionEntrega: DireccionEntrega;
  estado: "pendiente" | "confirmado" | "en_camino" | "entregado" | "cancelado";
  notas: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new mongoose.Schema<OrderItem>({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  nombre: { type: String, required: true },
  precio: { type: Number, required: true },
  unidad: { type: String, default: "" },
  cantidad: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true },
}, { _id: false });

const direccionSchema = new mongoose.Schema<DireccionEntrega>({
  direccion: { type: String, default: "" },
  ciudad: { type: String, default: "" },
  provincia: { type: String, default: "" },
  codigoPostal: { type: String, default: "" },
}, { _id: false });

const orderSchema = new mongoose.Schema<OrderI>({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "SupplierProfile", required: true },
  items: { type: [orderItemSchema], required: true },
  total: { type: Number, required: true },
  direccionEntrega: { type: direccionSchema, required: true },
  estado: {
    type: String,
    enum: ["pendiente", "confirmado", "en_camino", "entregado", "cancelado"],
    default: "pendiente",
  },
  notas: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Order = mongoose.models.Order || mongoose.model<OrderI>("Order", orderSchema);
export default Order;
