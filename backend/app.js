import express from 'express'; 
import dotenv from 'dotenv'; 
import cors from 'cors'; 
import AuthRouter from '../backend/routes/userAuth.routes.js';

dotenv.config(); 

const app = express(); 
const PORT = process.env.PORT; 

// middleware: 
app.use(express.json()); 
app.use(express.urlencoded({extended: false})); 
app.use(express.static('/KEYDRIVE/backend/public')); 
app.use(cors({
    origin: "http://localhost:5173", 
    allowedHeaders: [
        'Content-Type'
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
app.use('/', AuthRouter);

app.listen(PORT, () => {
    console.log(`port started at ${PORT}`);
})