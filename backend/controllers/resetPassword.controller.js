import { generateResetToken } from "../utils/jwttoken.utils.js";
import { sendEmail } from '../services/mail.services.js';
import { resetPasswordTemplate } from '../templates/resetPassword.template.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import supabase from '../model/supabase.js';
import dotenv from 'dotenv'; 

dotenv.config(); 

export const forgotPasswordController = async (request, response) => {
    try {
        const { email } = request.body;

        if (!email || !email.trim()) {
            return response.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const { data: user, error: selectError } = await supabase
            .from("users")
            .select("id, username, email")
            .eq("email", email.trim())
            .maybeSingle();

        if (selectError) {
            throw selectError;
        }

        if (!user) {
            return response.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const resetToken = generateResetToken(user.id);
        const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

        try {
            await sendEmail({
                to: user.email,
                subject: "Reset Your Password",
                html: resetPasswordTemplate(
                    user.username,
                    resetLink
                ),
            });

            return response.status(200).json({
                success: true,
                message: "Password reset link sent to your email"
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

        if (decoded.purpose !== "password_reset") {
            return response.status(401).json({
                success: false,
                message: "Invalid token type"
            });
        }

        const userId = decoded.userId;

        const hashedNewPassword = await bcrypt.hash(password.trim(), 10);

        const { data: updatePassword, error: updateError } = await supabase
            .from("users")
            .update({
                password_hash: hashedNewPassword
            })
            .eq("id", userId)
            .select("id");

        if (updateError || !updatePassword || updatePassword.length === 0) {
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
