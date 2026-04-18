import api from "./client";

const usuariosService = {
  getAll:           ()         => api.get("/usuarios/"),
  get:              (id)       => api.get(`/usuarios/${id}/`),
  create:           (data)     => api.post("/usuarios/", data),
  update:           (id, data) => api.put(`/usuarios/${id}/`, data),
  patch:            (id, data) => api.patch(`/usuarios/${id}/`, data),
  remove:           (id)       => api.delete(`/usuarios/${id}/`),
  cambiarPassword:  (id, data) => api.post(`/usuarios/${id}/cambiar-password/`, data),
  getRolesPermisos: ()         => api.get("/usuarios/roles-permisos/"),
};

export default usuariosService;
