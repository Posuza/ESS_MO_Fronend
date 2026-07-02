// API Configuration
export const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

if (!API_URL && import.meta.env.MODE === "production") {
  throw new Error("VITE_API_URL must be set in production");
}

if (import.meta.env.MODE !== "production") {
  console.log("API URL:", API_URL || "not set (development)");
}

export const API_CONFIG = {
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  getAuthHeader: () => {
    const token = localStorage.getItem("token");
    const employeeCode = sessionStorage.getItem("emp_code") || "";
    const lat = localStorage.getItem("geo_lat");
    const lng = localStorage.getItem("geo_lng");
    const geoStatus = localStorage.getItem("geo_status");

    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(employeeCode ? { "X-Employee-Code": employeeCode } : {}),
      ...(lat && lng
        ? { "X-Latitude": lat, "X-Longitude": lng }
        : geoStatus
          ? { "X-Geo-Status": geoStatus }
          : {}),
    };
  },
};
