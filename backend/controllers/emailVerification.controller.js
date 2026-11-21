import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
import pool from "../model/db.js";

dotenv.config();

export const emailVerificationController = async (request, response) => {
    try {
        const { token } = request.params;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.purpose !== "email_verification") {
            return response.status(401).json({
                message: "Invalid token type",
            });
        }

        const user = await pool.query(
            `
                SELECT id, isverified
                FROM users
                WHERE id = $1;
            `, [decoded.userId]
        )

        if (!user || user.rows.length === 0) {
            return response.status(400).json({
                message: "User not found!"
            })
        }

        if (user.rows[0].isverified == true) {
            return response.status(400).json({
                message: "Email already Verified",
            });
        }

        const verifiedUser = await pool.query(
            `
                UPDATE users
                SET isverified = True
                WHERE id = $1
                RETURNING id;
            `, [decoded.userId]
        )

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
