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

        if (!email || !email.trim()) {
            return response.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const result = await pool.query(
            `
                SELECT *
                FROM users
                WHERE email = $1
            `,
            [email.trim()]
        );

        if (result.rows.length === 0) {
            return response.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const resetToken = generateResetToken(result.rows[0].id);
        const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;

        try {
            await sendEmail({
                to: result.rows[0].email,
                subject: "Reset Your Password",
                html: resetPasswordTemplate(
                    result.rows[0].username,
                    resetLink
                ),
            });

            return response.status(200).json({
                success: true,
                message: "Password reset link sent to your email",
                user: result.rows[0]
            });
        } catch (error) {
            console.log(`Failed to send the Reset email: `, error.message);
            return response.status(500).json({
                success: false,
                message: "Unable to send reset email right now"
            });
        }
    } catch (error) {
        console.log(error);
        return response.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const resetPasswordController = async (request, response) => {
    try {
        const { token, password } = request.body;

        if (!token) {
            return response.status(400).json({
                success: false,
                message: "Reset token is missing"
            });
        }

        if (!password || password.trim().length < 6) {
            return response.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        const hashedNewPassword = await bcrypt.hash(password.trim(), 10);

        const updatePassword = await pool.query(
            `
                UPDATE users
                SET
                    password_hash = $1
                WHERE id = $2
                RETURNING *;
            `,
            [hashedNewPassword, userId]
        );

        if (updatePassword.rows.length === 0) {
            return response.status(400).json({
                success: false,
                message: "Failed to reset the password"
            });
        }

        return response.status(200).json({
            success: true,
            message: "Successfully changed the password"
        });
    } catch (error) {
        return response.status(400).json({
            success: false,
            message: error.message
        });
    }
};