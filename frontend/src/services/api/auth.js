import api from "./client";

const authService = {
  login: (username, password) => api.post("/auth/login/", { username, password }),
  me:    ()                   => api.get("/auth/me/"),
};

export default authService;
