const rooms = [];

export const setUpWebSocketServer = (wss) => {
    wss.on("connection", (socket) => {
        socket.send(
            JSON.stringify({
                type: "room:list",
                payload: rooms,
            }),
        );

        socket.on("message", (message) => {
            const parsedMessage = JSON.parse(message.toString());
            if (parsedMessage.type === "room:create") {
                const createdRoomDetails = parsedMessage.payload;
                rooms.push(createdRoomDetails);

                const response = JSON.stringify({
                    type: "room:created",
                    payload: createdRoomDetails,
                });

                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(response);
                    }
                });
            }
            if (parsedMessage.type === "room:join") {
                const findRoomToJoin = rooms.find((r) => {
                    return r.id === parsedMessage.payload.roomId
                });
                if (findRoomToJoin) {
                    if (findRoomToJoin.type === "private" && findRoomToJoin.password !== parsedMessage.payload.password) {
                        const response = JSON.stringify({
                            type: "room:join:error",
                            payload: "Incorrect password for private room.",
                        });
                        socket.send(response);
                    }
                    else {
                        findRoomToJoin.players.push(parsedMessage.payload.user);
                        findRoomToJoin.playerCount = findRoomToJoin.playerCount + 1;
                        const response = JSON.stringify({
                            type: "room:joined",
                            payload: findRoomToJoin,
                        });
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(response);
                            }
                        });
                    }
                }
            }
            if (parsedMessage.type === "room:leave") {
                const findRoomToLeave = rooms.find((r) => {
                    return r.id === parsedMessage.payload.roomId
                });
                console.log("find room to leave: ", findRoomToLeave);
                if (findRoomToLeave) {
                    const isAdmin = findRoomToLeave.adminId === parsedMessage.payload.userData.id;

                    if (isAdmin) {
                        const index = rooms.findIndex((r) => r.id === parsedMessage.payload.roomId);
                        if (index !== -1) {
                            rooms.splice(index, 1);
                        }
                        const response = JSON.stringify({
                            type: "room:deleted",
                            payload: findRoomToLeave.id,
                        });
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(response);
                            }
                        });
                    }

                    if (!isAdmin) {
                        console.log("toLeaveroom players curretnly: ", findRoomToLeave.players);
                        findRoomToLeave.players = findRoomToLeave.players.filter((player) => {
                            return player.id !== parsedMessage.payload.userData.id;
                        });
                        findRoomToLeave.playerCount = findRoomToLeave.playerCount - 1;

                        // for everyone else in the room: 
                        const responseForEveryoneElse = JSON.stringify({
                            type: "room:updated",
                            payload: findRoomToLeave,
                        });

                        // for the player who just left
                        const responseForPlayer = JSON.stringify({
                            type: "room:left",
                            payload: findRoomToLeave.id,
                        });
                        console.log("Final room data: ", findRoomToLeave);
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                if (client === socket) {
                                    client.send(responseForPlayer);
                                } else {
                                    client.send(responseForEveryoneElse);
                                }
                            }
                        });
                    }
                }
            }
            if (parsedMessage.type === "room:delete") {
                const index = rooms.findIndex((r) => r.id === parsedMessage.payload.roomId);
                if (index !== -1) {
                    rooms.splice(index, 1);
                }
                const response = JSON.stringify({
                    type: "room:deleted",
                    payload: parsedMessage.payload.roomId,
                });
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(response);
                    }
                });
            }
            if (parsedMessage.type === "room:start") {
                const { roomId } = parsedMessage.payload;

                const room = rooms.find((room) => room.id === roomId);

                if (!room) {
                    return;
                }

                room.status = "running";

                const response = JSON.stringify({
                    type: "room:start",
                    payload: room,
                });

                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(response);
                    }
                });
            }
        });
    });
};