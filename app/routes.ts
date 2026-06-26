import {
  type RouteConfig,
  index,
  layout,
  route,
  prefix,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("iniciar-sesion", "routes/iniciar-sesion.tsx"),
  route("registrarse", "routes/registrarse.tsx"),
  ...prefix("dashboard", [
    layout("routes/dashboard.tsx", [
      index("routes/dashboard.inicio.tsx"),
      route("mi-perfil", "routes/dashboard.mi-perfil.tsx"),
      route("productos", "routes/dashboard.productos.tsx"),
      route("productos/nuevo", "routes/dashboard.productos.nuevo.tsx"),
      route("productos/:id/editar", "routes/dashboard.productos.$id.editar.tsx"),
      route("buscar", "routes/dashboard.buscar.tsx"),
      route("carrito", "routes/dashboard.carrito.tsx"),
      route("pedidos", "routes/dashboard.pedidos.tsx"),
      route("pedidos/:id", "routes/dashboard.pedidos.$id.tsx"),
      route("producto/:id/comparar", "routes/dashboard.producto.$id.comparar.tsx"),
      route("proveedor/:id", "routes/dashboard.proveedor.$id.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
