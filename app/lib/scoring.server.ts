import type { PesosScoring, ProveedorData, ProveedorConScore, ProveedorCategoriaScore, ProductoItem } from "./scoring.shared";
import { PESOS_DEFAULT } from "./scoring.shared";

function normalizarInverso(valor: number, min: number, max: number): number {
  if (max === min) return 1;
  return 1 - (valor - min) / (max - min);
}

function parsePesos(raw: Record<string, string | undefined>): PesosScoring {
  const pesos: PesosScoring = { ...PESOS_DEFAULT };
  if (raw.precio) pesos.precio = Math.max(0, Number(raw.precio));
  if (raw.envio) pesos.envio = Math.max(0, Number(raw.envio));
  if (raw.pedido) pesos.pedido = Math.max(0, Number(raw.pedido));
  if (raw.beneficios) pesos.beneficios = Math.max(0, Number(raw.beneficios));
  if (raw.cobertura) pesos.cobertura = Math.max(0, Number(raw.cobertura));
  return pesos;
}

function calcEstrellas(score: number): number {
  return Math.min(5, Math.max(1, Math.round(score * 4 + 1)));
}

export function calcularScore(
  proveedores: ProveedorData[],
  rawPesos: Record<string, string | undefined>
): { proveedores: ProveedorConScore[]; pesos: PesosScoring } {
  const pesos = parsePesos(rawPesos);
  const sumaPesos =
    pesos.precio + pesos.envio + pesos.pedido + pesos.beneficios + pesos.cobertura;

  if (proveedores.length === 0) {
    return { proveedores: [], pesos };
  }

  const minPrecio = Math.min(...proveedores.map((p) => p.precio));
  const maxPrecio = Math.max(...proveedores.map((p) => p.precio));
  const minEnvio = Math.min(...proveedores.map((p) => p.costoEnvio));
  const maxEnvio = Math.max(...proveedores.map((p) => p.costoEnvio));
  const minPedido = Math.min(...proveedores.map((p) => p.pedidoMinimo));
  const maxPedido = Math.max(...proveedores.map((p) => p.pedidoMinimo));
  const maxBeneficios = Math.max(...proveedores.map((p) => p.beneficios.length));

  const mejores: Record<string, { valor: number; id: string }> = {
    precio: { valor: Infinity, id: "" },
    envio: { valor: Infinity, id: "" },
    beneficios: { valor: -Infinity, id: "" },
  };

  const resultados: ProveedorConScore[] = proveedores.map((p) => {
    const sPrecio = normalizarInverso(p.precio, minPrecio, maxPrecio);
    const sEnvio = normalizarInverso(p.costoEnvio, minEnvio, maxEnvio);
    const sPedido = normalizarInverso(p.pedidoMinimo, minPedido, maxPedido);
    const sBeneficios =
      maxBeneficios > 0 ? p.beneficios.length / maxBeneficios : 0;
    const sCobertura = p.coberturaEntrega?.trim() ? 1 : 0;

    const score =
      (pesos.precio * sPrecio +
        pesos.envio * sEnvio +
        pesos.pedido * sPedido +
        pesos.beneficios * sBeneficios +
        pesos.cobertura * sCobertura) /
      sumaPesos;

    if (p.precio < mejores.precio.valor) {
      mejores.precio = { valor: p.precio, id: p._id };
    }
    if (p.costoEnvio < mejores.envio.valor) {
      mejores.envio = { valor: p.costoEnvio, id: p._id };
    }
    if (p.beneficios.length > mejores.beneficios.valor) {
      mejores.beneficios = { valor: p.beneficios.length, id: p._id };
    }

    return {
      ...p,
      score: Math.round(score * 100) / 100,
      estrellas: calcEstrellas(score),
      badges: [],
    };
  });

  const scoreMax = Math.max(...resultados.map((r) => r.score));

  for (const r of resultados) {
    if (r._id === mejores.precio.id) r.badges.push("Mejor Precio");
    if (r._id === mejores.envio.id) r.badges.push("Mejor Envío");
    if (r._id === mejores.beneficios.id) r.badges.push("Más Beneficios");
    if (r.score === scoreMax) r.badges.push("Mejor Opción");
  }

  resultados.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.precio - b.precio;
  });

  return { proveedores: resultados, pesos };
}

export interface SupplierCategoryInput {
  supplierId: string;
  proveedorNombre: string;
  proveedorEmail: string;
  proveedorTelefono: string;
  coberturaEntrega: string;
  costoEnvio: number;
  pedidoMinimo: number;
  beneficios: string[];
  productos: ProductoItem[];
}

export function calcularScoreProveedoresCategoria(
  suppliers: SupplierCategoryInput[],
  rawPesos: Record<string, string | undefined>
): { proveedores: ProveedorCategoriaScore[]; pesos: PesosScoring } {
  const pesos = parsePesos(rawPesos);
  const sumaPesos =
    pesos.precio + pesos.envio + pesos.pedido + pesos.beneficios + pesos.cobertura;

  if (suppliers.length === 0) {
    return { proveedores: [], pesos };
  }

  const preciosPromedio = suppliers.map(
    (s) => s.productos.reduce((sum, p) => sum + p.precio, 0) / s.productos.length
  );
  const minPrecio = Math.min(...preciosPromedio);
  const maxPrecio = Math.max(...preciosPromedio);
  const minEnvio = Math.min(...suppliers.map((s) => s.costoEnvio));
  const maxEnvio = Math.max(...suppliers.map((s) => s.costoEnvio));
  const minPedido = Math.min(...suppliers.map((s) => s.pedidoMinimo));
  const maxPedido = Math.max(...suppliers.map((s) => s.pedidoMinimo));
  const maxBeneficios = Math.max(...suppliers.map((s) => s.beneficios.length));
  const maxProductos = Math.max(...suppliers.map((s) => s.productos.length));

  const mejores: Record<string, { valor: number; id: string }> = {
    precio: { valor: Infinity, id: "" },
    envio: { valor: Infinity, id: "" },
    beneficios: { valor: -Infinity, id: "" },
    variedad: { valor: -Infinity, id: "" },
  };

  const resultados: ProveedorCategoriaScore[] = suppliers.map((s) => {
    const precioPromedio = preciosPromedio[suppliers.indexOf(s)];
    const sPrecio = normalizarInverso(precioPromedio, minPrecio, maxPrecio);
    const sVariedad =
      maxProductos > 0 ? s.productos.length / maxProductos : 0;
    const sEnvio = normalizarInverso(s.costoEnvio, minEnvio, maxEnvio);
    const sPedido = normalizarInverso(s.pedidoMinimo, minPedido, maxPedido);
    const sBeneficios =
      maxBeneficios > 0 ? s.beneficios.length / maxBeneficios : 0;
    const sCobertura = s.coberturaEntrega?.trim() ? 1 : 0;

    const pesoPrecio = pesos.precio / 2;
    const score =
      (pesoPrecio * sPrecio +
        pesoPrecio * sVariedad +
        pesos.envio * sEnvio +
        pesos.pedido * sPedido +
        pesos.beneficios * sBeneficios +
        pesos.cobertura * sCobertura) /
      sumaPesos;

    if (precioPromedio < mejores.precio.valor) {
      mejores.precio = { valor: precioPromedio, id: s.supplierId };
    }
    if (s.costoEnvio < mejores.envio.valor) {
      mejores.envio = { valor: s.costoEnvio, id: s.supplierId };
    }
    if (s.beneficios.length > mejores.beneficios.valor) {
      mejores.beneficios = { valor: s.beneficios.length, id: s.supplierId };
    }
    if (s.productos.length > mejores.variedad.valor) {
      mejores.variedad = { valor: s.productos.length, id: s.supplierId };
    }

    return {
      supplierId: s.supplierId,
      proveedorNombre: s.proveedorNombre,
      proveedorEmail: s.proveedorEmail,
      proveedorTelefono: s.proveedorTelefono,
      coberturaEntrega: s.coberturaEntrega,
      costoEnvio: s.costoEnvio,
      pedidoMinimo: s.pedidoMinimo,
      beneficios: s.beneficios,
      productos: s.productos,
      precioPromedio: Math.round(precioPromedio * 100) / 100,
      score: Math.round(score * 100) / 100,
      estrellas: calcEstrellas(score),
      badges: [],
    };
  });

  const scoreMax = Math.max(...resultados.map((r) => r.score));

  for (const r of resultados) {
    if (r.supplierId === mejores.precio.id) r.badges.push("Mejor Precio");
    if (r.supplierId === mejores.envio.id) r.badges.push("Mejor Envío");
    if (r.supplierId === mejores.beneficios.id) r.badges.push("Más Beneficios");
    if (r.supplierId === mejores.variedad.id) r.badges.push("Mejor Variedad");
    if (r.score === scoreMax) r.badges.push("Mejor Opción");
  }

  resultados.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.precioPromedio - b.precioPromedio;
  });

  return { proveedores: resultados, pesos };
}
