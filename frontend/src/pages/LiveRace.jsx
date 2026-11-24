import { useEffect, useState, useRef } from "react";
import RaceGame3D from "../components/RaceGame3D";
import confetti from "canvas-confetti";
import clsx from "clsx";

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

function getFullInput(completed, currentWord, isDone) {
	if (isDone) {
		return completed.join(" ");
	}
	if (completed.length === 0) {
		return currentWord;
	}
	return completed.join(" ") + " " + currentWord;
}

export default function LiveRace({ room, userData, socketRef }) {
	const [countdown, setCountdown] = useState(5);
	const [isStarted, setIsStarted] = useState(false);

	const passage =
		room.passage || "the secret of getting ahead is getting started";
	const words = passage.trim().split(/\s+/);
	const [completedWords, setCompletedWords] = useState([]);
	const [currentWordInput, setCurrentWordInput] = useState("");
	const [startTime, setStartTime] = useState(null);
	const [isFinished, setIsFinished] = useState(false);
	const [localStats, setLocalStats] = useState({ wpm: 0, accuracy: 0 });
	const inputRef = useRef(null);
	const lastProgressRef = useRef(0);
	const totalKeystrokesRef = useRef(0);
	const completedWordsRef = useRef([]);
	const currentWordInputRef = useRef("");
	const isFinishedRef = useRef(false);

	completedWordsRef.current = completedWords;
	currentWordInputRef.current = currentWordInput;
	isFinishedRef.current = isFinished;

	const currentUserId = userData?.id;

	useEffect(() => {
		if (countdown > 0) {
			const timer = setTimeout(() => {
				setCountdown((current) => current - 1);
			}, 1000);
			return () => clearTimeout(timer);
		}

		setIsStarted(true);
		// setStartTime(Date.now());
		if (inputRef.current) inputRef.current.focus();
	}, [countdown]);

	useEffect(() => {
		if (isFinished) {
			confetti({
				particleCount: 150,
				spread: 70,
				origin: { y: 0.6 },
				zIndex: 9999,
			});
		}
	}, [isFinished]);

	useEffect(() => {
		if (!isStarted || isFinished || !startTime) return;

		const interval = setInterval(() => {
			const elapsedSeconds = Math.max(
				1,
				Math.floor((Date.now() - startTime) / 1000),
			);
			const fullInput = getFullInput(
				completedWordsRef.current,
				currentWordInputRef.current,
				isFinishedRef.current,
			);
			if (fullInput.length > 0) {
				const currentStats = calculateTypingStats(
					fullInput,
					passage,
					elapsedSeconds,
				);
				setLocalStats({
					wpm: currentStats.wpm,
					accuracy: currentStats.accuracy,
				});
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [isStarted, isFinished, startTime, passage]);

	const handleInput = (event) => {
		if (!isStarted || isFinished) return;
		let currentStartTime = startTime;

		if (!currentStartTime) {
			currentStartTime = Date.now();
			setStartTime(currentStartTime);
		}
		const value = event.target.value;
		const currentWordIndex = completedWords.length;
		const targetWord = words[currentWordIndex];
		if (!targetWord) return;

		const isLastWord = currentWordIndex === words.length - 1;

		if (isLastWord && value === targetWord) {
			const newCompleted = [...completedWords, targetWord];
			setCompletedWords(newCompleted);
			setCurrentWordInput("");
			setIsFinished(true);

			lastProgressRef.current = 100;
			totalKeystrokesRef.current += 1;

			const elapsedSeconds = Math.max(
				1,
				(Date.now() - currentStartTime) / 1000,
			);
			const fullInput = getFullInput(newCompleted, "", true);
			const { wpm, accuracy } = calculateTypingStats(
				fullInput,
				passage,
				elapsedSeconds,
			);
			setLocalStats({ wpm, accuracy });

			socketRef.current?.send(
				JSON.stringify({
					type: "room:update_progress",
					payload: {
						roomId: room.id,
						progress: 100,
						wpm: wpm,
						accuracy: accuracy,
						isFinished: true,
					},
				}),
			);
			return;
		}

		if (value.endsWith(" ")) {
			const typedWord = value.slice(0, -1);
			if (typedWord === targetWord) {
				const newCompleted = [...completedWords, typedWord];
				setCompletedWords(newCompleted);
				setCurrentWordInput("");

				if (newCompleted.length === words.length) {
					setIsFinished(true);
					lastProgressRef.current = 100;
					totalKeystrokesRef.current += 1;

					const elapsedSeconds = Math.max(
						1,
						(Date.now() - currentStartTime) / 1000,
					);
					const fullInput = getFullInput(newCompleted, "", true);
					const { wpm, accuracy } = calculateTypingStats(
						fullInput,
						passage,
						elapsedSeconds,
					);
					setLocalStats({ wpm, accuracy });

					socketRef.current?.send(
						JSON.stringify({
							type: "room:update_progress",
							payload: {
								roomId: room.id,
								progress: 100,
								wpm: wpm,
								accuracy: accuracy,
								isFinished: true,
							},
						}),
					);
					return;
				}

				let completedChars = 0;
				newCompleted.forEach((w) => (completedChars += w.length + 1));
				const progress = Math.min(
					99,
					Math.max(
						lastProgressRef.current,
						Math.round((completedChars / passage.length) * 100),
					),
				);
				lastProgressRef.current = progress;

				totalKeystrokesRef.current += 1;
				const elapsedSeconds = Math.max(
					1,
					(Date.now() - currentStartTime) / 1000,
				);
				const fullInput = getFullInput(newCompleted, "", false);
				const { wpm, accuracy } = calculateTypingStats(
					fullInput,
					passage,
					elapsedSeconds,
				);
				setLocalStats({ wpm, accuracy });

				socketRef.current?.send(
					JSON.stringify({
						type: "room:update_progress",
						payload: {
							roomId: room.id,
							progress: progress,
							wpm: wpm,
							accuracy: accuracy,
							isFinished: false,
						},
					}),
				);
			} else {
				setCurrentWordInput(value);
				totalKeystrokesRef.current += 1;

				const elapsedSeconds = Math.max(
					1,
					(Date.now() - currentStartTime) / 1000,
				);
				const fullInput = getFullInput(completedWords, value, false);
				const { wpm, accuracy } = calculateTypingStats(
					fullInput,
					passage,
					elapsedSeconds,
				);
				setLocalStats({ wpm, accuracy });
			}
		} else {
			setCurrentWordInput(value);
			totalKeystrokesRef.current += 1;

			let matchingChars = 0;
			for (let i = 0; i < value.length && i < targetWord.length; i++) {
				if (value[i] === targetWord[i]) {
					matchingChars++;
				} else {
					break;
				}
			}

			let completedChars = 0;
			completedWords.forEach((w) => (completedChars += w.length + 1));
			const currentTotalCorrect = completedChars + matchingChars;
			const progress = Math.min(
				99,
				Math.max(
					lastProgressRef.current,
					Math.round((currentTotalCorrect / passage.length) * 100),
				),
			);

			const elapsedSeconds = Math.max(
				1,
				(Date.now() - currentStartTime) / 1000,
			);
			const fullInput = getFullInput(completedWords, value, false);
			const { wpm, accuracy } = calculateTypingStats(
				fullInput,
				passage,
				elapsedSeconds,
			);
			setLocalStats({ wpm, accuracy });

			if (progress > lastProgressRef.current) {
				lastProgressRef.current = progress;

				socketRef.current?.send(
					JSON.stringify({
						type: "room:update_progress",
						payload: {
							roomId: room.id,
							progress: progress,
							wpm: wpm,
							accuracy: accuracy,
							isFinished: false,
						},
					}),
				);
			}
		}
	};

	const calculateMyRank = (myProgress) => {
		const others = (room?.players || []).filter(
			(p) => p.id !== currentUserId,
		);
		let rank = 1;
		others.forEach((p) => {
			if (p.isFinished && !me.isFinished) {
				rank++;
			} else if ((p.progress || 0) > myProgress) {
				rank++;
			}
		});
		return rank;
	};

	const onLeave = () => {
		if (room) {
			socketRef.current?.send(
				JSON.stringify({
					type: "room:leave",
					payload: {
						roomId: room.id,
					},
				}),
			);
		}
	};

	const players = room?.players || [];
	const me = players.find((p) => p.id === currentUserId) || {
		progress: 0,
		wpm: 0,
		rank: 1,
	};

	const sortedPlayers = [...players].sort((a, b) => {
		if (a.rank && b.rank && a.rank !== b.rank) {
			return a.rank - b.rank;
		}
		if (a.isFinished && !b.isFinished) return -1;
		if (!a.isFinished && b.isFinished) return 1;
		return (b.progress || 0) - (a.progress || 0);
	});

	return (
		<div
			className="w-full flex flex-col gap-6"
			onClick={() => inputRef.current?.focus()}
		>
			<div className="flex items-center justify-between px-6">
				<div>
					<h2 className="text-2xl font-bold text-white font-mono">
						Room #{room.id}
					</h2>
					<div className="text-sm text-textMuted mt-1">
						{room.playerCount} / {room.capacity} players
					</div>
				</div>
				<button
					onClick={onLeave}
					className="text-textMuted hover:text-white transition-colors text-sm font-medium"
				>
					Leave Room
				</button>
			</div>

			{!isStarted && (
				<div className="flex flex-col items-center justify-center p-12 bg-surface border border-borderMain rounded-2xl mx-6">
					<span className="text-xl text-textMuted mb-4">
						Race starts in
					</span>
					<span className="text-7xl font-bold font-mono text-primary animate-pulse">
						{countdown}
					</span>
				</div>
			)}

			{isStarted && (
				<>
					<div className="w-full relative px-6 z-0">
						<div className="absolute top-4 left-10 z-10 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-borderMain w-72 flex flex-col gap-3 max-h-72 overflow-y-auto">
							<div className="text-xs font-bold text-textMuted uppercase tracking-wider">
								Leaderboard
							</div>
							{sortedPlayers.map((player) => {
								const isCurrent = player.id === currentUserId;
								const playerProgress = Math.min(
									100,
									Math.round(player.progress || 0),
								);
								return (
									<div
										key={player.id}
										className="flex flex-col gap-1"
									>
										<div className="flex justify-between text-xs text-textMuted mb-1 font-bold">
											<span
												className={clsx(
													isCurrent
														? "text-primary"
														: "text-white",
												)}
											>
												#{player.rank || 1}{" "}
												{player.username}{" "}
												{isCurrent && "(You)"}
												{player.isFinished && " • Done"}
											</span>
											<span>{playerProgress}%</span>
										</div>
										<div className="w-full bg-surface h-2 rounded-full overflow-hidden">
											<div
												className={clsx(
													"h-full transition-all duration-300",
													isCurrent
														? "bg-primary"
														: "bg-red-500",
												)}
												style={{
													width: `${playerProgress}%`,
												}}
											/>
										</div>
									</div>
								);
							})}
						</div>

						<div className="absolute top-4 right-10 z-10 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-borderMain flex items-center justify-center gap-6 px-6 py-3">
							<div className="flex flex-col items-center">
								<span className="text-xs font-bold text-textMuted uppercase">
									WPM
								</span>
								<span className="text-3xl font-bold font-mono text-white">
									{isStarted ? localStats.wpm : 0}
								</span>
							</div>
							<div className="flex flex-col items-center border-l border-borderMain pl-6">
								<span className="text-xs font-bold text-textMuted uppercase">
									Accuracy
								</span>
								<span className="text-3xl font-bold font-mono text-white">
									{isStarted
										? localStats.accuracy !== undefined
											? `${localStats.accuracy}%`
											: me.accuracy !== undefined
												? `${me.accuracy}%`
												: "100%"
										: "100%"}
								</span>
							</div>
						</div>

						<RaceGame3D
							players={players}
							currentUserId={currentUserId}
						/>
					</div>

					<div className="w-full px-6 flex flex-col items-center z-10">
						<div className="w-full max-w-4xl bg-surface/95 backdrop-blur-xl border border-borderMain p-8 rounded-2xl shadow-2xl relative">
							{isFinished ? (
								<div className="text-center py-10">
									<h3 className="text-4xl font-bold text-primary mb-2">
										Race Finished!
									</h3>
									<p className="text-textMuted">
										Waiting for others to finish...
									</p>
								</div>
							) : (
								<div className="text-2xl font-mono text-textMuted leading-loose relative break-words flex flex-wrap gap-x-2">
									{words.map((word, index) => {
										const isCompleted =
											index < completedWords.length;
										const isCurrent =
											index === completedWords.length;

										if (isCompleted) {
											return (
												<span
													key={index}
													className="text-green-400"
												>
													{word}
												</span>
											);
										}

										if (isCurrent) {
											return (
												<span
													key={index}
													className="relative"
												>
													{word
														.split("")
														.map((char, i) => {
															let color =
																"text-textMuted";
															if (
																i <
																currentWordInput.length
															) {
																color =
																	currentWordInput[
																		i
																	] === char
																		? "text-white"
																		: "text-error bg-error/20";
															}
															const isExtra =
																i >=
																word.length;
															return (
																<span
																	key={i}
																	className={clsx(
																		color,
																		isExtra &&
																			"text-error bg-error/20",
																	)}
																>
																	{char}
																</span>
															);
														})}
													{currentWordInput.length >
														word.length &&
														currentWordInput
															.slice(word.length)
															.split("")
															.map((char, i) => (
																<span
																	key={
																		`extra-` +
																		i
																	}
																	className="text-error bg-error/20"
																>
																	{char}
																</span>
															))}
													<span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary animate-pulse" />
												</span>
											);
										}

										return <span key={index}>{word}</span>;
									})}
								</div>
							)}

							<input
								ref={inputRef}
								type="text"
								className="absolute opacity-0 -z-10"
								value={currentWordInput}
								onChange={handleInput}
								onBlur={() => inputRef.current?.focus()}
								autoFocus
							/>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
