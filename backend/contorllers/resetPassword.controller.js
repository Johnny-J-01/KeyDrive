import { userLoginSchema} from '../validation/userAuth.validation.js';
import { generateResetToken } from "../utils/JWTtoken.utils.js";
import { sendEmail } from '../services/mail.services.js';
import { resetPasswordTemplate } from '../templates/resetPassword.template.js';
import jwt from 'jsonwebtoken'; 
import bcrypt from 'bcrypt'
import pool from '../model/db.js'

export const forgotPasswordController = async (request, response) => {
    try {
        const { email } = request.body;

        if (!email) {
            return response.status(400).json({
                success: false,
                message: "Email not found"
            })
        }

        const result = await pool.query(
            `
                SELECT *  
                FROM users 
                WHERE email = $1
            `, [email]
        ); 


        if (!result) {
            return response.status(400).json({
                success: false,
                message: "User not found"
            })
        }

        const ResetToken = generateResetToken(result.rows[0].id);
        const ResetLink = `http://localhost:5173/reset-password?token=${ResetToken}`;

        try {
            await sendEmail({
                to: result.rows[0].email,
                subject: "Reset Your Email",
                html: resetPasswordTemplate(
                    result.rows[0].username,
                    ResetLink
                ),
            });
            response.status(200).json({ ...result.rows[0], "message": "Password has been reset, Redirecting to login page" });
        }
        catch (error) {
            console.log(`Failed to send the Reset email: `, error.message);
        }
    }
    catch (error) {
        console.log(error);
        response.status(400).json({
            message: error.message
        })
    }
}

export const resetPasswordController = async (request, response) => {
    try {
        const { token, password } = request.body;

        const hashedNewPassword = await bcrypt.hash(password, 10);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        console.log("decoded: ", decoded);

        const updatePassword = await pool.query(
            `
                UPDATE users 
                SET 
                    password_hash = $1
                WHERE id = $2
                RETURNING *;  
            `,[hashedNewPassword, userId] 
        ); 

        if (!updatePassword) {
            response.status(400).json({
                success: false,
                message: "failed to reset the password"
            })
        }

        response.status(200).json({
            success: true,
            message: "successfully changed the password"
        })
    }
    catch (error) {
        response.status(400).json({
            message: error.message
        })
    }
}