const rawUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_URL = rawUrl.replace(/\/+$/, "");

export const WS_URL = API_URL.startsWith("https://")
	? API_URL.replace(/^https:\/\//, "wss://")
	: API_URL.replace(/^http:\/\//, "ws://");

export default API_URL;
