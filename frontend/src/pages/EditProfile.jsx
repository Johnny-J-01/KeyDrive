import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Camera, ArrowLeft, Annoyed } from "lucide-react";
import { toast } from "sonner";

function EditProfile() {
	const [userData, setUserData] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [newUserData, setNewUserData] = useState(null);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchUserPeronsalData = async () => {
			try {
				const response = await fetch("http://localhost:3000/profile", {
					method: "GET",
					credentials: "include",
				});

				if (!response.ok) {
					toast.error("Failed to Fetch User Data");
					return;
				}

				const data = await response.json();
				setNewUserData(data.data.rows[0]);
			} catch (error) {
				console.error("Failed to fetch user Data:", error);
				toast.error("Failed to fetch user Data!!");
			} finally {
				setIsLoading(false);
			}
		};
		fetchUserPeronsalData();
	}, []);

	const handleEditFormChange = async (event) => {
		const { name, value } = event.target;
		setNewUserData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSaveChanges = async (event) => {
		event.preventDefault();
		const response = await fetch("http://localhost:3000/userEditProfile", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify(newUserData),
			credentials: "include",
		});

		if (!response.ok) {
			toast.error("Failed to Save!");
			return;
		}

		toast.success("Successfully saved the changes");
		navigate("/profile");
	};

	if (isLoading) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<p className="text-textMuted">Loading User Data...</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#0d0f14] text-white px-6 py-10">
			<div className="max-w-3xl mx-auto">
				{/* Back Button */}
				<Link
					to="/profile"
					className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-8"
				>
					<ArrowLeft size={18} />
					Back to Profile
				</Link>

				{/* Main Card */}
				<form
					className="bg-[#15181f] border border-slate-800 rounded-2xl overflow-hidden"
					onSubmit={handleSaveChanges}
				>
					{/* Header */}
					<div className="px-8 py-7 border-b border-slate-800">
						<h1 className="text-2xl font-bold">Edit Profile</h1>

						<p className="text-slate-400 mt-1">
							Update your profile information and preferences.
						</p>
					</div>

					{/* Profile Preview */}
					<div className="px-8 py-8 border-b border-slate-800">
						<div className="flex items-center gap-6">
							{/* Avatar */}
							<div className="relative">
								<div className="w-24 h-24 rounded-full bg-[#202c42] flex items-center justify-center overflow-hidden">
									<User
										size={38}
										className="text-slate-400"
									/>
								</div>

								<button
									type="button"
									className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[#1d2638] border border-slate-700 flex items-center justify-center text-blue-400 hover:bg-[#26334b] transition"
								>
									<Camera size={17} />
								</button>
							</div>

							<div>
								<h2 className="text-xl font-semibold">temp</h2>

								<p className="text-sm text-slate-400 mt-1">
									Change your profile picture
								</p>
							</div>
						</div>
					</div>

					{/* Form */}
					<div className="px-8 py-8 space-y-6">
						{/* Username */}
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-2">
								Username
							</label>

							<div className="relative">
								<User
									size={18}
									className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
								/>

								<input
									type="text"
									defaultValue={newUserData.username}
									placeholder="Enter your username"
									className="w-full bg-[#0d0f14] border border-slate-700 rounded-lg py-3 pl-11 pr-4 text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
									onChange={handleEditFormChange}
									name="username"
								/>
							</div>
						</div>

						{/* Email */}
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-2">
								Email
							</label>

							<div className="relative">
								<Mail
									size={18}
									className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
								/>

								<input
									type="email"
									defaultValue={newUserData.email}
									placeholder="Enter your email"
									className="w-full bg-[#0d0f14] border border-slate-700 rounded-lg py-3 pl-11 pr-4 text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
									onChange={handleEditFormChange}
									name="email"
								/>
							</div>
						</div>

						{/* Password*/}
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-2">
								Password
							</label>

							<div className="relative">
								<Mail
									size={18}
									className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
								/>

								<input
									type="password"
									placeholder="Enter your new Password"
									defaultValue={newUserData.password_hash}
									className="w-full bg-[#0d0f14] border border-slate-700 rounded-lg py-3 pl-11 pr-4 text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
									onChange={handleEditFormChange}
									name="password"
								/>
							</div>
						</div>

						{/* Buttons */}
						<div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
							<Link
								to="/profile"
								className="px-5 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition"
							>
								Cancel
							</Link>

							<button
								className="px-6 py-2.5 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition"
								type="submit"
							>
								Save Changes
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}

export default EditProfile;
