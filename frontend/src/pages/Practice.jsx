import { useState, useEffect, useRef } from "react";
import { RotateCcw, Clock, Hash } from "lucide-react";
import clsx from "clsx";
import { mockPassages } from "../data/mock";

const TIME_MODES = [15, 30, 60, 120];
const WORD_MODES = [25, 50, 100];

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

	// Initialize test
	useEffect(() => {
		resetTest();
	}, [mode, timeLimit, wordLimit]);

	// Timer logic
	useEffect(() => {
		if (startTime && !isFinished && mode === "time") {
			const interval = setInterval(() => {
				const elapsed = Math.floor((Date.now() - startTime) / 1000);
				const remaining = timeLimit - elapsed;
				if (remaining <= 0) {
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
		let text =
			mockPassages[Math.floor(Math.random() * mockPassages.length)];
		if (mode === "words") {
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

	const finishTest = () => {
		setIsFinished(true);
		const elapsed =
			mode === "time"
				? timeLimit
				: Math.floor((Date.now() - startTime) / 1000);
		const minutes = elapsed / 60 || 1 / 60;

		// Calculate stats
		let correctChars = 0;
		let errors = 0;
		for (let i = 0; i < input.length; i++) {
			if (input[i] === passage[i]) correctChars++;
			else errors++;
		}

		const wordsTyped = correctChars / 5;
		const wpm = Math.round(wordsTyped / minutes);
		const accuracy =
			input.length > 0
				? Math.round((correctChars / input.length) * 100)
				: 0;

		setStats({ wpm, accuracy, errors, chars: input.length });
	};

	const handleInput = (e) => {
		if (isFinished) return;
		if (!startTime) setStartTime(Date.now());

		const val = e.target.value;
		if (val.length <= passage.length) {
			setInput(val);
			if (mode === "words" && val.length === passage.length) {
				finishTest();
			}
		}
	};

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
							onClick={() => setMode("words")}
							className={clsx(
								"flex items-center gap-2 text-sm font-medium transition-colors",
								mode === "words"
									? "text-primary"
									: "text-textMuted hover:text-white",
							)}
						>
							<Hash className="w-4 h-4" /> Words
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

					<div
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
					</div>

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
