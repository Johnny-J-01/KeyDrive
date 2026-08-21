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
                console.log("current rooms list: ", rooms);
                console.log("Find room to join: ", findRoomToJoin);
                if (findRoomToJoin) {
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
                console.log("final find room to join: ", findRoomToJoin);
            }
        });
    });
};