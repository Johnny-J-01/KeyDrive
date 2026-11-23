import { useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound, Lock } from "lucide-react";
import { toast } from "sonner";
import API_URL from "../config/api";

function ResetPassword() {
	const passwordRef = useRef(null);
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const handleResetPassword = async (event) => {
		event.preventDefault();

		const token = searchParams.get("token");
		const password = passwordRef.current?.value.trim();

		if (!token) {
			toast.error("This reset link is invalid or expired.");
			return;
		}

		if (!password || password.length < 6) {
			toast.error("Password must be at least 6 characters long.");
			return;
		}

		try {
			const response = await fetch(
				`${API_URL}/resetPassword`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ token, password }),
					credentials: "include",
				},
			);

			const data = await response.json();
			if (!response.ok) {
				toast.error(data.message || "Failed to reset the password");
				return;
			}

			toast.success(
				"Password reset successfully. Redirecting to login...",
			);
			navigate("/login");
		} catch (error) {
			console.error(error);
			toast.error("Unable to reset the password right now.");
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
						Reset password
					</h1>
					<p className="text-textMuted text-sm text-center">
						Choose a new password for your account.
					</p>
				</div>

				<form
					onSubmit={handleResetPassword}
					className="flex flex-col gap-4"
				>
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="password"
							className="text-sm font-medium text-textMuted"
						>
							New password
						</label>
						<div className="relative">
							<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
							<input
								id="password"
								type="password"
								name="password"
								ref={passwordRef}
								required
								autoComplete="new-password"
								placeholder="Enter a new password"
								className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-borderMain text-white placeholder:text-textMuted focus:outline-none focus:border-primary transition-colors"
							/>
						</div>
					</div>

					<button
						type="submit"
						className="mt-2 w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
					>
						Update password
					</button>
				</form>
			</div>
		</div>
	);
}

export default ResetPassword;
