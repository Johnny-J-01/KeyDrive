import { WebSocket } from "ws";

export const handleRoomMessage = (
	type,
	payload,
	socket,
	{
		rooms,
		roomSockets,
		wss,
		wssInstance,
		sanitizeRoom,
		sendTo,
		addSocketToRoom,
		generateRoomCode,
	},
) => {
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
		sendTo(socket, {
			type: "room:joined",
			payload: sanitized,
		});

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

		const sanitized = sanitizeRoom(findRoomToJoin);
		sendTo(socket, {
			type: "room:joined",
			payload: sanitized,
		});

		wssInstance?.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				sendTo(client, {
					type: "room:updated",
					payload: sanitized,
				});
			}
		});
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

			const roomSocketSet = roomSockets.get(findRoomToLeave.id);
			if (roomSocketSet) {
				for (const s of roomSocketSet) {
					s._roomId = null;
				}
				roomSockets.delete(findRoomToLeave.id);
			}

			wssInstance?.clients.forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					sendTo(client, {
						type: "room:deleted",
						payload: findRoomToLeave.id,
					});
				}
			});
			return;
		} else {
			findRoomToLeave.players = findRoomToLeave.players.filter(
				(player) => player.id !== socket.userId,
			);
			findRoomToLeave.playerCount =
				findRoomToLeave.players.length;

			const sockets = roomSockets.get(findRoomToLeave.id);
			if (sockets) {
				sockets.delete(socket);
				if (sockets.size === 0) {
					roomSockets.delete(findRoomToLeave.id);
				}
			}
			socket._roomId = null;

			sendTo(socket, {
				type: "room:left",
				payload: findRoomToLeave.id,
			});

			if (findRoomToLeave.playerCount === 0) {
				const emptyIndex = rooms.findIndex((r) => r.id === findRoomToLeave.id);
				if (emptyIndex !== -1) {
					rooms.splice(emptyIndex, 1);
				}
				roomSockets.delete(findRoomToLeave.id);
				wssInstance?.clients.forEach((client) => {
					if (client.readyState === WebSocket.OPEN) {
						sendTo(client, {
							type: "room:deleted",
							payload: findRoomToLeave.id,
						});
					}
				});
			} else {
				if (findRoomToLeave.status === "running" && findRoomToLeave.players.every((p) => p.isFinished)) {
					findRoomToLeave.status = "waiting";
				}

				const updated = sanitizeRoom(findRoomToLeave);
				wssInstance?.clients.forEach((client) => {
					if (client.readyState === WebSocket.OPEN) {
						sendTo(client, {
							type: "room:updated",
							payload: updated,
						});
					}
				});
			}
			return;
		}
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

		const roomSocketSet = roomSockets.get(room.id);
		if (roomSocketSet) {
			for (const s of roomSocketSet) {
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
		return;
	}
};
