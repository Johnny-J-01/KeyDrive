import express from 'express'; 
import dotenv from 'dotenv'; 
import cors from 'cors'; 
import cookieParser from 'cookie-parser';
import { createServer }  from 'http';
import { WebSocketServer } from 'ws'; 


import AuthRouter from '../backend/routes/userAuth.routes.js';
import emailRouter from '../backend/routes/EmailVerification.routes.js'; 
import statsRouter from '../backend/routes/userStats.routes.js'; 
import practiceRouter from '../backend/routes/practice.routes.js'; 
import resetPasswordRouter from '../backend/routes/ResetPasword.route.js'; 
import { setUpWebSocketServer } from '../backend/webSockets/websocket.js';

dotenv.config(); 

const app = express(); 
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT; 

// middleware: 
app.use(express.json()); 
app.use(express.urlencoded({extended: false})); 
app.use(express.static('/KEYDRIVE/backend/public')); 
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
        "PATCH"
    ], 
    credentials: true
})); 
app.use(cookieParser(process.env.COOKIE_PW));
app.use('/', AuthRouter);
app.use('/', emailRouter); 
app.use('/', statsRouter); 
app.use('/', practiceRouter); 
app.use('/', resetPasswordRouter); 

setUpWebSocketServer(wss);

server.listen(PORT, () => {
    console.log(`port started at ${PORT}`);
})