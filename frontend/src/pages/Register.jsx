import React from "react";
import { Link } from "react-router-dom";
import { Keyboard } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function Register() {
	const [userFormData, setUserFormData] = React.useState({
		userName: "",
		userEmail: "",
		userPassword: "",
	});

	const handleFormDataChange = (event) => {
		const { name, value } = event.target;
		setUserFormData((prev) => ({
			...userFormData,
			[name]: value,
		}));
	};

	const handleFormSubmit = async (event) => {
		event.preventDefault();
		const response = await fetch("http://localhost:3000/userAuthRegister", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify(userFormData),
			credentials: "include",
		});

		const data = await response.json();

		if (!response.ok) {
			toast.error(data.message || "Registration failed");
			return;
		}
		toast.success(
			"Registration successful! Please check your email to verify your account.",
		);
	};

	return (
		<div className="flex flex-col items-center justify-center py-12">
			<div className="w-full max-w-md bg-surface border border-borderMain p-8 rounded-2xl">
				<div className="flex flex-col items-center mb-8">
					<div className="bg-primary/10 p-3 rounded-xl mb-4">
						<Keyboard className="w-8 h-8 text-primary" />
					</div>
					<h1 className="text-2xl font-bold text-white mb-2">
						Create an account
					</h1>
					<p className="text-textMuted text-sm">
						Join Keydrive to track your progress
					</p>
				</div>

				<form
					className="flex flex-col gap-4"
					onSubmit={handleFormSubmit}
				>
					<div className="flex flex-col gap-1.5">
						<label className="text-sm font-medium text-textMuted">
							Username
						</label>
						<input
							type="text"
							className="px-4 py-2.5 rounded-lg bg-background border border-borderMain text-white focus:outline-none focus:border-primary transition-colors"
							placeholder="SpeedTypist99"
							name="userName"
							value={userFormData.userName}
							onChange={handleFormDataChange}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="text-sm font-medium text-textMuted">
							Email
						</label>
						<input
							type="email"
							className="px-4 py-2.5 rounded-lg bg-background border border-borderMain text-white focus:outline-none focus:border-primary transition-colors"
							placeholder="you@example.com"
							name="userEmail"
							value={userFormData.userEmail}
							onChange={handleFormDataChange}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="text-sm font-medium text-textMuted">
							Password
						</label>
						<input
							type="password"
							className="px-4 py-2.5 rounded-lg bg-background border border-borderMain text-white focus:outline-none focus:border-primary transition-colors"
							placeholder="••••••••"
							name="userPassword"
							value={userFormData.userPassword}
							onChange={handleFormDataChange}
						/>
					</div>
					<button className="mt-4 w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors">
						Create Account
					</button>
				</form>

				<p className="mt-8 text-center text-sm text-textMuted">
					Already have an account?{" "}
					<Link to="/login" className="text-primary hover:underline">
						Log in
					</Link>
				</p>
			</div>
		</div>
	);
}
