import { Users, Copy, LogOut, Play, Lock, Globe, Check } from "lucide-react";
import { useState } from "react";
import LiveRace from "./LiveRace";
import API_URL from "../config/api";

export default function RoomLobby({
	socketRef,
	room,
	userData,
	onLeave,
	onDelete,
}) {
	const [copied, setCopied] = useState(false);
	const isAdmin = room.adminId === userData.id;
	const players =
		room.players?.length > 0
			? room.players
			: [{ id: userData.id, username: userData.username }];

	const copyRoomCode = async () => {
		try {
			await navigator.clipboard.writeText(room.id);

			setCopied(true);

			setTimeout(() => {
				setCopied(false);
			}, 2000);
		} catch (error) {
			console.error("Failed to copy room code:", error);
		}
	};

	const handleStartRace = async () => {
		try {
			const response = await fetch(
				`${API_URL}/practice/words`,
				{
					method: "GET",
					credentials: "include",
				},
			);
			let passage =
				"the secret of getting ahead is getting started and typing fast";
			if (response.ok) {
				const data = await response.json();
				// curretly hard coding just 20 wrods, later feautre will be added where user will be able to select the number of words or maybe just random wrods.
				passage = data.text.split(" ").slice(0, 20).join(" ");
			}
			socketRef.current?.send(
				JSON.stringify({
					type: "room:start",
					payload: {
						roomId: room.id,
						passage: passage,
					},
				}),
			);
		} catch (error) {
			console.error("Failed to fetch words:", error);
			socketRef.current?.send(
				JSON.stringify({
					type: "room:start",
					payload: {
						roomId: room.id,
						passage:
							"the secret of getting ahead is getting started and typing fast",
					},
				}),
			);
		}
	};

	return (
		<div className="max-w-4xl mx-auto py-8 px-4">
			<div className="flex flex-col gap-6">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<div className="flex items-center gap-3 mb-2">
							<h1 className="text-3xl font-bold text-white">
								{room.name}
							</h1>

							{room.type === "private" ? (
								<div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs">
									<Lock className="w-3 h-3" />
									Private
								</div>
							) : (
								<div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs">
									<Globe className="w-3 h-3" />
									Public
								</div>
							)}
						</div>

						<p className="text-textMuted">
							Waiting for players to join.
						</p>
					</div>

					<div className="flex gap-3">
						<button
							onClick={onLeave}
							className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-borderMain text-textMuted hover:text-white hover:border-red-500/40 transition-colors"
						>
							<LogOut className="w-4 h-4" />
							Leave Room
						</button>

						{isAdmin && (
							<button
								onClick={onDelete}
								className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
							>
								Delete Room
							</button>
						)}
					</div>
				</div>
				<div className="bg-surface border border-borderMain rounded-xl p-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
						<div>
							<p className="text-sm text-textMuted mb-1">
								Room Code
							</p>

							<div className="font-mono text-3xl font-bold text-primary tracking-widest">
								{room.id}
							</div>
						</div>

						<button
							onClick={copyRoomCode}
							className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-borderMain text-white hover:bg-background transition-colors"
						>
							{copied ? (
								<>
									<Check className="w-4 h-4 text-green-400" />
									Copied
								</>
							) : (
								<>
									<Copy className="w-4 h-4" />
									Copy Code
								</>
							)}
						</button>
					</div>

					<div className="mt-5 pt-5 border-t border-borderMain">
						<p className="text-sm text-textMuted">
							Share this code with your friends so they can join
							this room.
						</p>
					</div>
				</div>

				<div className="bg-surface border border-borderMain rounded-xl overflow-hidden">
					<div className="px-6 py-5 border-b border-borderMain flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
								<Users className="w-5 h-5 text-primary" />
							</div>

							<div>
								<h2 className="font-bold text-white">
									Players
								</h2>

								<p className="text-xs text-textMuted">
									{players.length} / {room.capacity} joined
								</p>
							</div>
						</div>
					</div>

					<div className="p-4 flex flex-col gap-2">
						{players.map((player, index) => (
							<PlayerRow
								key={player.id}
								player={player}
								isCurrentUser={player.id === userData.id}
								isHost={player.id === room.adminId}
							/>
						))}

						{Array.from({
							length: Math.max(room.capacity - players.length, 0),
						}).map((_, index) => (
							<EmptyPlayerSlot key={index} />
						))}
					</div>
				</div>

				{isAdmin && (
					<div className="bg-surface border border-borderMain rounded-xl p-6">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
							<button
								disabled={players.length < 1}
								className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
								onClick={handleStartRace}
							>
								<Play className="w-4 h-4" />
								Start Race
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function PlayerRow({ player, isCurrentUser, isHost }) {
	return (
		<div className="flex items-center justify-between px-4 py-3 rounded-lg bg-background border border-borderMain">
			<div className="flex items-center gap-3">
				<div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
					{player.username?.charAt(0).toUpperCase()}
				</div>

				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium text-white">
							{player.username}
						</span>

						{isCurrentUser && (
							<span className="text-xs text-primary">You</span>
						)}
					</div>

					{isHost && (
						<span className="text-xs text-primary">Admin</span>
					)}
				</div>
			</div>

			<div className="w-2 h-2 rounded-full bg-green-400" />
		</div>
	);
}

function EmptyPlayerSlot() {
	return (
		<div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-borderMain">
			<div className="w-9 h-9 rounded-full border border-dashed border-borderMain flex items-center justify-center">
				<Users className="w-4 h-4 text-textMuted" />
			</div>

			<span className="text-sm text-textMuted">
				Waiting for player...
			</span>
		</div>
	);
}
