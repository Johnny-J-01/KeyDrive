import { WebSocket } from "ws";
import crypto from "crypto";
import supabase from "../model/supabase.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const finalizeRaceResults = async (room, { db = supabase } = {}) => {
	if (!room || room.isFinalized || room.isFinalizing) {
		return;
	}

	if (!room.players || room.players.length === 0) {
		return;
	}

	if (!room.players.every((p) => p.isFinished)) {
		return;
	}

	if (!room.players.some((p) => p.isFinished && (p.progress || 0) >= 100)) {
		return;
	}

	room.isFinalizing = true;
	room.status = "waiting";

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

	const winner = sorted.find((p) => p.rank === 1 && p.isFinished && (p.progress || 0) >= 100);
	const winnerId = winner ? winner.id : null;
	if (winnerId) {
		room.winnerId = winnerId;
	}

	const raceId = (typeof room.raceId === "string" && UUID_REGEX.test(room.raceId))
		? room.raceId
		: crypto.randomUUID();
	const startTime = room.startTime ? new Date(room.startTime).toISOString() : new Date().toISOString();
	const endTime = new Date();

	try {
		const participants = [];
		for (const player of sorted) {
			if (!player.id || typeof player.id !== "string" || !UUID_REGEX.test(player.id)) {
				continue;
			}

			const placement = player.rank;
			const wpm = Math.round(player.wpm || 0);
			const accuracy = Math.round(player.accuracy !== undefined ? player.accuracy : 100);
			const completedAt = player.finishedAt ? new Date(player.finishedAt).toISOString() : endTime.toISOString();
			const errors = player.errors || 0;

			const isWinner = (player.id === winnerId && placement === 1 && player.isFinished);
			const winIncrement = isWinner ? 1 : 0;

			participants.push({
				user_id: player.id,
				wpm,
				accuracy,
				placement,
				errors,
				completed_at: completedAt,
				win_increment: winIncrement,
			});
		}

		const { data, error } = await db.rpc("persist_race_results", {
			p_race_id: raceId,
			p_passage_id: room.passageId || null,
			p_start_time: startTime,
			p_end_time: endTime.toISOString(),
			p_participants: participants,
		});

		if (error) {
			throw error;
		}

		if (data?.success === false && data?.reason === "already_finalized") {
			room.isFinalized = true;
			return;
		}

		room.isFinalized = true;
	} catch (err) {
		console.error("Failed to persist race results:", err);
	} finally {
		room.isFinalizing = false;
	}
};

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
		room.raceId = crypto.randomUUID();
		room.startTime = Date.now();
		room.isFinalized = false;
		room.isFinalizing = false;
		delete room.winnerId;
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
		if (payload.passageId) {
			room.passageId = payload.passageId;
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
			finalizeRaceResults(room);
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
