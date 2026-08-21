import { useEffect, useState } from "react";
import RaceGame from "../components/RaceGame";

export default function LiveRace({ room, userData, socketRef }) {
	const [countdown, setCountdown] = useState(5);
	const [isStarted, setIsStarted] = useState(false);
	// Real Typing State
	const [passage, setPassage] = useState(
		"the secret of getting ahead is getting started",
	);
	const [input, setInput] = useState("");
	const [startTime, setStartTime] = useState(null);
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
	}, [countdown]);

	const handleInput = (event) => {
		if (!isStarted) return;

		const value = event.target.value;

		if (value.length <= passage.length) {
			setInput(value);
		}
	};

	let correctChars = 0;

	for (let i = 0; i < input.length; i++) {
		if (input[i] === passage[i]) {
			correctChars++;
		}
	}

	const myProgress =
		passage.length > 0 ? (correctChars / passage.length) * 100 : 0;

	const elapsedMinutes = startTime
		? (Date.now() - startTime) / 60000
		: 1 / 60;

	const myWpm =
		Math.round(correctChars / 5 / (elapsedMinutes || 1 / 60)) || 0;

	const myAccuracy =
		input.length > 0
			? Math.round((correctChars / input.length) * 100)
			: 100;

	const [op1Progress, setOp1Progress] = useState(0);
	const [op2Progress, setOp2Progress] = useState(0);

	useEffect(() => {
		if (!isStarted) return;

		const timer = setInterval(() => {
			setOp1Progress((progress) =>
				Math.min(progress + Math.random() * 2, 100),
			);

			setOp2Progress((progress) =>
				Math.min(progress + Math.random() * 1.5, 100),
			);
		}, 500);

		return () => clearInterval(timer);
	}, [isStarted]);

	const players = room?.players;

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

	return (
		<div className="w-full flex flex-col gap-6">
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
				<div className="w-full h-full pb-8 relative group">
					<RaceGame
						players={players}
						currentUserId={currentUserId}
						passage={passage}
						input={input}
						handleInput={handleInput}
					/>
				</div>
			)}
		</div>
	);
}
