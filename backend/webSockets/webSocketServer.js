import { WebSocket } from "ws";
import { handleRoomMessage } from "./roomManager.js";
import { handleRaceMessage, finalizeRaceResults } from "./raceManager.js";

const rooms = [];

let wssInstance = null;

const roomSockets = new Map();

function sanitizeRoom(room) {
	if (!room) return room;
	const { password, ...safe } = room;
	return safe;
}

function sendTo(socket, message) {
	if (socket.readyState === WebSocket.OPEN) {
		socket.send(JSON.stringify(message));
	}
}

function broadcastToRoom(roomId, message, excludeSocket) {
	const sockets = roomSockets.get(roomId);
	if (!sockets) return;
	const data = JSON.stringify(message);
	for (const s of sockets) {
		if (s !== excludeSocket && s.readyState === WebSocket.OPEN) {
			s.send(data);
		}
	}
}

function addSocketToRoom(roomId, socket) {
	if (!roomSockets.has(roomId)) {
		roomSockets.set(roomId, new Set());
	}
	roomSockets.get(roomId).add(socket);
	socket._roomId = roomId;
}

function removeSocketFromRoom(socket) {
	const roomId = socket._roomId;
	if (!roomId) return;
	const sockets = roomSockets.get(roomId);
	if (sockets) {
		sockets.delete(socket);
		if (sockets.size === 0) {
			roomSockets.delete(roomId);
		}
	}
	socket._roomId = null;

	const roomIndex = rooms.findIndex((r) => r.id === roomId);
	if (roomIndex === -1) return;
	const room = rooms[roomIndex];

	if (room.adminId === socket.userId) {
		rooms.splice(roomIndex, 1);

		const remainingSockets = roomSockets.get(room.id);
		if (remainingSockets) {
			for (const s of remainingSockets) {
				s._roomId = null;
			}
			roomSockets.delete(room.id);
		}

		wssInstance?.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				sendTo(client, {
					type: "room:deleted",
					payload: room.id,
				});
			}
		});
	} else {
		room.players = room.players.filter(
			(player) => player.id !== socket.userId,
		);
		room.playerCount = room.players.length;

		if (room.playerCount === 0) {
			rooms.splice(roomIndex, 1);
			roomSockets.delete(room.id);
			wssInstance?.clients.forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					sendTo(client, {
						type: "room:deleted",
						payload: room.id,
					});
				}
			});
		} else {
			if (room.status === "running" && room.players.every((p) => p.isFinished)) {
				room.status = "waiting";
				finalizeRaceResults(room);
			}

			const updated = sanitizeRoom(room);
			wssInstance?.clients.forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					sendTo(client, {
						type: "room:updated",
						payload: updated,
					});
				}
			});
		}
	}
}

function generateRoomCode() {
	return Math.random().toString(36).substring(2, 7).toUpperCase();
}

export const setUpWebSocketServer = (wss) => {
	wssInstance = wss;
	wss.on("connection", (socket) => {
		if (!socket.userId || !socket.username) {
			socket.close(4001, "Authentication required");
			return;
		}

		sendTo(socket, {
			type: "room:list",
			payload: rooms.map(sanitizeRoom),
		});

		socket.on("message", (rawMessage) => {
			let parsedMessage;
			try {
				parsedMessage = JSON.parse(rawMessage.toString());
			} catch {
				sendTo(socket, {
					type: "error",
					payload: "Invalid JSON",
				});
				return;
			}

			const { type, payload } = parsedMessage;
			if (!type || typeof type !== "string") {
				sendTo(socket, {
					type: "error",
					payload: "Missing or invalid message type",
				});
				return;
			}

			if (
				type === "room:create" ||
				type === "room:join" ||
				type === "room:leave" ||
				type === "room:delete"
			) {
				handleRoomMessage(type, payload, socket, {
					rooms,
					roomSockets,
					wss,
					wssInstance,
					sanitizeRoom,
					sendTo,
					addSocketToRoom,
					generateRoomCode,
					finalizeRaceResults,
				});
				return;
			}

			if (type === "room:start" || type === "room:update_progress") {
				handleRaceMessage(type, payload, socket, {
					rooms,
					wssInstance,
					sanitizeRoom,
					sendTo,
					broadcastToRoom,
				});
				return;
			}

			sendTo(socket, {
				type: "error",
				payload: `Unknown message type: ${type}`,
			});
		});

		socket.on("close", () => {
			removeSocketFromRoom(socket);
		});
	});
};
