import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { createContext, useContext, useState } from "react";

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

	const login = (userData) => {
		setUser(userData);
		localStorage.setItem("user", JSON.stringify(userData));
	};

	const logout = async () => {
		try {
			await fetch("http://localhost:3000/userAuthLogout", {
				credentials: "include",
			});
		} catch (error) {
			console.error("Logout failed:", error);
		}
		setUser(null);
		localStorage.removeItem("user");
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				login,
				logout,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export const useAuth = () => useContext(AuthContext);

ReactDOM.createRoot(document.getElementById("root")).render(
	// <React.StrictMode>
	<BrowserRouter>
		<AuthProvider>
			<App />
		</AuthProvider>
	</BrowserRouter>,
	// </React.StrictMode>,
);
