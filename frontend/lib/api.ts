import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (typeof window !== "undefined") {
      if (error.response?.status === 401) {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
        return new Promise(() => {}); // hang to prevent further error handling
      }
      if (
        error.response?.status === 403 &&
        error.response?.data?.detail === "Consent required"
      ) {
        window.location.href = "/consent";
        return new Promise(() => {}); // hang to prevent further error handling
      }
    }
    return Promise.reject(error);
  }
);

export default api;
