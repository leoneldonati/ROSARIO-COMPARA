import mongoose from "mongoose";

declare global {
  var __mongoose: Promise<typeof mongoose> | undefined;
}

export async function connectDB() {
  if (global.__mongoose) return global.__mongoose;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI no está definida");

  global.__mongoose = mongoose.connect(uri, {
    bufferCommands: false,
  });

  return global.__mongoose;
}
