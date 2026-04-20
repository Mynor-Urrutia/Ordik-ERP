import api from "./client";

const qs = (params) => {
  const p = new URLSearchParams();
  if (params?.fecha_desde) p.set("fecha_desde", params.fecha_desde);
  if (params?.fecha_hasta) p.set("fecha_hasta", params.fecha_hasta);
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const reportesService = {
  getResumen:    ()       => api.get("/reportes/resumen/"),
  getVentas:     (params) => api.get(`/reportes/ventas/${qs(params)}`),
  getCompras:    (params) => api.get(`/reportes/compras/${qs(params)}`),
  getCxC:        ()       => api.get("/reportes/cxc/"),
  getInventario: ()       => api.get("/reportes/inventario/"),
  getOTs:        (params) => api.get(`/reportes/ots/${qs(params)}`),
};
