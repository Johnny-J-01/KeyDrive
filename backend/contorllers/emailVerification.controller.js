import jwt, { decode } from "jsonwebtoken";
import dotenv from 'dotenv'; 
import pool from "../model/db.js";

dotenv.config(); 

export const emailVerificationController = async (request, response) => {
    try {
        const { token } = request.params; 
        const decoded = jwt.verify(token, process.env.JWT_SECRET); 
        console.log("decoded: ", decoded);
        const user = await pool.query(
            `
                SELECT * 
                FROM users
                WHERE id = $1
            `, [decoded.userId]
        )

        if (!user) {
            return response.status(400).json({
                message: "User not found!"
            })
        }

        console.log("USER AFTER RETURING: ", user);
        if (user.is_verified) {
            return response.status(400).json({
                message: "Email already Verified", 
            }); 
        }

        // const verifiedUser = await userModel.findByIdAndUpdate({_id : decoded.userId}, {isVerified: true,}, {returnDocument: "after"}); 
        const verifiedUser = await updateUserVerification(decoded.userId); 
        console.log("veid: ", verifiedUser); 
        response.status(200).json({
            message: "Registration successfull. Please check your email"
        })
    }
    catch(error) {
        response.status(401).json({
            message: error.message, 
        })
    }
}