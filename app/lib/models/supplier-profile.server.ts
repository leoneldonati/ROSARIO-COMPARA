import mongoose from "mongoose";

export interface SupplierProfileI {
  _id: string;
  userId: mongoose.Types.ObjectId;
  descripcion: string;
  logo: string;
  coberturaEntrega: string;
  costoEnvio: number;
  pedidoMinimo: number;
  beneficios: string[];
  activo: boolean;
}

const supplierProfileSchema = new mongoose.Schema<SupplierProfileI>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  descripcion: { type: String, default: "" },
  logo: { type: String, default: "" },
  coberturaEntrega: { type: String, default: "" },
  costoEnvio: { type: Number, default: 0 },
  pedidoMinimo: { type: Number, default: 0 },
  beneficios: { type: [String], default: [] },
  activo: { type: Boolean, default: true },
});

const SupplierProfile =
  mongoose.models.SupplierProfile ||
  mongoose.model<SupplierProfileI>("SupplierProfile", supplierProfileSchema);
export default SupplierProfile;
