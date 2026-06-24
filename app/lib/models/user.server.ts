import mongoose from "mongoose";

export interface UserI {
  _id: string;
  email: string;
  password: string;
  role: "CLIENTE" | "PROVEEDOR";
  nombre: string;
  telefono: string;
  createdAt: Date;
}

const userSchema = new mongoose.Schema<UserI>({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["CLIENTE", "PROVEEDOR"], required: true },
  nombre: { type: String, required: true },
  telefono: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model<UserI>("User", userSchema);
export default User;
