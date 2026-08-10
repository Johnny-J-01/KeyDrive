import { Link, useNavigate } from "react-router-dom";
import { Keyboard } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { useAuth } from "../main";

export default function Login() {
	const [userFormData, setUserFormData] = React.useState({
		userEmail: "",
		userPassword: "",
	});
	const navigate = useNavigate();

	const handleFormOnChange = (event) => {
		const { name, value } = event.target;
		setUserFormData((prev) => ({ ...prev, [name]: value }));
	};

	const { login } = useAuth();

	const handleLoginFormSubmit = async (event) => {
		event.preventDefault();
		const response = await fetch("http://localhost:3000/userAuthLogin", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify(userFormData),
			credentials: "include",
		});

		if (!response.ok) {
			toast.error("failed to login");
			return;
		}

		const data = await response.json();
		console.log(data);
		login(data.user);
		toast.success("Successfully Logged in!");
		navigate("/profile");
	};

	return (
		<div className="flex flex-col items-center justify-center py-20">
			<div className="w-full max-w-md bg-surface border border-borderMain p-8 rounded-2xl">
				<div className="flex flex-col items-center mb-8">
					<div className="bg-primary/10 p-3 rounded-xl mb-4">
						<Keyboard className="w-8 h-8 text-primary" />
					</div>
					<h1 className="text-2xl font-bold text-white mb-2">
						Welcome back
					</h1>
					<p className="text-textMuted text-sm">
						Log in to your Keydrive account
					</p>
				</div>

				<form
					className="flex flex-col gap-4"
					onSubmit={handleLoginFormSubmit}
				>
					<div className="flex flex-col gap-1.5">
						<label
							className="text-sm font-medium text-textMuted"
							htmlFor="userEmail"
						>
							Email
						</label>
						<input
							type="email"
							className="px-4 py-2.5 rounded-lg bg-background border border-borderMain text-white focus:outline-none focus:border-primary transition-colors"
							placeholder="you@example.com"
							id="userEmail"
							name="userEmail"
							value={userFormData.userEmail}
							onChange={handleFormOnChange}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label
							className="text-sm font-medium text-textMuted flex justify-between"
							htmlFor="userPassword"
						>
							Password
							<Link
								to="/forgot-password"
								className="text-primary hover:underline"
							>
								Forgot?
							</Link>
						</label>
						<input
							type="password"
							className="px-4 py-2.5 rounded-lg bg-background border border-borderMain text-white focus:outline-none focus:border-primary transition-colors"
							placeholder="••••••••"
							id="userPassword"
							name="userPassword"
							value={userFormData.userPassword}
							onChange={handleFormOnChange}
						/>
					</div>
					<button className="mt-2 w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors">
						Sign In
					</button>
				</form>

				<div className="mt-6 flex items-center gap-4">
					<div className="h-px bg-borderMain flex-1" />
					<span className="text-xs text-textMuted uppercase tracking-wider font-semibold">
						Or continue with
					</span>
					<div className="h-px bg-borderMain flex-1" />
				</div>

				<button className="mt-6 w-full py-2.5 bg-background border border-borderMain text-white font-medium rounded-lg hover:bg-white/[0.02] transition-colors flex items-center justify-center gap-2">
					<svg className="w-5 h-5" viewBox="0 0 24 24">
						<path
							fill="currentColor"
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						/>
						<path
							fill="#34A853"
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						/>
						<path
							fill="#FBBC05"
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
						/>
						<path
							fill="#EA4335"
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						/>
					</svg>
					Google
				</button>

				<p className="mt-8 text-center text-sm text-textMuted">
					Don't have an account?{" "}
					<Link
						to="/register"
						className="text-primary hover:underline"
					>
						Sign up
					</Link>
				</p>
			</div>
		</div>
	);
}
