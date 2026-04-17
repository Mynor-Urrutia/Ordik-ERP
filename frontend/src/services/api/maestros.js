import client from "./client";

const resource = (path) => ({
  getAll: (params) => client.get(`/maestros/${path}/`, { params }),
  get: (id) => client.get(`/maestros/${path}/${id}/`),
  create: (data) => client.post(`/maestros/${path}/`, data),
  update: (id, data) => client.put(`/maestros/${path}/${id}/`, data),
  remove: (id) => client.delete(`/maestros/${path}/${id}/`),
});

export const marcasService       = resource("marcas");
export const modelosService      = resource("modelos");
export const tiposPagoService    = resource("tipos-pago");
export const tiposTrabajoService = resource("tipos-trabajo");
export const tiposEstatusService = resource("tipos-estatus");
export const tiposServicioService = resource("tipos-servicio");
export const personalService     = resource("personal");
export const tiposClienteService  = resource("tipos-cliente");
export const tiposProductoService     = resource("tipos-producto");
export const categoriasProductoService = resource("categorias-producto");
export const unidadesMedidaService     = resource("unidades-medida");
export const motivosSalidaService      = resource("motivos-salida");

export const empresaService = {
  get:    ()     => client.get("/maestros/empresa/"),
  update: (data) => client.put("/maestros/empresa/", data),
};
