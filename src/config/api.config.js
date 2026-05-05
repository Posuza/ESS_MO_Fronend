// API Configuration
export const API_URL = import.meta.env.VITE_API_URL || "https://new-garlics-dig.loca.lt/api/v1";
console.log("🔧 API URL:", API_URL);
console.log("🌍 User Agent:", navigator.userAgent);
console.log("📱 Platform:", navigator.platform);

export const API_CONFIG = {
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  getAuthHeader: () => {
    console.log("🔑 api.config.js: getAuthHeader was called!");
    const token = localStorage.getItem("token");
    const employeeCode = localStorage.getItem("emp_code") || "";
    console.log("🔑 Token exists:", !!token);
    console.log("🔑 Employee Code:", employeeCode);

    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(employeeCode ? { "X-Employee-Code": employeeCode } : {}),
    };
  },
};
