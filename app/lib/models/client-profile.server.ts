import mongoose from "mongoose";

export interface ClientProfileI {
  _id: string;
  userId: mongoose.Types.ObjectId;
  direccion: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
  cuit: string;
  razonSocial: string;
  tipoLocal: string;
  horarioEntrega: string;
}

const clientProfileSchema = new mongoose.Schema<ClientProfileI>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  direccion: { type: String, default: "" },
  ciudad: { type: String, default: "" },
  provincia: { type: String, default: "" },
  codigoPostal: { type: String, default: "" },
  cuit: { type: String, default: "" },
  razonSocial: { type: String, default: "" },
  tipoLocal: { type: String, default: "" },
  horarioEntrega: { type: String, default: "" },
});

const ClientProfile =
  mongoose.models.ClientProfile ||
  mongoose.model<ClientProfileI>("ClientProfile", clientProfileSchema);
export default ClientProfile;
