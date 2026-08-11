import { useState, useEffect, useRef, useCallback } from "react";
import { RotateCcw, Clock, Hash } from "lucide-react";
import clsx from "clsx";
import { mockPassages } from "../data/mock";
import { toast } from "sonner";
import PassageViewport from "../components/PassageViewport";

const TIME_MODES = [15, 30, 60, 120];
const WORD_MODES = [10, 25, 50, 100];

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
	const [userPersonalData, setUserPersonalData] = useState(null);
	const [passageWordData, setPassageWordData] = useState(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchUserData = async () => {
			const response = await fetch("http://localhost:3000/profile", {
				method: "GET",
				credentials: "include",
			});
			if (!response.ok) {
				toast.error("Please Login to save your results");
				toast.error("Guest Mode, test taken won't be saved!");
				return;
			}
			const data = await response.json();
			setUserPersonalData(data.data.rows[0]);
		};

		fetchUserData();
	}, []);

	useEffect(() => {
		const fetchTestWords = async () => {
			try {
				const response = await fetch(
					"http://localhost:3000/practice/words",
					{
						method: "GET",
						credentials: "include",
					},
				);
				if (!response.ok) {
					toast.error("Unable to fetch the words!!");
					return;
				}

				const wordsData = await response.json();
				setPassageWordData(wordsData.text);
			} catch (error) {
				console.error("Failed to fetch words:", error);
				toast.error("Unable to fetch the words!!");
			} finally {
				setIsLoading(false);
			}
		};
		fetchTestWords();
	}, []);

	// Initialize test
	useEffect(() => {
		if (!passageWordData) return;
		resetTest();
	}, [passageWordData, mode, timeLimit, wordLimit]);

	// Timer logic
	// useEffect(() => {
	// 	if (!startTime || isFinished || mode !== "time") return;

	// 	const interval = setInterval(() => {
	// 		const elapsed = Math.floor((Date.now() - startTime) / 1000);
	// 		const remaining = timeLimit - elapsed;

	// 		if (remaining <= 0) {
	// 			clearInterval(interval);
	// 			finishTest();
	// 		} else {
	// 			setTimeLeft(remaining);
	// 		}
	// 	}, 1000);

	// 	return () => clearInterval(interval);
	// }, [startTime, isFinished, mode, timeLimit, finishTest]);

	useEffect(() => {
		if (startTime && !isFinished && mode === "time") {
			const interval = setInterval(() => {
				const elapsed = Math.floor((Date.now() - startTime) / 1000);

				const remaining = timeLimit - elapsed;

				if (remaining <= 0) {
					clearInterval(interval);
					finishTest();
				} else {
					setTimeLeft(remaining);
				}
			}, 1000);

			return () => clearInterval(interval);
		}
	}, [startTime, isFinished, mode, timeLimit]);

	const resetTest = () => {
		// Pick a random passage
		if (!passageWordData) return;
		let text = passageWordData;
		if (mode === "passage") {
			text = text.split(" ").slice(0, wordLimit).join(" ");
		}
		setPassage(text);
		setInput("");
		setStartTime(null);
		setTimeLeft(timeLimit);
		setIsFinished(false);
		setStats({ wpm: 0, accuracy: 0, errors: 0 });
		if (inputRef.current) inputRef.current.focus();
	};

	const postUserData = async (userData) => {
		const response = await fetch("http://localhost:3000/stats", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify(userData),
			credentials: "include",
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error("STATS API ERROR:", errorData);
			return;
		}

		const data = await response.json();
		console.log("Response user Stat data: ", data);
	};

	const finishTest = () => {
		if (!startTime || isFinished) return;

		// Get the latest value directly from the input element
		const currentInput = inputRef.current?.value ?? "";

		setIsFinished(true);

		const elapsed =
			mode === "time"
				? timeLimit
				: Math.max(1, Math.floor((Date.now() - startTime) / 1000));

		const minutes = elapsed / 60;

		// Calculate stats
		let correctChars = 0;
		let errors = 0;

		for (let i = 0; i < currentInput.length; i++) {
			if (currentInput[i] === passage[i]) {
				correctChars++;
			} else {
				errors++;
			}
		}

		const wordsTyped = correctChars / 5;
		const wpm = Math.round(wordsTyped / minutes);

		const accuracy =
			currentInput.length > 0
				? Math.round((correctChars / currentInput.length) * 100)
				: 0;

		const userTestData = {
			user_id: !userPersonalData ? "guest" : userPersonalData.id,
			mode: mode,
			word_count: wordLimit,
			duration_seconds: elapsed,
			wpm: wpm,
			accuracy: accuracy,
			errors: errors,
			started_at: new Date(startTime).toISOString(),
		};

		postUserData(userTestData);

		setStats({
			wpm,
			accuracy,
			errors,
			chars: currentInput.length,
		});
	};

	// const handleInput = (e) => {
	// 	if (isFinished) return;
	// 	if (!startTime) {
	// 		setStartTime(Date.now());
	// 	}
	// 	const val = e.target.value;

	// 	if (val.length <= passage.length) {
	// 		setInput(val);
	// 		if (mode === "passage" && val.length === passage.length) {
	// 			finishTest();
	// 		}
	// 	}
	// };

	const handleInput = (e) => {
		if (isFinished) return;

		if (!startTime) {
			setStartTime(Date.now());
		}

		const val = e.target.value;

		if (val.length <= passage.length) {
			setInput(val);

			if (mode === "passage" && val.length === passage.length) {
				finishTest();
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
				<div className="w-full relative group">
					<div className="flex justify-between items-center mb-6 text-xl font-medium text-primary">
						<span>
							{mode === "time"
								? timeLeft
								: `${input.split(" ").length}/${wordLimit}`}
						</span>
					</div>

					{/* <div
						className="text-2xl leading-loose font-mono text-textMuted break-words relative z-10"
						onClick={() => inputRef.current?.focus()}
					>
						{passage.split("").map((char, i) => {
							let color = "";
							if (i < input.length) {
								color =
									input[i] === char
										? "text-white"
										: "text-error bg-error/20";
							}
							const isCurrent = i === input.length;
							return (
								<span
									key={i}
									className={clsx(
										color,
										isCurrent &&
											"border-b-2 border-primary animate-pulse",
									)}
								>
									{char}
								</span>
							);
						})}
					</div> */}

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

					<div className="flex justify-center mt-12 opacity-0 group-hover:opacity-100 transition-opacity">
						<button
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
