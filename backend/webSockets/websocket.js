import { WebSocket } from "ws";

const rooms = [];

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
}

export const setUpWebSocketServer = (wss) => {
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

			if (type === "room:create") {
				if (
					!payload ||
					!payload.name ||
					typeof payload.name !== "string"
				) {
					sendTo(socket, {
						type: "error",
						payload: "Room name is required",
					});
					return;
				}

				if (socket._roomId) {
					sendTo(socket, {
						type: "error",
						payload: "You are already in a room. Leave it first.",
					});
					return;
				}

				const roomType =
					payload.type === "private" ? "private" : "public";
				const capacity = Math.min(
					Math.max(Number(payload.capacity) || 5, 2),
					10,
				);

				const createdRoom = {
					id:
						payload.id && typeof payload.id === "string"
							? payload.id
							: generateRoomCode(),
					name: payload.name.trim().substring(0, 40),
					type: roomType,
					status: "waiting",
					playerCount: 1,
					capacity: capacity,
					password:
						roomType === "private" ? payload.password || "" : null,
					adminId: socket.userId,
					players: [
						{
							id: socket.userId,
							username: socket.username,
						},
					],
				};

				rooms.push(createdRoom);
				addSocketToRoom(createdRoom.id, socket);

				const sanitized = sanitizeRoom(createdRoom);
				wss.clients.forEach((client) => {
					if (client.readyState === WebSocket.OPEN) {
						sendTo(client, {
							type: "room:created",
							payload: sanitized,
						});
					}
				});
				return;
			}

			if (type === "room:join") {
				if (!payload || !payload.roomId) {
					sendTo(socket, {
						type: "error",
						payload: "Room ID is required",
					});
					return;
				}

				if (socket._roomId) {
					sendTo(socket, {
						type: "error",
						payload: "You are already in a room. Leave it first.",
					});
					return;
				}

				const findRoomToJoin = rooms.find(
					(r) => r.id === payload.roomId,
				);
				if (!findRoomToJoin) {
					sendTo(socket, {
						type: "room:join:error",
						payload: "Room not found.",
					});
					return;
				}

				if (findRoomToJoin.status === "running") {
					sendTo(socket, {
						type: "room:join:error",
						payload:
							"Cannot join a room that is already in progress.",
					});
					return;
				}

				if (findRoomToJoin.playerCount >= findRoomToJoin.capacity) {
					sendTo(socket, {
						type: "room:join:error",
						payload: "This room is full.",
					});
					return;
				}

				if (
					findRoomToJoin.players.some((p) => p.id === socket.userId)
				) {
					sendTo(socket, {
						type: "room:join:error",
						payload: "You are already in this room.",
					});
					return;
				}

				if (findRoomToJoin.type === "private") {
					if (
						!payload.password ||
						payload.password !== findRoomToJoin.password
					) {
						sendTo(socket, {
							type: "room:join:error",
							payload: "Incorrect password for private room.",
						});
						return;
					}
				}

				findRoomToJoin.players.push({
					id: socket.userId,
					username: socket.username,
				});
				findRoomToJoin.playerCount = findRoomToJoin.playerCount + 1;

				addSocketToRoom(findRoomToJoin.id, socket);

				sendTo(socket, {
					type: "room:joined",
					payload: sanitizeRoom(findRoomToJoin),
				});

				broadcastToRoom(
					findRoomToJoin.id,
					{
						type: "room:updated",
						payload: sanitizeRoom(findRoomToJoin),
					},
					socket,
				);
				return;
			}

			if (type === "room:leave") {
				if (!payload || !payload.roomId) {
					sendTo(socket, {
						type: "error",
						payload: "Room ID is required",
					});
					return;
				}

				const findRoomToLeave = rooms.find(
					(r) => r.id === payload.roomId,
				);
				if (!findRoomToLeave) {
					return;
				}

				if (
					!findRoomToLeave.players.some((p) => p.id === socket.userId)
				) {
					sendTo(socket, {
						type: "error",
						payload: "You are not in this room.",
					});
					return;
				}

				const isAdmin = findRoomToLeave.adminId === socket.userId;

				if (isAdmin) {
					const index = rooms.findIndex(
						(r) => r.id === payload.roomId,
					);
					if (index !== -1) {
						rooms.splice(index, 1);
					}

					broadcastToRoom(findRoomToLeave.id, {
						type: "room:deleted",
						payload: findRoomToLeave.id,
					});

					sendTo(socket, {
						type: "room:deleted",
						payload: findRoomToLeave.id,
					});

					const roomSocketSet = roomSockets.get(findRoomToLeave.id);
					if (roomSocketSet) {
						for (const s of roomSocketSet) {
							s._roomId = null;
						}
						roomSockets.delete(findRoomToLeave.id);
					}
				} else {
					findRoomToLeave.players = findRoomToLeave.players.filter(
						(player) => player.id !== socket.userId,
					);
					findRoomToLeave.playerCount =
						findRoomToLeave.playerCount - 1;

					removeSocketFromRoom(socket);

					sendTo(socket, {
						type: "room:left",
						payload: findRoomToLeave.id,
					});

					broadcastToRoom(findRoomToLeave.id, {
						type: "room:updated",
						payload: sanitizeRoom(findRoomToLeave),
					});
				}
				return;
			}

			if (type === "room:delete") {
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
						payload: "Only the room admin can delete this room.",
					});
					return;
				}

				const index = rooms.findIndex((r) => r.id === payload.roomId);
				if (index !== -1) {
					rooms.splice(index, 1);
				}

				broadcastToRoom(room.id, {
					type: "room:deleted",
					payload: room.id,
				});

				sendTo(socket, {
					type: "room:deleted",
					payload: room.id,
				});

				const roomSocketSet = roomSockets.get(room.id);
				if (roomSocketSet) {
					for (const s of roomSocketSet) {
						s._roomId = null;
					}
					roomSockets.delete(room.id);
				}
				return;
			}

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

				room.status = "running";
				if (payload.passage) {
					room.passage = payload.passage;
				}

				broadcastToRoom(room.id, {
					type: "room:start",
					payload: sanitizeRoom(room),
				});
				sendTo(socket, {
					type: "room:start",
					payload: sanitizeRoom(room),
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

				if (payload.progress !== undefined)
					player.progress = payload.progress;
				if (payload.wpm !== undefined) player.wpm = payload.wpm;
				if (payload.isFinished !== undefined)
					player.isFinished = payload.isFinished;
				if (payload.rank !== undefined) player.rank = payload.rank;

				const updateMessage = {
					type: "room:progress_updated",
					payload: sanitizeRoom(room),
				};
				broadcastToRoom(room.id, updateMessage);
				sendTo(socket, updateMessage);
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

function generateRoomCode() {
	return Math.random().toString(36).substring(2, 7).toUpperCase();
}
