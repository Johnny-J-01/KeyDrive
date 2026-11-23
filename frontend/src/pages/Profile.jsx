import {
	Activity,
	Clock,
	Trophy,
	Target,
	Flame,
	Zap,
	Shield,
	Lock,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../main";
import API_URL from "../config/api.js";
import clsx from "clsx";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Area,
	ComposedChart,
} from "recharts";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
} from "../components/ui/chart";

const chartConfig = {
	wpm: {
		label: "WPM",
		color: "#e2b714",
	},
	accuracy: {
		label: "Accuracy",
		color: "#7c8aff",
	},
};

export default function Profile() {
	const [userPersonalData, setUserPersonalData] = useState(null);
	const [userStatData, setUserStatData] = useState(null);
	const [performanceHistory, setPerformanceHistory] = useState([]);
	const [historyLoading, setHistoryLoading] = useState(true);
	const [historyError, setHistoryError] = useState(null);
	const navigate = useNavigate();
	const { accessToken, loading, fetchWithAuth } = useAuth();

	useEffect(() => {
		if (loading || !accessToken) {
			return;
		}

		const fetchData = async () => {
			const response = await fetchWithAuth(`${API_URL}/profile`, {
				method: "GET",
			});

			const data = await response.json();

			if (!response.ok) {
				toast.error("Unable to fetch User Data");
				return;
			}

			setUserPersonalData(data.data.rows[0]);
		};

		const fetchUserStatData = async () => {
			const response = await fetchWithAuth(`${API_URL}/stats`, {
				method: "GET",
			});

			if (!response.ok) {
				toast.error("Unable to fetch User Stats Data");
				return;
			}

			const statData = await response.json();
			setUserStatData(statData.data);
		};

		const fetchPerformanceHistory = async () => {
			setHistoryLoading(true);
			setHistoryError(null);
			try {
				const response = await fetchWithAuth(
					`${API_URL}/stats/history`,
					{
						method: "GET",
					},
				);

				if (!response.ok) {
					setHistoryError("Unable to fetch performance history");
					return;
				}

				const resJson = await response.json();
				setPerformanceHistory(
					Array.isArray(resJson.data) ? resJson.data : [],
				);
			} catch (err) {
				setHistoryError("Unable to fetch performance history");
			} finally {
				setHistoryLoading(false);
			}
		};

		fetchData();
		fetchUserStatData();
		fetchPerformanceHistory();
	}, [accessToken, loading, fetchWithAuth]);

	const handleEditButton = () => {
		navigate("/EditProfile");
	};

	return (
		<div className="max-w-5xl mx-auto py-8 flex flex-col gap-6">
			<div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-6 p-6 bg-surface border border-borderMain rounded-2xl">
				<div className="flex items-center gap-4">
					<img
						src={
							!userPersonalData
								? "👲"
								: userPersonalData.avatar_url
						}
						alt="avatar"
						className="w-16 h-16 rounded-full bg-borderMain p-0.5 object-cover"
					/>
					<div>
						<h2>
							{loading
								? "Loading..."
								: userPersonalData?.username ||
									"Profile unavailable"}
						</h2>
						<p className="text-textMuted flex items-center gap-1.5 text-sm mt-0.5">
							<Clock className="w-3.5 h-3.5" /> Joined August 2026
						</p>
					</div>
				</div>

				<div className="flex flex-col items-center gap-2 px-6 border-l border-borderMain">
					<p className="text-sm text-textMuted flex items-center gap-1.5 font-medium">
						<Trophy className="w-4 h-4 text-yellow-500" />{" "}
						Achievements
					</p>
					<div className="flex gap-2">
						<div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center">
							<Trophy className="w-4 h-4 text-yellow-500" />
						</div>
						<div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
							<Zap className="w-4 h-4 text-purple-400" />
						</div>
						<div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center">
							<Target className="w-4 h-4 text-blue-400" />
						</div>
						<div className="w-9 h-9 rounded-full bg-gray-500/20 flex items-center justify-center">
							<Lock className="w-4 h-4 text-gray-500" />
						</div>
					</div>
				</div>

				<div className="flex flex-col items-center px-6 border-l border-borderMain">
					<p className="text-sm text-textMuted flex items-center gap-1.5 font-medium">
						<Flame className="w-4 h-4 text-orange-400" /> Current
						Streak
					</p>
					<p className="text-2xl font-bold text-white mt-1">
						{!userStatData ? "0 days" : userStatData.streak}
					</p>
					<p className="text-xs text-textMuted">Keep going!</p>
				</div>

				<button
					className="px-5 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-medium rounded-lg text-sm"
					onClick={handleEditButton}
				>
					Edit Profile
				</button>
			</div>

			<div className="grid grid-cols-3 gap-4">
				<StatCard
					icon={Activity}
					label="Average WPM"
					value={!userStatData ? 0 : `${userStatData.AVG_WPM}`}
				/>
				<StatCard
					icon={Target}
					label="Accuracy"
					value={!userStatData ? 0 : `${userStatData.AVG_Acc}%`}
				/>
				<StatCard
					icon={Trophy}
					label="Races Won"
					value={!userStatData ? 0 : (userStatData.racesWon ?? 0)}
				/>
			</div>

			<PerformanceGraph
				history={performanceHistory}
				loading={historyLoading}
				error={historyError}
			/>
		</div>
	);
}

function PerformanceGraph({ history, loading, error }) {
	const [filter, setFilter] = useState("All");

	if (loading) {
		return (
			<div className="bg-surface border border-borderMain rounded-2xl p-6 flex flex-col items-center justify-center min-h-[420px]">
				<Activity className="w-8 h-8 text-[#e2b714] animate-pulse mb-3" />
				<p className="text-textMuted text-sm font-mono">
					loading history...
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-surface border border-borderMain rounded-2xl p-6 flex flex-col items-center justify-center min-h-[420px]">
				<p className="text-error text-sm font-mono mb-1">{error}</p>
				<p className="text-textMuted text-xs">
					Could not load performance records
				</p>
			</div>
		);
	}

	const filteredData = history.filter((item) => {
		if (filter === "Practice") return item.type === "Practice";
		if (filter === "Race") return item.type === "Multiplayer Race";
		return true;
	});

	if (filteredData.length === 0) {
		return (
			<div className="bg-surface border border-borderMain rounded-2xl p-6 flex flex-col justify-between min-h-[420px]">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-bold text-white flex items-center gap-2">
						<Activity className="text-[#e2b714] w-5 h-5" />{" "}
						Performance History
					</h3>
					<FilterPills filter={filter} setFilter={setFilter} />
				</div>
				<div className="flex flex-col items-center justify-center my-auto py-10 text-center">
					<Activity className="w-12 h-12 text-borderMain/60 mb-3" />
					<h4 className="text-white font-mono font-medium mb-1">
						no data recorded
					</h4>
					<p className="text-xs text-textMuted max-w-xs font-mono">
						complete a practice test or multiplayer race to see your
						graph
					</p>
				</div>
			</div>
		);
	}

	const peakWpm = Math.max(...filteredData.map((d) => d.wpm || 0));
	const avgWpm = Math.round(
		filteredData.reduce((sum, d) => sum + (d.wpm || 0), 0) /
			filteredData.length,
	);
	const avgAcc = Math.round(
		filteredData.reduce((sum, d) => sum + (d.accuracy || 0), 0) /
			filteredData.length,
	);

	const chartData = filteredData.map((item) => {
		let label = "";
		if (item.timestamp) {
			const d = new Date(item.timestamp);
			if (!isNaN(d.getTime())) {
				label = d.toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
				});
			}
		}
		return {
			date: label,
			wpm: item.wpm || 0,
			accuracy: item.accuracy || 0,
			type: item.type,
			placement: item.placement,
			timestamp: item.timestamp,
		};
	});

	return (
		<div className="bg-surface border border-borderMain rounded-2xl p-6 flex flex-col gap-5">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-bold text-white flex items-center gap-2">
					<Activity className="text-[#e2b714] w-5 h-5" /> Performance
					History
				</h3>
				<FilterPills filter={filter} setFilter={setFilter} />
			</div>

			<div className="grid grid-cols-3 gap-4">
				<div className="px-4 py-3">
					<p className="text-[11px] uppercase tracking-widest text-textMuted font-mono mb-1.5">
						Peak WPM
					</p>
					<p className="text-2xl font-bold font-mono text-[#e2b714]">
						{peakWpm}{" "}
						<span className="text-sm font-normal text-[#e2b714]/60">
							wpm
						</span>
					</p>
				</div>
				<div className="px-4 py-3 border-l border-borderMain">
					<p className="text-[11px] uppercase tracking-widest text-textMuted font-mono mb-1.5">
						Avg Speed
					</p>
					<p className="text-2xl font-bold font-mono text-white">
						{avgWpm}{" "}
						<span className="text-sm font-normal text-textMuted">
							wpm
						</span>
					</p>
				</div>
				<div className="px-4 py-3 border-l border-borderMain">
					<p className="text-[11px] uppercase tracking-widest text-textMuted font-mono mb-1.5">
						Avg Accuracy
					</p>
					<p className="text-2xl font-bold font-mono text-white">
						{avgAcc}
						<span className="text-sm font-normal text-textMuted">
							%
						</span>
					</p>
				</div>
			</div>

			<ChartContainer
				config={chartConfig}
				className="h-[300px] w-full [&_.recharts-cartesian-axis-tick_text]:!fill-[#64748b] [&_.recharts-cartesian-axis-tick_text]:!font-mono [&_.recharts-cartesian-axis-tick_text]:!text-[11px]"
			>
				<ComposedChart
					data={chartData}
					margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
				>
					<defs>
						<linearGradient
							id="wpmGradient"
							x1="0"
							y1="0"
							x2="0"
							y2="1"
						>
							<stop
								offset="0%"
								stopColor="#e2b714"
								stopOpacity={0.25}
							/>
							<stop
								offset="60%"
								stopColor="#e2b714"
								stopOpacity={0.06}
							/>
							<stop
								offset="100%"
								stopColor="#e2b714"
								stopOpacity={0}
							/>
						</linearGradient>
					</defs>
					<CartesianGrid
						strokeDasharray="3 3"
						stroke="rgba(255,255,255,0.05)"
						vertical={false}
					/>
					<XAxis
						dataKey="date"
						axisLine={false}
						tickLine={false}
						tickMargin={12}
					/>
					<YAxis
						yAxisId="wpm"
						orientation="left"
						axisLine={false}
						tickLine={false}
						tickMargin={8}
						domain={[0, "auto"]}
						label={{
							value: "WPM",
							angle: -90,
							position: "insideLeft",
							offset: 10,
							style: {
								fill: "#e2b714",
								fontSize: 11,
								fontFamily: "monospace",
							},
						}}
					/>
					<YAxis
						yAxisId="accuracy"
						orientation="right"
						axisLine={false}
						tickLine={false}
						tickMargin={8}
						domain={[0, 100]}
						tickFormatter={(val) => `${val}%`}
						label={{
							value: "Accuracy",
							angle: 90,
							position: "insideRight",
							offset: 10,
							style: {
								fill: "#7c8aff",
								fontSize: 11,
								fontFamily: "monospace",
							},
						}}
					/>
					<ChartTooltip content={<CustomTooltip />} />
					<Area
						yAxisId="wpm"
						type="monotone"
						dataKey="wpm"
						fill="url(#wpmGradient)"
						stroke="none"
						animationDuration={1000}
						animationEasing="ease-out"
					/>
					<Line
						yAxisId="wpm"
						type="monotone"
						dataKey="wpm"
						stroke="#e2b714"
						strokeWidth={2.5}
						dot={{
							r: 4,
							fill: "#e2b714",
							strokeWidth: 2,
							stroke: "#0e1015",
						}}
						activeDot={{
							r: 6,
							fill: "#e2b714",
							strokeWidth: 2,
							stroke: "#0e1015",
						}}
						animationDuration={1000}
						animationEasing="ease-out"
					/>
					<Line
						yAxisId="accuracy"
						type="monotone"
						dataKey="accuracy"
						stroke="#7c8aff"
						strokeWidth={2}
						strokeDasharray="5 4"
						dot={{
							r: 3.5,
							fill: "#7c8aff",
							strokeWidth: 2,
							stroke: "#0e1015",
						}}
						activeDot={{
							r: 5,
							fill: "#7c8aff",
							strokeWidth: 2,
							stroke: "#0e1015",
						}}
						animationDuration={1000}
						animationEasing="ease-out"
					/>
					<ChartLegend content={<ChartLegendContent />} />
				</ComposedChart>
			</ChartContainer>
		</div>
	);
}

function CustomTooltip({ active, payload, label }) {
	if (!active || !payload?.length) return null;

	const data = payload[0]?.payload;
	const wpmEntry = payload.find((p) => p.dataKey === "wpm");
	const accEntry = payload.find((p) => p.dataKey === "accuracy");

	let formattedDate = label;
	if (data?.timestamp) {
		const d = new Date(data.timestamp);
		if (!isNaN(d.getTime())) {
			formattedDate = d.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				hour: "numeric",
				minute: "2-digit",
			});
		}
	}

	const typeLabel =
		data?.type === "Practice"
			? "⌨️  Practice"
			: `🏁  Race${data?.placement ? ` #${data.placement}` : ""}`;

	return (
		<div className="rounded-lg border border-[#2e3440] bg-[#0f1117]/95 px-4 py-3 text-xs shadow-xl backdrop-blur-sm font-mono">
			<p className="text-[#94a3b8] mb-1">{formattedDate}</p>
			<p className="text-[#e2e8f0] mb-2 text-[11px]">{typeLabel}</p>
			<div className="flex flex-col gap-1">
				{wpmEntry && (
					<div className="flex items-center gap-2">
						<span className="w-2 h-2 rounded-full bg-[#e2b714] inline-block" />
						<span className="text-[#94a3b8]">Speed</span>
						<span className="text-[#e2e8f0] font-medium ml-auto">
							{wpmEntry.value} wpm
						</span>
					</div>
				)}
				{accEntry && (
					<div className="flex items-center gap-2">
						<span className="w-2 h-2 rounded-full bg-[#7c8aff] inline-block" />
						<span className="text-[#94a3b8]">Accuracy</span>
						<span className="text-[#e2e8f0] font-medium ml-auto">
							{accEntry.value}%
						</span>
					</div>
				)}
			</div>
		</div>
	);
}

function FilterPills({ filter, setFilter }) {
	return (
		<div className="flex gap-0.5 bg-background/60 p-1 rounded-lg border border-borderMain text-xs font-mono">
			{["All", "Practice", "Race"].map((tab) => (
				<button
					key={tab}
					onClick={() => setFilter(tab)}
					className={clsx(
						"px-3.5 py-1.5 rounded transition-all font-medium",
						filter === tab
							? "bg-[#e2b714] text-black font-bold"
							: "text-textMuted hover:text-white",
					)}
				>
					{tab}
				</button>
			))}
		</div>
	);
}

function StatCard({ icon: Icon, label, value }) {
	return (
		<div className="bg-surface border border-borderMain p-6 rounded-2xl flex flex-col gap-3">
			<div className="flex items-center gap-2 text-textMuted text-sm font-medium">
				<Icon className="w-4 h-4" /> {label}
			</div>
			<div className="text-3xl font-bold font-mono text-white">
				{value}
			</div>
		</div>
	);
}
