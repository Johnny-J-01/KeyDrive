import { Link, useLocation, useNavigate } from "react-router-dom";
import { Keyboard, Trophy, User, Activity } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../main";

const navLinks = [
	{ path: "/practice", label: "Practice", icon: Keyboard },
	{ path: "/race", label: "Race", icon: Activity },
	{ path: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export default function Navbar() {
	const location = useLocation();
	const navigate = useNavigate();
	const { user, logout } = useAuth();

	const handleLogout = async () => {
		await logout();
		navigate("/");
	};

	return (
		<nav className="border-b border-borderMain sticky top-0 bg-background/90 backdrop-blur z-50">
			<div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
				<Link to="/" className="flex items-center gap-2 group">
					<div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
						<Keyboard className="w-5 h-5 text-primary" />
					</div>
					<span className="font-bold text-xl tracking-tight text-white">
						Keydrive
					</span>
				</Link>

				<div className="hidden md:flex items-center gap-8">
					{navLinks.map((link) => {
						const Icon = link.icon;
						const isActive = location.pathname === link.path;
						return (
							<Link
								key={link.path}
								to={link.path}
								className={clsx(
									"flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
									isActive
										? "text-primary"
										: "text-textMuted",
								)}
							>
								<Icon className="w-4 h-4" />
								{link.label}
							</Link>
						);
					})}
				</div>

				<div className="flex items-center gap-4">
					{user ? (
						<>
							<Link
								to="/profile"
								className="flex items-center gap-2 text-sm font-medium text-textMuted hover:text-white transition-colors"
							>
								<User className="w-4 h-4" />
								Profile
							</Link>
							<button
								type="button"
								onClick={handleLogout}
								className="text-sm font-medium bg-white text-background px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
							>
								Logout
							</button>
						</>
					) : (
						<>
							<Link
								to="/login"
								className="text-sm font-medium text-textMuted hover:text-white transition-colors"
							>
								Log in
							</Link>
							<Link
								to="/register"
								className="text-sm font-medium bg-white text-background px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
							>
								Sign up
							</Link>
						</>
					)}
				</div>
			</div>
		</nav>
	);
}
