import jwt from "jsonwebtoken";
import dotenv from 'dotenv'; 
dotenv.config(); 

export const generateVerificationToken = (userId, expiresIn = '1h') => {
    return jwt.sign({ userId, }, process.env.JWT_SECRET, { expiresIn, });
}

export const generateResetToken = (userId) => {
    return jwt.sign({ userId, }, process.env.JWT_SECRET, { expiresIn: "1h" });
}