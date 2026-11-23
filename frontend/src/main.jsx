import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import API_URL from "./config/api";
import "./index.css";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

export const AuthContext = createContext(null);

function AuthProvider({ children }) {
	const [user, setUser] = useState(() => {
		try {
			const stored = localStorage.getItem("user");
			return stored ? JSON.parse(stored) : null;
		} catch {
			return null;
		}
	});

	const [accessToken, setAccessToken] = useState(null);
	const [isLoading, setIsLoading] = useState(true);

	const login = useCallback((userData, token) => {
		setUser(userData);
		setAccessToken(token);
		localStorage.setItem("user", JSON.stringify(userData));
	}, []);

	const logout = useCallback(async () => {
		try {
			await fetch(`${API_URL}/userAuthLogout`, {
				method: "POST",
				credentials: "include",
			});
		} catch (error) {
			console.error("Logout failed:", error);
		}

		setUser(null);
		setAccessToken(null);
		localStorage.removeItem("user");
	}, []);

	const refreshAccessToken = useCallback(async () => {
		try {
			const response = await fetch(`${API_URL}/refresh`, {
				method: "POST",
				credentials: "include",
			});

			if (!response.ok) {
				const storedUser = localStorage.getItem("user");
				if (!storedUser) {
					setUser(null);
					setAccessToken(null);
				}
				return null;
			}

			const data = await response.json();
			const nextToken = data.accessToken || null;
			setAccessToken(nextToken);
			return nextToken;
		} catch (error) {
			console.error("Failed to refresh access token:", error);
			setUser(null);
			setAccessToken(null);
			return null;
		} finally {
			setIsLoading(false);
		}
	}, []);

	const fetchWithAuth = useCallback(
		async (url, options = {}) => {
			const { requireAuth = true, ...requestOptions } = options;

			if (!requireAuth) {
				return fetch(url, {
					...requestOptions,
					credentials: "include",
				});
			}

			let token = accessToken;

			if (!token) {
				token = await refreshAccessToken();
			}

			if (!token) {
				return new Response(
					JSON.stringify({
						success: false,
						message: "Authentication required",
					}),
					{
						status: 401,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			const finalRequestOptions = {
				...requestOptions,
				headers: {
					...requestOptions.headers,
					Authorization: `Bearer ${token}`,
				},
				credentials: "include",
			};

			const response = await fetch(url, finalRequestOptions);

			if (response.status === 401 && !requestOptions._retry) {
				const freshToken = await refreshAccessToken();

				if (freshToken) {
					return fetch(url, {
						...finalRequestOptions,
						headers: {
							...finalRequestOptions.headers,
							Authorization: `Bearer ${freshToken}`,
						},
						_retry: true,
					});
				}
			}

			return response;
		},
		[accessToken, refreshAccessToken],
	);

	useEffect(() => {
		refreshAccessToken();
	}, [refreshAccessToken]);

	return (
		<AuthContext.Provider
			value={{
				user,
				accessToken,
				login,
				logout,
				refreshAccessToken,
				fetchWithAuth,
				isLoading,
				loading: isLoading,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export const useAuth = () => useContext(AuthContext);

ReactDOM.createRoot(document.getElementById("root")).render(
	<BrowserRouter>
		<AuthProvider>
			<App />
		</AuthProvider>
	</BrowserRouter>,
);
