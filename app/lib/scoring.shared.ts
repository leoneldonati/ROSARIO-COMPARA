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
  "Mejor Precio": "bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900 dark:text-primary-200 dark:border-primary-700",
  "Mejor Envío": "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700",
  "Más Beneficios": "bg-accent-100 text-accent-700 border-accent-300 dark:bg-accent-900 dark:text-accent-200 dark:border-accent-700",
  "Mejor Opción": "bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700",
  "Mejor Variedad": "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700",
};
