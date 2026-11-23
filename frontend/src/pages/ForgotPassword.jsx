import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";
import API_URL from "../config/api";

function ForgotPassword() {
	const emailRef = useRef(null);
	const navigate = useNavigate();

	const handleBackToLogin = () => {
		navigate("/login");
	};

	const handleForgetPassword = async (event) => {
		event.preventDefault();

		const email = emailRef.current?.value.trim();
		if (!email) {
			toast.error("Please enter your email address.");
			return;
		}

		try {
			const response = await fetch(
				`${API_URL}/api/password/ForgotPassword`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ email }),
					credentials: "include",
				},
			);

			const data = await response.json();

			if (!response.ok) {
				toast.error(data.message || "Unable to send reset link.");
				return;
			}

			toast.success("Reset link sent to your email.");
			emailRef.current.value = "";
		} catch (error) {
			console.error(error);
			toast.error("Unable to connect to the server.");
		}
	};

	return (
		<div className="flex flex-col items-center justify-center py-20">
			<div className="w-full max-w-md bg-surface border border-borderMain rounded-2xl p-8">
				<div className="flex flex-col items-center mb-8">
					<div className="bg-primary/10 p-3 rounded-xl mb-4">
						<KeyRound className="w-8 h-8 text-primary" />
					</div>
					<h1 className="text-2xl font-bold text-white mb-2">
						Forgot password
					</h1>
					<p className="text-textMuted text-sm text-center">
						Enter your email and we’ll send a reset link to your
						registered account.
					</p>
				</div>

				<form
					className="flex flex-col gap-4"
					onSubmit={handleForgetPassword}
				>
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="email"
							className="text-sm font-medium text-textMuted"
						>
							Email
						</label>
						<div className="relative">
							<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
							<input
								id="email"
								type="email"
								name="email"
								ref={emailRef}
								required
								autoComplete="email"
								placeholder="you@example.com"
								className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-borderMain text-white placeholder:text-textMuted focus:outline-none focus:border-primary transition-colors"
							/>
						</div>
					</div>

					<button
						type="submit"
						className="mt-2 w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
					>
						Send reset link
					</button>
				</form>

				<div className="mt-6 flex items-center justify-between gap-3">
					<button
						type="button"
						onClick={handleBackToLogin}
						className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
					>
						<ArrowLeft className="w-4 h-4" />
						Back to login
					</button>

					<Link
						to="/login"
						className="text-sm text-textMuted hover:text-white"
					>
						Need an account?
					</Link>
				</div>
			</div>
		</div>
	);
}

export default ForgotPassword;
