export interface PesosScoring {
  precio: number;
  envio: number;
  pedido: number;
  beneficios: number;
  cobertura: number;
}

export interface ProveedorData {
  _id: string;
  nombre: string;
  precio: number;
  unidad: string;
  descripcion: string;
  proveedorNombre: string;
  proveedorEmail: string;
  proveedorTelefono: string;
  coberturaEntrega: string;
  costoEnvio: number;
  pedidoMinimo: number;
  beneficios: string[];
}

export interface ProveedorConScore extends ProveedorData {
  score: number;
  estrellas: number;
  badges: string[];
}

export const PESOS_DEFAULT: PesosScoring = {
  precio: 40,
  envio: 20,
  pedido: 15,
  beneficios: 15,
  cobertura: 10,
};

export interface ProductoItem {
  _id: string;
  nombre: string;
  precio: number;
  unidad: string;
  descripcion: string;
}

export interface ProveedorCategoriaScore {
  supplierId: string;
  proveedorNombre: string;
  proveedorEmail: string;
  proveedorTelefono: string;
  coberturaEntrega: string;
  costoEnvio: number;
  pedidoMinimo: number;
  beneficios: string[];
  productos: ProductoItem[];
  precioPromedio: number;
  score: number;
  estrellas: number;
  badges: string[];
}

export const BADGE_COLORS: Record<string, string> = {
  "Mejor Precio": "bg-green-100 text-green-700 border-green-300",
  "Mejor Envío": "bg-blue-100 text-blue-700 border-blue-300",
  "Más Beneficios": "bg-orange-100 text-orange-700 border-orange-300",
  "Mejor Opción": "bg-yellow-100 text-yellow-700 border-yellow-300",
  "Mejor Variedad": "bg-purple-100 text-purple-700 border-purple-300",
};
