import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Practice from "./pages/Practice";
import Leaderboard from "./pages/Leaderboard";
import Race from "./pages/Race";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import EditProfile from "./pages/EditProfile";
import { Toaster } from "sonner";

function App() {
	return (
		<div className="min-h-screen flex flex-col bg-background text-textMain font-sans selection:bg-primary/30 selection:text-white">
			<Navbar />
			<main className="flex-grow max-w-6xl w-full mx-auto p-6">
				<Routes>
					<Route path="/" element={<Practice />} />
					<Route path="/practice" element={<Practice />} />
					<Route path="/home" element={<Home />} />
					<Route path="/leaderboard" element={<Leaderboard />} />
					<Route path="/race" element={<Race />} />
					<Route path="/profile" element={<Profile />} />
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />
					<Route path="/EditProfile" element={<EditProfile />} />
					<Route
						path="/forgot-password"
						element={<ForgotPassword />}
					/>
					<Route path="/reset-password" element={<ResetPassword />} />
					<Route path="/verify-email" element={<VerifyEmail />} />
					<Route path="/dashboard" element={<Profile />} />{" "}
					{/* Alias for now */}
				</Routes>
				<Toaster
					richColors
					position="top-right"
					visibleToasts={100}
					expand
					closeButton
				/>
			</main>
		</div>
	);
}

export default App;
