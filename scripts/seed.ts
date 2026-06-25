import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const URI = process.env.MONGODB_URI!;
if (!URI) {
  console.error("Error: MONGODB_URI no está definida");
  process.exit(1);
}

async function seed() {
  await mongoose.connect(URI);
  console.log("Conectado a MongoDB");

  const db = mongoose.connection.db!;
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.dropCollection(col.name);
  }
  console.log("Base de datos limpiada");

  const hash = await bcrypt.hash("123456", 10);

  // ─── USUARIOS ────────────────────────────────────────────
  const users = await mongoose.connection.collection("users").insertMany([
    { email: "proveedor1@test.com", password: hash, role: "PROVEEDOR", nombre: "Distribuidora Gastronómica SRL", telefono: "11-1234-5678", createdAt: new Date() },
    { email: "proveedor2@test.com", password: hash, role: "PROVEEDOR", nombre: "Lácteos del Sur SA", telefono: "11-2345-6789", createdAt: new Date() },
    { email: "proveedor3@test.com", password: hash, role: "PROVEEDOR", nombre: "Carnes Premium", telefono: "11-3456-7890", createdAt: new Date() },
    { email: "cliente1@test.com", password: hash, role: "CLIENTE", nombre: "Bar El Clásico", telefono: "11-4567-8901", createdAt: new Date() },
    { email: "cliente2@test.com", password: hash, role: "CLIENTE", nombre: "Restaurante La Esquina", telefono: "11-5678-9012", createdAt: new Date() },
  ]);
  console.log(`Usuarios creados: ${Object.keys(users.insertedIds).length}`);

  const [p1, p2, p3] = [
    users.insertedIds[0],
    users.insertedIds[1],
    users.insertedIds[2],
  ];

  // ─── PERFILES PROVEEDORES ────────────────────────────────
  const supplierProfiles = await mongoose.connection.collection("supplierprofiles").insertMany([
    {
      userId: p1, descripcion: "Distribuidora líder en insumos gastronómicos con más de 10 años de experiencia.",
      logo: "", coberturaEntrega: "CABA, GBA", costoEnvio: 1500, pedidoMinimo: 5000,
      beneficios: ["Descuento 5% por volumen", "Facturación mensual", "Entrega en 48hs"], activo: true,
    },
    {
      userId: p2, descripcion: "Productos lácteos artesanales de la mejor calidad, directo del campo a tu cocina.",
      logo: "", coberturaEntrega: "GBA, Zona Sur, La Plata", costoEnvio: 0, pedidoMinimo: 3000,
      beneficios: ["Envío gratis", "Descuento 10% primera compra", "Productos frescos"], activo: true,
    },
    {
      userId: p3, descripcion: "Carnes de primera calidad, maduradas y cortadas por expertos.",
      logo: "", coberturaEntrega: "CABA", costoEnvio: 2000, pedidoMinimo: 8000,
      beneficios: ["Corte personalizado", "Entrega en 24hs", "Descuento 8% por volumen"], activo: true,
    },
  ]);
  console.log(`Perfiles de proveedor creados: ${Object.keys(supplierProfiles.insertedIds).length}`);

  const [sp1, sp2, sp3] = [
    supplierProfiles.insertedIds[0],
    supplierProfiles.insertedIds[1],
    supplierProfiles.insertedIds[2],
  ];

  // ─── PERFILES CLIENTES ───────────────────────────────────
  await mongoose.connection.collection("clientprofiles").insertMany([
    {
      userId: users.insertedIds[3], direccion: "Bartolomé Mitre 1234", ciudad: "CABA",
      provincia: "Buenos Aires", codigoPostal: "1039", cuit: "30-12345678-9",
      razonSocial: "Bar El Clásico SRL", tipoLocal: "Bar", horarioEntrega: "9 a 14 hs",
    },
    {
      userId: users.insertedIds[4], direccion: "Av. Corrientes 5678", ciudad: "CABA",
      provincia: "Buenos Aires", codigoPostal: "1043", cuit: "30-87654321-0",
      razonSocial: "Restaurante La Esquina SA", tipoLocal: "Restaurante", horarioEntrega: "10 a 17 hs",
    },
  ]);
  console.log("Perfiles de cliente creados: 2");

  // ─── PRODUCTOS ───────────────────────────────────────────
  const productos = [
    { supplierId: sp1, nombre: "Queso Muzzarella", categoria: "Lácteos", precio: 4800, unidad: "kg", descripcion: "Queso muzzarella clásico, ideal para pizzas y pastas.", stock: true, createdAt: new Date() },
    { supplierId: sp2, nombre: "Queso Muzzarella", categoria: "Lácteos", precio: 5200, unidad: "kg", descripcion: "Muzzarella artesanal de leche de campo.", stock: true, createdAt: new Date() },
    { supplierId: sp3, nombre: "Queso Muzzarella", categoria: "Lácteos", precio: 4500, unidad: "kg", descripcion: "Muzzarella premium, sabor y textura inigualables.", stock: true, createdAt: new Date() },
    { supplierId: sp1, nombre: "Jamón Cocido", categoria: "Fiambres", precio: 3900, unidad: "kg", descripcion: "Jamón cocido extrafino.", stock: true, createdAt: new Date() },
    { supplierId: sp3, nombre: "Jamón Cocido", categoria: "Fiambres", precio: 3700, unidad: "kg", descripcion: "Jamón cocido natural, sin conservantes.", stock: true, createdAt: new Date() },
    { supplierId: sp1, nombre: "Carne Picada", categoria: "Carnes", precio: 3800, unidad: "kg", descripcion: "Carne picada especial para pastas.", stock: true, createdAt: new Date() },
    { supplierId: sp3, nombre: "Carne Picada", categoria: "Carnes", precio: 3500, unidad: "kg", descripcion: "Carne picada de ternera, magra.", stock: true, createdAt: new Date() },
    { supplierId: sp3, nombre: "Bife de Chorizo", categoria: "Carnes", precio: 5800, unidad: "kg", descripcion: "Bife de chorizo madurado 21 días.", stock: true, createdAt: new Date() },
    { supplierId: sp1, nombre: "Aceite de Girasol", categoria: "Aceites", precio: 1300, unidad: "litro", descripcion: "Aceite de girasol puro.", stock: true, createdAt: new Date() },
    { supplierId: sp2, nombre: "Queso Parmesano", categoria: "Lácteos", precio: 6800, unidad: "kg", descripcion: "Queso parmesano importado, curado 12 meses.", stock: true, createdAt: new Date() },
    { supplierId: sp2, nombre: "Lechuga", categoria: "Verduras", precio: 900, unidad: "kg", descripcion: "Lechuga capuchina fresca.", stock: true, createdAt: new Date() },
    { supplierId: sp2, nombre: "Pollo Entero", categoria: "Carnes", precio: 3000, unidad: "kg", descripcion: "Pollo fresco de campo.", stock: true, createdAt: new Date() },
    { supplierId: sp3, nombre: "Pollo Entero", categoria: "Carnes", precio: 2800, unidad: "kg", descripcion: "Pollo free range, alimentación natural.", stock: true, createdAt: new Date() },
    { supplierId: sp1, nombre: "Harina 000", categoria: "Harinas", precio: 400, unidad: "kg", descripcion: "Harina de trigo 000, ideal para panadería.", stock: true, createdAt: new Date() },
  ];

  await mongoose.connection.collection("products").insertMany(productos);
  console.log(`Productos creados: ${productos.length}`);

  console.log("\n✅ Seed completado exitosamente");
  console.log("\nUsuarios de prueba (password: 123456):");
  console.log("  proveedor1@test.com  - Distribuidora Gastronómica SRL");
  console.log("  proveedor2@test.com  - Lácteos del Sur SA");
  console.log("  proveedor3@test.com  - Carnes Premium");
  console.log("  cliente1@test.com    - Bar El Clásico");
  console.log("  cliente2@test.com    - Restaurante La Esquina");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
