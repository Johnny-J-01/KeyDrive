import express from 'express'; 
import dotenv from 'dotenv'; 

dotenv.config(); 

const app = express(); 
const PORT = process.env.PORT; 

// middleware: 
app.use(express.json()); 
app.use(express.urlencoded({extended: false})); 
app.use(express.static('/KEYDRIVE/backend/public')); 

app.get('/', (request, response) => {
    response.send("Home Page"); 
}); 

app.listen(PORT, () => {
    console.log(`port started at ${PORT}`);
})