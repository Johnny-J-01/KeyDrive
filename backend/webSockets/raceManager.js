import { WebSocket } from "ws";

export const handleRaceMessage = (
	type,
	payload,
	socket,
	{
		rooms,
		wssInstance,
		sanitizeRoom,
		sendTo,
		broadcastToRoom,
	},
) => {
	if (type === "room:start") {
		if (!payload || !payload.roomId) {
			sendTo(socket, {
				type: "error",
				payload: "Room ID is required",
			});
			return;
		}

		const room = rooms.find((r) => r.id === payload.roomId);
		if (!room) {
			return;
		}

		if (room.adminId !== socket.userId) {
			sendTo(socket, {
				type: "error",
				payload: "Only the room admin can start the race.",
			});
			return;
		}

		if (!room.players.some((p) => p.id === socket.userId)) {
			sendTo(socket, {
				type: "error",
				payload: "You are not in this room.",
			});
			return;
		}

		if (room.status === "running") {
			sendTo(socket, {
				type: "error",
				payload: "Race is already running.",
			});
			return;
		}

		room.status = "running";
		room.players.forEach((p) => {
			delete p.progress;
			delete p.wpm;
			delete p.accuracy;
			delete p.isFinished;
			delete p.finishedAt;
			p.rank = 1;
		});
		if (payload.passage) {
			room.passage = payload.passage;
		}

		broadcastToRoom(room.id, {
			type: "room:start",
			payload: sanitizeRoom(room),
		});

		wssInstance?.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				sendTo(client, {
					type: "room:updated",
					payload: sanitizeRoom(room),
				});
			}
		});
		return;
	}

	if (type === "room:update_progress") {
		if (!payload || !payload.roomId) {
			sendTo(socket, {
				type: "error",
				payload: "Room ID is required",
			});
			return;
		}

		const room = rooms.find((r) => r.id === payload.roomId);
		if (!room) {
			sendTo(socket, {
				type: "error",
				payload: "Room not found.",
			});
			return;
		}

		if (socket._roomId !== room.id) {
			sendTo(socket, {
				type: "error",
				payload: "You are not active in this room.",
			});
			return;
		}

		const player = room.players.find((p) => p.id === socket.userId);
		if (!player) {
			sendTo(socket, {
				type: "error",
				payload: "You are not in this room.",
			});
			return;
		}

		if (room.status !== "running") {
			sendTo(socket, {
				type: "error",
				payload: "Race is not in progress.",
			});
			return;
		}

		if (player.isFinished) {
			sendTo(socket, {
				type: "error",
				payload: "Player has already finished the race.",
			});
			return;
		}

		if (
			payload.progress === undefined ||
			typeof payload.progress !== "number" ||
			isNaN(payload.progress) ||
			payload.progress < 0 ||
			payload.progress > 100
		) {
			sendTo(socket, {
				type: "error",
				payload: "Invalid progress value.",
			});
			return;
		}

		const newProgress = Math.min(
			100,
			Math.max(player.progress || 0, payload.progress),
		);
		player.progress = newProgress;

		if (payload.wpm !== undefined) {
			const numWpm = Number(payload.wpm);
			if (!isNaN(numWpm) && numWpm >= 0 && numWpm <= 500) {
				player.wpm = Math.round(numWpm);
			}
		}

		if (payload.accuracy !== undefined) {
			const numAcc = Number(payload.accuracy);
			if (!isNaN(numAcc) && numAcc >= 0 && numAcc <= 100) {
				player.accuracy = Math.round(numAcc);
			}
		}

		if (payload.isFinished || newProgress >= 100) {
			player.isFinished = true;
			player.progress = 100;
			if (!player.finishedAt) {
				player.finishedAt = Date.now();
			}
		}

		const sorted = [...room.players].sort((a, b) => {
			if (a.isFinished && !b.isFinished) return -1;
			if (!a.isFinished && b.isFinished) return 1;
			if (a.isFinished && b.isFinished) {
				if (a.finishedAt && b.finishedAt && a.finishedAt !== b.finishedAt) {
					return a.finishedAt - b.finishedAt;
				}
				return (b.wpm || 0) - (a.wpm || 0);
			}
			if ((b.progress || 0) !== (a.progress || 0)) {
				return (b.progress || 0) - (a.progress || 0);
			}
			return (b.wpm || 0) - (a.wpm || 0);
		});

		sorted.forEach((p, idx) => {
			const target = room.players.find((pl) => pl.id === p.id);
			if (target) {
				target.rank = idx + 1;
			}
		});

		const updateMessage = {
			type: "room:progress_updated",
			payload: sanitizeRoom(room),
		};
		broadcastToRoom(room.id, updateMessage);

		if (room.players.length > 0 && room.players.every((p) => p.isFinished)) {
			room.status = "waiting";
			const finishedMessage = {
				type: "room:updated",
				payload: sanitizeRoom(room),
			};
			wssInstance?.clients.forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					sendTo(client, finishedMessage);
				}
			});
		}
		return;
	}
};
