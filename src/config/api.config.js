// API Configuration
export const API_URL = "https://evil-wings-eat.loca.lt/api/v1";
console.log("API URL:", API_URL);

export const API_CONFIG = {
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  getAuthHeader: () => {
    console.log("api.config.js: getAuthHeader was called!");
    const token = localStorage.getItem("token");
    const employeeCode = localStorage.getItem("emp_code") || "";

    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(employeeCode ? { "X-Employee-Code": employeeCode } : {}),
    };
  },
};
