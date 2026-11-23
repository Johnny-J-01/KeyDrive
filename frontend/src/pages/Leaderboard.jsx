import { useEffect, useState } from "react";
import { Trophy, Search, Medal } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useAuth } from "../main";
import API_URL from "../config/api.js";

const FILTERS = ["Daily", "Weekly", "Monthly", "All Time"];

const formatDate = (dateValue) => {
	if (!dateValue) return "-";
	const parsed = new Date(dateValue);
	if (isNaN(parsed.getTime())) return "-";
	return parsed.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};

export default function Leaderboard() {
	const [activeFilter, setActiveFilter] = useState("All Time");
	const [search, setSearch] = useState("");
	const [allUsersData, setAllUsersData] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const { fetchWithAuth, loading, user, accessToken } = useAuth();
	const isAuthenticated = Boolean(user || accessToken);

	const handleFilterChange = (filter) => {
		if (filter === "All Time") {
			setActiveFilter(filter);
			return;
		}

		if (!isAuthenticated) {
			toast.error(
				"Please login to view Daily, Weekly, or Monthly leaderboard data.",
			);
			return;
		}

		setActiveFilter(filter);
	};

	useEffect(() => {
		const fetchAllUsersData = async () => {
			setIsLoading(true);
			try {
				const isPublicFilter = activeFilter === "All Time";
				const requestUrl = `${API_URL}/users/all/data?filter=${encodeURIComponent(activeFilter)}`;

				const response = isPublicFilter
					? await fetch(requestUrl, {
							method: "GET",
							credentials: "include",
						})
					: await fetchWithAuth(requestUrl, { method: "GET" });

				if (!response.ok) {
					const message = await response.json().catch(() => ({}));
					toast.error(
						message.message ||
							"Please login to view this leaderboard period.",
					);
					setAllUsersData([]);
					return;
				}

				const data = await response.json();
				setAllUsersData(Array.isArray(data.data) ? data.data : []);
			} catch (error) {
				console.error("Leaderboard fetch error:", error);
				toast.error("Failed to fetch leaderboard data");
			} finally {
				setIsLoading(false);
			}
		};

		if (!loading) {
			fetchAllUsersData();
		}
	}, [activeFilter, fetchWithAuth, loading]);

	if (isLoading || loading) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<p className="text-textMuted">Loading User Data...</p>
			</div>
		);
	}

	const filteredUsers = allUsersData.filter((user) =>
		user.username.toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<div className="flex flex-col max-w-5xl mx-auto py-8">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
				<div>
					<h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
						<Trophy className="w-8 h-8 text-primary" /> Global
						Leaderboard
					</h1>
					<p className="text-textMuted">
						Compete with the best typists around the world.
					</p>
				</div>

				<div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-borderMain">
					{FILTERS.map((f) => (
						<button
							key={f}
							onClick={() => handleFilterChange(f)}
							className={clsx(
								"px-4 py-2 text-sm font-medium rounded-md transition-colors",
								activeFilter === f
									? "bg-borderMain text-white"
									: "text-textMuted hover:text-white",
							)}
						>
							{f}
						</button>
					))}
				</div>
			</div>

			<div className="bg-surface border border-borderMain rounded-2xl overflow-hidden shadow-xl shadow-black/50">
				<div className="p-4 border-b border-borderMain flex items-center gap-4 bg-surface/50">
					<Search className="w-5 h-5 text-textMuted" />
					<input
						type="text"
						placeholder="Search players..."
						className="bg-transparent border-none outline-none text-white w-full font-medium placeholder:text-textMuted/50"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="border-b border-borderMain bg-background/50">
								<th className="px-6 py-4 text-sm font-semibold text-textMuted w-24">
									Rank
								</th>
								<th className="px-6 py-4 text-sm font-semibold text-textMuted">
									Player
								</th>
								<th className="px-6 py-4 text-sm font-semibold text-textMuted text-right">
									WPM
								</th>
								<th className="px-6 py-4 text-sm font-semibold text-textMuted text-right">
									Accuracy
								</th>
								<th className="px-6 py-4 text-sm font-semibold text-textMuted text-right">
									Date
								</th>
								<th className="px-6 py-4 text-sm font-semibold text-textMuted text-right">
									Races Won
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredUsers.map((user, index) => (
								<tr
									key={user.id}
									className="border-b border-borderMain/50 last:border-0 hover:bg-white/[0.02] transition-colors"
								>
									<td className="px-6 py-4 font-mono font-bold">
										{index === 0 && (
											<Medal className="inline w-5 h-5 text-yellow-400 mr-2" />
										)}
										{index === 1 && (
											<Medal className="inline w-5 h-5 text-gray-300 mr-2" />
										)}
										{index === 2 && (
											<Medal className="inline w-5 h-5 text-amber-600 mr-2" />
										)}
										{index > 2 && (
											<span className="ml-7 text-textMuted">
												#{index + 1}
											</span>
										)}
									</td>
									<td className="px-6 py-4">
										<div className="flex items-center gap-3">
											<img
												src={
													user.avatar ||
													user.avatar_url ||
													"👲"
												}
												alt=""
												className="w-8 h-8 rounded-full bg-borderMain"
											/>
											<span className="font-semibold text-white">
												{user.username}
											</span>
										</div>
									</td>
									<td className="px-6 py-4 text-right font-mono font-bold text-primary text-lg">
										{user.max_wpm}
									</td>
									<td className="px-6 py-4 text-right font-mono text-textMuted">
										{user.accuracy}%
									</td>
									<td className="px-6 py-4 text-right font-mono text-textMuted text-sm">
										{formatDate(user.date)}
									</td>
									<td className="px-6 py-4 text-right font-mono text-textMuted">
										{user.racesWon ?? user.races_won ?? 0}
									</td>
								</tr>
							))}
							{filteredUsers.length === 0 && (
								<tr>
									<td
										colSpan="6"
										className="px-6 py-12 text-center text-textMuted"
									>
										No players found matching "{search}"
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
