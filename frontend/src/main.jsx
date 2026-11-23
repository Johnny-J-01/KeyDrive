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
	useRef,
	useState,
} from "react";

export const AuthContext = createContext(null);

const decodeJwtPayload = (token) => {
	try {
		const base64Payload = token.split(".")[1];
		const normalized = base64Payload.replace(/-/g, "+").replace(/_/g, "/");
		const padded = normalized.padEnd(
			normalized.length + ((4 - (normalized.length % 4)) % 4),
			"=",
		);

		return JSON.parse(atob(padded));
	} catch {
		return null;
	}
};

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
	const refreshPromiseRef = useRef(null);

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

	const refreshAccessToken = useCallback(() => {
		if (refreshPromiseRef.current) {
			return refreshPromiseRef.current;
		}

		const refreshPromise = (async () => {
			try {
				const response = await fetch(`${API_URL}/refresh`, {
					method: "POST",
					credentials: "include",
				});

				if (response.status === 401 || response.status === 403) {
					setUser(null);
					setAccessToken(null);
					localStorage.removeItem("user");
					return null;
				}

				if (!response.ok) {
					return null;
				}

				const data = await response.json();
				const nextToken = data.accessToken || null;

				if (!nextToken) {
					return null;
				}

				const payload = decodeJwtPayload(nextToken);

				if (payload?.userId) {
					setUser((currentUser) => {
						if (currentUser?.id === payload.userId) {
							return currentUser;
						}

						const restoredUser = { id: payload.userId };

						try {
							localStorage.setItem(
								"user",
								JSON.stringify(restoredUser),
							);
						} catch (error) {
							console.error(
								"Failed to persist restored user:",
								error,
							);
						}

						return restoredUser;
					});
				}

				setAccessToken(nextToken);
				return nextToken;
			} catch (error) {
				console.error("Failed to refresh access token:", error);
				return null;
			} finally {
				setIsLoading(false);
			}
		})();

		refreshPromiseRef.current = refreshPromise;
		void refreshPromise.finally(() => {
			if (refreshPromiseRef.current === refreshPromise) {
				refreshPromiseRef.current = null;
			}
		});

		return refreshPromise;
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
