import api from "./client";

export const reportesService = {
  getResumen: () => api.get("/reportes/resumen/"),
};
