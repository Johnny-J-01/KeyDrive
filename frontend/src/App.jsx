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
import LiveRace from "./pages/LiveRace";

function App() {
	return (
		<div className="flex flex-col bg-black text-textMain font-sans selection:bg-primary/30 selection:text-white min-h-full">
			<Navbar />
			<main className="w-full max-w-6xl mx-auto px-6 py-6">
				<Routes>
					<Route path="/" element={<Practice />} />
					<Route path="/practice" element={<Practice />} />
					<Route path="/home" element={<Home />} />
					<Route path="/leaderboard" element={<Leaderboard />} />
					<Route path="/race" element={<Race />} />
					<Route path="/live" element={<LiveRace />} />
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
					position="bottom-right"
					visibleToasts={100}
					expand
					closeButton
				/>
			</main>
		</div>
	);
}

export default App;
