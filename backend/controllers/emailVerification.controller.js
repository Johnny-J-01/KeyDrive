import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
import supabase from "../model/supabase.js";

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

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id, isverified")
            .eq("id", decoded.userId)
            .maybeSingle();

        if (userError) {
            return response.status(400).json({
                message: userError.message,
            });
        }

        if (!user) {
            return response.status(400).json({
                message: "User not found!"
            });
        }

        if (user.isverified == true) {
            return response.status(400).json({
                message: "Email already Verified",
            });
        }

        const { error: updateError } = await supabase
            .from("users")
            .update({ isverified: true })
            .eq("id", decoded.userId);

        if (updateError) {
            return response.status(400).json({
                message: updateError.message,
            });
        }

        response.status(200).json({
            message: "Registration successfull. Please check your email"
        });
    }
    catch(error) {
        response.status(401).json({
            message: error.message,
        });
    }
};
