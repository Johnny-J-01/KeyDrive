import React from "react";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { toast } from "sonner";

function ForgotPassword() {
	const emailRef = useRef();
	const navigate = useNavigate();

	const handleBackToLogin = () => {
		navigate("/Login");
	};

	const handleForgetPassword = async () => {
		try {
			const email = emailRef.current.value;

			const response = await fetch(
				"http://localhost:3000/api/password/ForgotPassword",
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
				console.log(data.message);
				return;
			}

			console.log(data);
			toast.success("Reset Password Link sent to your email");
		} catch (error) {
			console.log(error);
		}
	};

	return (
		<div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 ">
			<div className="sm:mx-auto sm:w-full sm:max-w-sm">
				<h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-white">
					Forgot password?
				</h2>
				<p className="text-gray-400 text-center">
					Enter your email and we will send you a link to reset your
					password to your registered email
				</p>
			</div>

			<div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
				<form className="space-y-6">
					<div>
						<label
							htmlFor="email"
							className="block text-sm/6 font-medium text-gray-100"
						>
							Email
						</label>
						<div className="mt-2">
							<input
								id="email"
								type="email"
								name="email"
								ref={emailRef}
								required
								autoComplete="email"
								className="block w-full rounded-md text-black bg-white px-3 py-1.5 text-bas outline-1 -outline-offset-1 focus:outline-indigo-500 sm:text-sm/6"
								placeholder="example@gmail.com"
							/>
						</div>
					</div>
				</form>
				<div>
					<button
						onClick={handleForgetPassword}
						type="submit"
						className="mt-5 *:flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
					>
						Reset Password
					</button>
					<button
						onClick={handleBackToLogin}
						className="mt-5 *:flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 border-2 border-indigo-400"
					>
						Back to Login page
					</button>
				</div>
			</div>
		</div>
	);
}

export default ForgotPassword;
