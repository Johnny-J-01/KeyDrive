import { useState, useEffect, useRef, useCallback } from "react";
import { RotateCcw, Clock, Hash, TriangleAlert } from "lucide-react";
import clsx from "clsx";
import { mockPassages } from "../data/mock";
import { toast } from "sonner";
import PassageViewport from "../components/PassageViewport";
import { useAuth } from "../main";
import API_URL from "../config/api.js";

const TIME_MODES = [15, 30, 60, 120];
const WORD_MODES = [10, 25, 50, 100];

const fallbackWords = mockPassages.flatMap((p) =>
	p
		.replace(/[.,;!?]/g, "")
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean),
);

function shuffleArray(array) {
	const copy = [...array];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

function generatePassage(
	pool,
	selectedMode,
	currentWordLimit,
	currentTimeLimit,
	previousPassage,
) {
	if (!pool || pool.length === 0) {
		return "";
	}

	const targetCount =
		selectedMode === "passage"
			? currentWordLimit
			: Math.min(Math.max(100, currentTimeLimit * 3), 500);

	let attempts = 0;
	let result = "";

	while (attempts < 10) {
		attempts++;
		let words = [];

		if (pool.length >= targetCount) {
			const shuffled = shuffleArray(pool);
			words = shuffled.slice(0, targetCount);
		} else {
			while (words.length < targetCount) {
				const chunk = shuffleArray(pool);
				words.push(...chunk);
			}
			words = words.slice(0, targetCount);
		}

		result = words.join(" ");

		if (pool.length <= 1 || result !== previousPassage) {
			break;
		}
	}

	return result;
}

function calculateTypingStats(currentInput, currentPassage, elapsedSeconds) {
	let correctChars = 0;
	let errors = 0;

	for (let i = 0; i < currentInput.length; i++) {
		if (currentInput[i] === currentPassage[i]) {
			correctChars++;
		} else {
			errors++;
		}
	}

	const minutes = Math.max(1, elapsedSeconds) / 60;
	const wordsTyped = correctChars / 5;
	const wpm = elapsedSeconds > 0 ? Math.round(wordsTyped / minutes) : 0;

	const accuracy =
		currentInput.length > 0
			? Math.round((correctChars / currentInput.length) * 100)
			: 0;

	return {
		wpm,
		accuracy,
		errors,
		chars: currentInput.length,
	};
}

export default function Practice() {
	const [mode, setMode] = useState("time");
	const [timeLimit, setTimeLimit] = useState(30);
	const [wordLimit, setWordLimit] = useState(25);

	const [passage, setPassage] = useState("");
	const [input, setInput] = useState("");
	const [startTime, setStartTime] = useState(null);
	const [timeLeft, setTimeLeft] = useState(30);
	const [isFinished, setIsFinished] = useState(false);
	const [stats, setStats] = useState({ wpm: 0, accuracy: 0, errors: 0 });

	const inputRef = useRef(null);
	const inputValueRef = useRef("");
	const startTimeRef = useRef(null);
	const passageRef = useRef("");
	const previousPassageRef = useRef("");
	const [userPersonalData, setUserPersonalData] = useState(null);
	const [wordsPool, setWordsPool] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [guestNotice, setGuestNotice] = useState("");
	const { accessToken, fetchWithAuth } = useAuth();

	useEffect(() => {
		if (!accessToken) {
			setUserPersonalData(null);
			setGuestNotice(
				"Guest account — please login to save your results.",
			);
			return;
		}

		const fetchUserData = async () => {
			const response = await fetchWithAuth(`${API_URL}/profile`, {
				method: "GET",
			});

			if (!response.ok) {
				setUserPersonalData(null);
				setGuestNotice(
					"Guest account — please login to save your results.",
				);
				return;
			}

			const data = await response.json();
			setUserPersonalData(data.data.rows[0]);
			setGuestNotice("");
		};

		fetchUserData();
	}, [accessToken, fetchWithAuth]);

	useEffect(() => {
		const fetchTestWords = async () => {
			try {
				const response = await fetchWithAuth(
					`${API_URL}/practice/words`,
					{ method: "GET", requireAuth: false },
				);
				if (!response.ok) {
					toast.error("Unable to fetch the words!!");
					setWordsPool(fallbackWords);
					return;
				}

				const wordsData = await response.json();
				const pool =
					Array.isArray(wordsData.words) && wordsData.words.length > 0
						? wordsData.words
						: wordsData.text
							? wordsData.text.split(" ").filter(Boolean)
							: fallbackWords;

				setWordsPool(pool.length > 0 ? pool : fallbackWords);
			} catch (error) {
				console.error("Failed to fetch words:", error);
				toast.error("Unable to fetch the words!!");
				setWordsPool(fallbackWords);
			} finally {
				setIsLoading(false);
			}
		};
		fetchTestWords();
	}, [fetchWithAuth]);

	const postUserData = useCallback(
		async (userData) => {
			const response = await fetchWithAuth(`${API_URL}/stats`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				body: JSON.stringify(userData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				console.error("STATS API ERROR:", errorData);
				return;
			}

			const data = await response.json();
			console.log("Response user Stat data: ", data);
		},
		[fetchWithAuth],
	);

	const finishTest = useCallback(
		(finalInput, finalStartTime) => {
			const currentStartTime =
				finalStartTime || startTimeRef.current || startTime;
			if (!currentStartTime || isFinished) return;

			setIsFinished(true);

			const currentInput =
				finalInput !== undefined
					? finalInput
					: (inputRef.current?.value ?? "");

			const currentPassage = passageRef.current || passage;

			const elapsed =
				mode === "time"
					? timeLimit
					: Math.max(
							1,
							Math.floor((Date.now() - currentStartTime) / 1000),
						);

			const finalStats = calculateTypingStats(
				currentInput,
				currentPassage,
				elapsed,
			);

			if (!userPersonalData || !accessToken) {
				setGuestNotice(
					"Guest account — please login to save your results.",
				);
				setStats(finalStats);
				return;
			}

			const userTestData = {
				user_id: userPersonalData.id,
				mode: mode,
				word_count: wordLimit,
				duration_seconds: elapsed,
				wpm: finalStats.wpm,
				accuracy: finalStats.accuracy,
				errors: finalStats.errors,
				started_at: new Date(currentStartTime).toISOString(),
			};

			postUserData(userTestData);
			setStats(finalStats);
		},
		[
			startTime,
			isFinished,
			mode,
			timeLimit,
			wordLimit,
			passage,
			userPersonalData,
			accessToken,
			postUserData,
		],
	);

	const resetTest = useCallback(() => {
		const pool = wordsPool.length > 0 ? wordsPool : fallbackWords;
		if (!pool || pool.length === 0) return;

		const nextPassage = generatePassage(
			pool,
			mode,
			wordLimit,
			timeLimit,
			previousPassageRef.current,
		);

		previousPassageRef.current = nextPassage;
		passageRef.current = nextPassage;
		setPassage(nextPassage);
		setInput("");
		setStartTime(null);
		startTimeRef.current = null;
		setTimeLeft(timeLimit);
		setIsFinished(false);
		setStats({ wpm: 0, accuracy: 0, errors: 0, chars: 0 });

		if (inputRef.current) {
			inputRef.current.value = "";
			inputRef.current.focus();
		}
	}, [wordsPool, mode, wordLimit, timeLimit]);

	useEffect(() => {
		if (wordsPool.length === 0 && !isLoading) {
			resetTest();
		} else if (wordsPool.length > 0) {
			resetTest();
		}
	}, [wordsPool, mode, timeLimit, wordLimit, resetTest, isLoading]);

	useEffect(() => {
		if (!startTime || isFinished) return;

		const interval = setInterval(() => {
			const elapsed = Math.floor((Date.now() - startTime) / 1000);

			if (mode === "time") {
				const remaining = timeLimit - elapsed;
				if (remaining <= 0) {
					clearInterval(interval);
					finishTest();
					return;
				}
				setTimeLeft(remaining);
			}

			const currentInput = inputRef.current?.value ?? "";
			if (currentInput.length > 0) {
				const currentPassage = passageRef.current || passage;
				const currentStats = calculateTypingStats(
					currentInput,
					currentPassage,
					elapsed,
				);
				setStats(currentStats);
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [startTime, isFinished, mode, timeLimit, passage, finishTest]);

	useEffect(() => {
		const handleKeyDown = (event) => {
			if (event.key !== "Enter") return;
			event.preventDefault();
			resetTest();
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [resetTest]);

	const handleInput = (e) => {
		if (isFinished) return;

		let currentStartTime = startTimeRef.current;
		if (!currentStartTime) {
			currentStartTime = Date.now();
			startTimeRef.current = currentStartTime;
			setStartTime(currentStartTime);
		}

		const val = e.target.value;
		const currentPassage = passageRef.current || passage;

		if (val.length <= currentPassage.length) {
			setInput(val);

			const elapsedSeconds = Math.max(
				1,
				(Date.now() - currentStartTime) / 1000,
			);
			const liveStats = calculateTypingStats(
				val,
				currentPassage,
				elapsedSeconds,
			);
			setStats(liveStats);

			if (mode === "passage" && val.length === currentPassage.length) {
				finishTest(val, currentStartTime);
			}
		}
	};

	if (isLoading) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<p className="text-textMuted">Loading practice test...</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center max-w-4xl mx-auto py-12">
			{guestNotice && (
				<div className="w-full max-w-2xl mb-6 flex items-center justify-center gap-3 rounded-xl border border-red-600 bg-red-500/10 px-4 py-3 text-left text-red-400 font-semibold">
					<TriangleAlert className="w-5 h-5 shrink-0" />
					<span>
						Guest account — please login to save your results.
					</span>
				</div>
			)}

			{/* Settings Bar */}
			{!isFinished && (
				<div className="flex items-center gap-6 p-4 rounded-xl bg-surface border border-borderMain mb-12 animate-in fade-in">
					<div className="flex items-center gap-2 border-r border-borderMain pr-6">
						<button
							onClick={() => setMode("time")}
							className={clsx(
								"flex items-center gap-2 text-sm font-medium transition-colors",
								mode === "time"
									? "text-primary"
									: "text-textMuted hover:text-white",
							)}
						>
							<Clock className="w-4 h-4" /> Time
						</button>
						<button
							onClick={() => setMode("passage")}
							className={clsx(
								"flex items-center gap-2 text-sm font-medium transition-colors",
								mode === "passage"
									? "text-primary"
									: "text-textMuted hover:text-white",
							)}
						>
							<Hash className="w-4 h-4" /> passage
						</button>
					</div>
					<div className="flex items-center gap-4">
						{mode === "time"
							? TIME_MODES.map((t) => (
									<button
										key={t}
										onClick={() => setTimeLimit(t)}
										className={clsx(
											"text-sm font-medium transition-colors",
											timeLimit === t
												? "text-primary"
												: "text-textMuted hover:text-white",
										)}
									>
										{t}s
									</button>
								))
							: WORD_MODES.map((w) => (
									<button
										key={w}
										onClick={() => setWordLimit(w)}
										className={clsx(
											"text-sm font-medium transition-colors",
											wordLimit === w
												? "text-primary"
												: "text-textMuted hover:text-white",
										)}
									>
										{w}
									</button>
								))}
					</div>
				</div>
			)}

			{isFinished ? (
				<div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-4 fade-in duration-500">
					<h2 className="text-3xl font-bold mb-8">Test Complete</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full mb-12">
						<StatCard label="WPM" value={stats.wpm} highlight />
						<StatCard
							label="Accuracy"
							value={`${stats.accuracy}%`}
						/>
						<StatCard label="Characters" value={stats.chars} />
						<StatCard label="Errors" value={stats.errors} />
					</div>
					<button
						onClick={resetTest}
						className="flex items-center gap-2 px-8 py-3 bg-white text-background font-bold rounded-lg hover:bg-gray-200 transition-colors"
					>
						<RotateCcw className="w-5 h-5" /> Try Again
					</button>
				</div>
			) : (
				<div className="w-full relative">
					<div className="flex justify-between items-center mb-6 text-xl font-medium text-primary">
						<span>
							{mode === "time"
								? timeLeft
								: `${input.trim().length === 0 ? 0 : input.trim().split(/\s+/).length}/${wordLimit}`}
						</span>
						<div className="flex items-center gap-6 text-lg font-mono">
							<span className="text-textMuted">
								<span className="text-primary font-bold">
									{stats.wpm}
								</span>{" "}
								Wpm
							</span>
							<span className="text-textMuted">
								<span className="text-primary font-bold">
									{stats.accuracy}%
								</span>{" "}
								Acc
							</span>
						</div>
					</div>
					<PassageViewport
						passage={passage}
						input={input}
						onFocusInput={() => inputRef.current?.focus()}
					/>

					<input
						ref={inputRef}
						type="text"
						className="absolute opacity-0 -z-10"
						value={input}
						onChange={handleInput}
						onBlur={() => inputRef.current?.focus()}
						autoFocus
					/>

					<div className="flex justify-center mt-6">
						<button
							type="button"
							onClick={resetTest}
							className="flex items-center gap-2 px-4 py-2 text-textMuted hover:text-white bg-surface border border-borderMain rounded-lg transition-colors"
						>
							<RotateCcw className="w-4 h-4" /> Restart Test
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

function StatCard({ label, value, highlight }) {
	return (
		<div
			className={clsx(
				"p-6 rounded-xl border flex flex-col items-center justify-center gap-2",
				highlight
					? "bg-primary/10 border-primary/30"
					: "bg-surface border-borderMain",
			)}
		>
			<span className="text-textMuted text-sm font-medium uppercase tracking-wider">
				{label}
			</span>
			<span
				className={clsx(
					"text-4xl font-bold font-mono",
					highlight ? "text-primary" : "text-white",
				)}
			>
				{value}
			</span>
		</div>
	);
}
