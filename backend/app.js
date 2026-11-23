import express from 'express'; 
import dotenv from 'dotenv'; 
import cors from 'cors'; 
import cookieParser from 'cookie-parser';
import { createServer }  from 'http';
import { WebSocketServer } from 'ws'; 
import path from 'path';
import { fileURLToPath } from 'url';


import AuthRouter from '../backend/routes/userAuth.routes.js';
import emailRouter from '../backend/routes/EmailVerification.routes.js'; 
import statsRouter from '../backend/routes/userStats.routes.js'; 
import practiceRouter from '../backend/routes/practice.routes.js'; 
import resetPasswordRouter from '../backend/routes/ResetPasword.route.js'; 
import googleRouter from '../backend/routes/OAuth.route.js';
import wsTicketRouter from '../backend/routes/wsTicket.routes.js';
import passport from '../backend/config/passport.js';
import { setUpWebSocketServer } from '../backend/webSockets/webSocketServer.js';
import { validateAndConsumeTicket } from '../backend/controllers/wsTicket.controller.js';

dotenv.config(); 

const app = express(); 
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });
const PORT = process.env.PORT || 3000; 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middleware: 
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); 
app.use(express.urlencoded({extended: false})); 
// app.use(express.static('/KEYDRIVE/backend/public')); 
app.use(cors({
    origin: "http://localhost:5173", 
    allowedHeaders: [
        'Content-Type',
        'Authorization'
    ],
    methods: [
        "GET", 
        "POST", 
        "FETCH", 
        "DELETE", 
        "PATCH", 
        "OPTIONS"
    ],
    credentials: true
}));
app.use(cookieParser(process.env.COOKIE_PW));
app.use(passport.initialize());
app.use('/', AuthRouter);
app.use('/', emailRouter);
app.use('/', statsRouter);
app.use('/', practiceRouter);
app.use('/', resetPasswordRouter);
app.use('/', googleRouter);
app.use('/', wsTicketRouter);


server.on('upgrade', (request, socket, head) => {
    try {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const ticket = url.searchParams.get('ticket');

        const user = validateAndConsumeTicket(ticket);

        if (!user) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        request._wsUser = user;

        wss.handleUpgrade(request, socket, head, (ws) => {
            ws.userId = user.userId;
            ws.username = user.username;
            wss.emit('connection', ws, request);
        });
    } catch (error) {
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
    }
});

setUpWebSocketServer(wss);

server.listen(PORT, '0.0.0.0',  () => {
    console.log(`port started at ${PORT}`);
})