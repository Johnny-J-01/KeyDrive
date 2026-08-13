import React from "react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

function ResetPassword() {
	const passwordRef = useRef();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const handleResetPassword = async (event) => {
		event.preventDefault();
		try {
			const token = searchParams.get("token");
			const password = passwordRef.current.value;

			const response = await fetch(
				"http://localhost:3000/resetPassword",
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ token: token, password: password }),
					credentials: "include",
				},
			);
			if (!response.ok) {
				console.log("Failed to reset the password");
				return;
			}

			const data = await response.json();
			navigate("/Login");
			toast.success(
				"Password has been successfully reset, redirecting to the login page",
			);
		} catch (error) {
			console.log(error.message);
		}
	};

	return (
		<>
			<div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 ">
				<div className="sm:mx-auto sm:w-full sm:max-w-sm">
					<h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-white">
						Reset password
					</h2>
				</div>

				<div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
					<form onSubmit={handleResetPassword} className="space-y-6">
						<div>
							<label
								htmlFor="password"
								className="block text-sm/6 font-medium text-gray-100"
							>
								Password
							</label>
							<div className="mt-2">
								<input
									id="password"
									type="password"
									name="password"
									ref={passwordRef}
									required
									autoComplete="on"
									className="block w-full rounded-md text-black bg-white px-3 py-1.5 text-bas outline-1 -outline-offset-1 focus:outline-indigo-500 sm:text-sm/6"
									placeholder="password"
								/>
							</div>
						</div>
						<div>
							<button
								type="submit"
								className="mt-5 *:flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
							>
								Reset Password
							</button>
						</div>
					</form>
				</div>
			</div>
		</>
	);
}

export default ResetPassword;
