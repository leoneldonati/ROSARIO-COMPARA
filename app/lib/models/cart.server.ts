import mongoose from "mongoose";

export interface CartItem {
  productId: mongoose.Types.ObjectId;
  cantidad: number;
}

export interface CartI {
  _id: string;
  clientId: mongoose.Types.ObjectId;
  items: CartItem[];
  updatedAt: Date;
}

const cartItemSchema = new mongoose.Schema<CartItem>({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  cantidad: { type: Number, required: true, min: 1 },
}, { _id: false });

const cartSchema = new mongoose.Schema<CartI>({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  items: { type: [cartItemSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

const Cart = mongoose.models.Cart || mongoose.model<CartI>("Cart", cartSchema);
export default Cart;
