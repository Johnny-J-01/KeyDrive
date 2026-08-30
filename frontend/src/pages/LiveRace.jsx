import { useEffect, useState, useRef } from "react";
import RaceGame3D from "../components/RaceGame3D";
import confetti from "canvas-confetti";
import clsx from "clsx";

export default function LiveRace({ room, userData, socketRef }) {
	const [countdown, setCountdown] = useState(5);
	const [isStarted, setIsStarted] = useState(false);

	const passage =
		room.passage || "the secret of getting ahead is getting started";
	const words = passage.split(" ");
	const [completedWords, setCompletedWords] = useState([]);
	const [currentWordInput, setCurrentWordInput] = useState("");
	const [startTime, setStartTime] = useState(null);
	const [isFinished, setIsFinished] = useState(false);
	const inputRef = useRef(null);

	const currentUserId = userData?.id;

	useEffect(() => {
		if (countdown > 0) {
			const timer = setTimeout(() => {
				setCountdown((current) => current - 1);
			}, 1000);
			return () => clearTimeout(timer);
		}

		setIsStarted(true);
		setStartTime(Date.now());
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

	const handleInput = (event) => {
		if (!isStarted || isFinished) return;

		const value = event.target.value;
		const currentWordIndex = completedWords.length;
		const targetWord = words[currentWordIndex];

		// If user typed space, check if word is correct
		if (value.endsWith(" ")) {
			const typedWord = value.slice(0, -1);
			if (typedWord === targetWord) {
				// Correct word!
				const newCompleted = [...completedWords, typedWord];
				setCompletedWords(newCompleted);
				setCurrentWordInput("");

				const progress = (newCompleted.length / words.length) * 100;
				const elapsedMinutes = (Date.now() - startTime) / 60000;

				let charsTyped = 0;
				newCompleted.forEach((w) => (charsTyped += w.length + 1));
				const wpm = Math.round(
					charsTyped / 5 / (elapsedMinutes || 1 / 60),
				);
				const finished = newCompleted.length === words.length;
				if (finished) setIsFinished(true);
				const currentRank = calculateMyRank(progress);

				socketRef.current?.send(
					JSON.stringify({
						type: "room:update_progress",
						payload: {
							roomId: room.id,
							userId: currentUserId,
							progress: progress,
							wpm: wpm,
							isFinished: finished,
							rank: currentRank,
						},
					}),
				);
			} else {
				// Incorrect word, just update input (force them to fix it or let them keep typing incorrectly)
				setCurrentWordInput(value);
			}
		} else {
			// Typing characters: can't delete into completed words, which is naturally handled by keeping completed wrds and currentWordInput separate.
			setCurrentWordInput(value);
		}
	};

	const calculateMyRank = (myProgress) => {
		const others = room.players
			.filter((p) => p.id !== currentUserId)
			.map((p) => p.progress || 0);
		let rank = 1;
		others.forEach((p) => {
			if (p > myProgress) rank++;
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
						userData: userData,
					},
				}),
			);
		}
	};

	// HUD Logic
	const players = room?.players || [];
	const me = players.find((p) => p.id === currentUserId) || {
		progress: 0,
		wpm: 0,
		rank: 1,
	};

	// Sort players to find top player
	const sortedPlayers = [...players].sort(
		(a, b) => (b.progress || 0) - (a.progress || 0),
	);
	const topPlayer = sortedPlayers[0];

	// If I am top player, show second place player (if exists)
	let opponentToShow = topPlayer;
	if (topPlayer?.id === currentUserId && sortedPlayers.length > 1) {
		opponentToShow = sortedPlayers[1];
	} else if (topPlayer?.id === currentUserId) {
		opponentToShow = null;
	}

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
						<div className="absolute top-4 left-10 z-10 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-borderMain w-64 flex flex-col gap-3">
							<div>
								<div className="flex justify-between text-xs text-textMuted mb-1 font-bold">
									<span>
										My Progress (Rank{" "}
										{me.rank ||
											calculateMyRank(me.progress || 0)}
										)
									</span>
									<span>{Math.round(me.progress || 0)}%</span>
								</div>
								<div className="w-full bg-surface h-2 rounded-full overflow-hidden">
									<div
										className="bg-primary h-full transition-all duration-300"
										style={{
											width: `${me.progress || 0}%`,
										}}
									/>
								</div>
							</div>

							{opponentToShow && (
								<div>
									<div className="flex justify-between text-xs text-textMuted mb-1">
										<span>
											{opponentToShow.username} (Rank{" "}
											{sortedPlayers.findIndex(
												(p) =>
													p.id === opponentToShow.id,
											) + 1}
											)
										</span>
										<span>
											{Math.round(
												opponentToShow.progress || 0,
											)}
											%
										</span>
									</div>
									<div className="w-full bg-surface h-2 rounded-full overflow-hidden">
										<div
											className="bg-red-500 h-full transition-all duration-300"
											style={{
												width: `\${opponentToShow.progress || 0}%`,
											}}
										/>
									</div>
								</div>
							)}
						</div>

						{/* top right real time wpm component */}
						<div className="absolute top-4 right-10 z-10 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-borderMain flex flex-col items-center justify-center w-24">
							<span className="text-xs font-bold text-textMuted uppercase">
								WPM
							</span>
							<span className="text-3xl font-bold font-mono text-white">
								{me.wpm || 0}
							</span>
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
