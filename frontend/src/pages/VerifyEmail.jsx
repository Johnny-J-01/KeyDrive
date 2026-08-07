import { useState } from "react";
import { Loader2, MailCheck, CircleX } from "lucide-react";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const VerifyEmail = () => {
	const [status, setStatus] = useState("loading");
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	// loading | success | error

	useEffect(() => {
		const token = searchParams.get("token");

		const verifyEmail = async () => {
			const response = await fetch(
				`http://localhost:3000/api/users/verify-email/${token}`,
				{
					method: "GET",
					credentials: "include",
				},
			);
			if (!response.ok) {
				setStatus("error");
				return;
			}
			const data = await response.json();
			setStatus("success");
			toast.success(
				"Successfully verified the Email, Redirecting to the login page",
			);
			navigate("../Login");
		};

		verifyEmail();
	});

	return (
		<div className="min-h-screen bg-black flex justify-center items-center px-6">
			<div className="w-full max-w-lg">
				{/* Loading */}
				{status === "loading" && (
					<>
						<div className="flex justify-center mb-8">
							<div className="border border-indigo-500 rounded-full p-5">
								<Loader2 className="h-14 w-14 text-indigo-500 animate-spin" />
							</div>
						</div>

						<h1 className="text-5xl font-bold text-white text-center">
							Verifying
						</h1>

						<p className="text-gray-300 text-xl mt-3 text-center font-[Patrick_Hand]">
							Please wait while we verify your email.
						</p>
					</>
				)}

				{/* Success */}
				{status === "success" && (
					<>
						<div className="flex justify-center mb-8">
							<div className="border border-green-500 rounded-full p-5">
								<MailCheck className="h-14 w-14 text-green-500" />
							</div>
						</div>

						<h1 className="text-5xl font-bold text-white text-center">
							Verified
						</h1>

						<p className="text-green-400 text-xl mt-3 text-center font-[Patrick_Hand]">
							Your email has been verified successfully.
						</p>

						<p className="text-indigo-400 text-lg mt-10 text-center font-[Patrick_Hand]">
							Redirecting to Login...
						</p>
					</>
				)}

				{/* Error */}
				{status === "error" && (
					<>
						<div className="flex justify-center mb-8">
							<div className="border border-red-500 rounded-full p-5">
								<CircleX className="h-14 w-14 text-red-500" />
							</div>
						</div>

						<h1 className="text-5xl font-bold text-white text-center">
							Oops!
						</h1>

						<p className="text-red-400 text-xl mt-3 text-center font-[Patrick_Hand]">
							This verification link is invalid or has expired.
						</p>

						<button className="mt-10 w-full rounded-xl border border-indigo-500 bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-xl font-bold transition">
							Back To Login
						</button>
					</>
				)}
			</div>
		</div>
	);
};

export default VerifyEmail;
