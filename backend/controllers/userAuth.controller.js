import {
	userRegisterSchema,
	userLoginSchema,
} from "../validation/userAuth.validation.js";
import bcrypt from "bcrypt";
import supabase from "../model/supabase.js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import {
	generateRefreshToken,
	hashRefreshToken,
} from "../utils/refreshTokens.utils.js";
import {
	generateVerificationToken,
	generateAccessToken,
} from "../utils/jwttoken.utils.js";
import { verifyTemplate } from "../templates/verify.template.js";
import { sendEmail } from "../services/mail.services.js";

dotenv.config();

const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

const getRefreshCookieOptions = () => {
	const isProd = process.env.NODE_ENV === "production";

	return {
		httpOnly: true,
		secure: isProd,
		sameSite: isProd ? "none" : "lax",
		path: "/",
	};
};

export const userAuthRegisterController = async (request, response) => {
	try {
		const data = request.body;
		const validationResult = userRegisterSchema.safeParse(data);
		if (!validationResult.success) {
			return response.status(400).json({
				success: false,
				message: validationResult.error.issues,
			});
		}

		const userHashedPassword = await bcrypt.hash(
			validationResult.data.userPassword,
			10,
		);
		const { data: newUser, error: insertError } = await supabase
			.from("users")
			.insert({
				username: validationResult.data.userName,
				email: validationResult.data.userEmail,
				password_hash: userHashedPassword,
			})
			.select()
			.single();

		if (insertError) {
			throw insertError;
		}

		const userId = newUser.id;
		const verificationToken = generateVerificationToken(userId);

		const verificationLink = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

		try {
			await sendEmail({
				to: validationResult.data.userEmail,
				subject: "Verify your email",
				html: verifyTemplate(
					validationResult.data.userName,
					verificationLink,
				),
			});
			response.status(200).json({ ...data });
		} catch (error) {
			console.log(
				`Failed to send the verification email: `,
				error.message,
			);
		}
	} catch (error) {
		response.status(400).json({
			error: error,
		});
	}
};

export const userAuthProfileController = async (request, response) => {
	try {
		const userId = request.user?.userId;
		if (!userId) {
			return response.status(401).json({
				success: false,
				message: "Please login to update your profile",
			});
		}

		const data = request.body;
		const validationResult = userRegisterSchema.safeParse({
			userName: data.username,
			userEmail: data.email,
			userPassword: data.password,
		});
		if (!validationResult.success) {
			return response.status(400).json({
				success: false,
				message: validationResult.error.issues,
			});
		}

		const userHashedPassword = await bcrypt.hash(data.password, 10);
		const { data: updatedUser, error: updateError } = await supabase
			.from("users")
			.update({
				username: data.username,
				email: data.email,
				password_hash: userHashedPassword,
			})
			.eq("id", userId)
			.select("id");

		if (updateError || !updatedUser || updatedUser.length === 0) {
			throw updateError || new Error("Failed to update profile");
		}

		response.status(200).json({
			message: "Successfully updated the data into the database",
		});
	} catch (error) {
		response.status(400).json({
			error: error,
		});
	}
};

export const userAuthLoginController = async (request, response) => {
	try {
		const data = request.body;
		const validationResult = userLoginSchema.safeParse(data);
		if (!validationResult.success) {
			return response.status(400).json({
				success: false,
				message: validationResult.error.issues,
			});
		}

		const { userEmail, userPassword } = validationResult.data;
		if (!userEmail || !userPassword) {
			return response.status(400).json({
				success: false,
				message: "Email and password are required",
			});
		}

		const { data: dbUser, error: userError } = await supabase
			.from("users")
			.select("*")
			.eq("email", userEmail)
			.maybeSingle();

		if (userError || !dbUser) {
			return response.status(401).json({
				success: false,
				message: "Invalid email or password",
			});
		}

		const isPasswordMatch = await bcrypt.compare(
			userPassword,
			dbUser.password_hash,
		);
		if (!isPasswordMatch) {
			return response.status(401).json({
				success: false,
				message: "Invalid email or password",
			});
		}

		const accessToken = generateAccessToken(dbUser.id);

		const refreshToken = generateRefreshToken();
		const refreshTokenHash = hashRefreshToken(refreshToken);
		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

		const { error: sessionError } = await supabase
			.from("auth_sessions")
			.insert({
				user_id: dbUser.id,
				token_hash: refreshTokenHash,
				expires_at: expiresAt.toISOString(),
			});

		if (sessionError) {
			throw sessionError;
		}

		response.cookie("refreshToken", refreshToken, {
			...getRefreshCookieOptions(),
			maxAge: REFRESH_TOKEN_MAX_AGE,
		});

		return response.status(200).json({
			success: true,
			user: {
				id: dbUser.id,
				userName: dbUser.username,
				userEmail: dbUser.email,
			},
			accessToken,
		});
	} catch (error) {
		return response.status(400).json({
			error: error.message,
		});
	}
};

export const userAuthRefreshController = async (request, response) => {
	try {
		const refreshToken = request.cookies.refreshToken;

		if (!refreshToken) {
			return response.status(401).json({
				success: false,
				message: "Refresh token not found",
			});
		}

		const refreshTokenHash = hashRefreshToken(refreshToken);
		const newRefreshToken = generateRefreshToken();
		const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
		const newExpiresAt = new Date(
			Date.now() + 30 * 24 * 60 * 60 * 1000,
		).toISOString();

		const { data, error } = await supabase.rpc("rotate_refresh_token", {
			p_old_token_hash: refreshTokenHash,
			p_new_token_hash: newRefreshTokenHash,
			p_new_expires_at: newExpiresAt,
		});

		if (error) {
			throw error;
		}

		if (data?.status === "invalid_token") {
			response.clearCookie("refreshToken", getRefreshCookieOptions());

			return response.status(401).json({
				success: false,
				message: "Invalid refresh token",
			});
		}

		if (data?.status === "reuse_detected") {
			response.clearCookie("refreshToken", getRefreshCookieOptions());

			return response.status(401).json({
				success: false,
				message: "Refresh token reuse detected. Please login again.",
			});
		}

		if (data?.status === "expired") {
			response.clearCookie("refreshToken", getRefreshCookieOptions());

			return response.status(401).json({
				success: false,
				message: "Refresh token expired. Please login again.",
			});
		}

		if (data?.status === "user_not_found") {
			response.clearCookie("refreshToken", getRefreshCookieOptions());

			return response.status(401).json({
				success: false,
				message: "User no longer exists",
			});
		}

		if (data?.status !== "success" || !data?.user_id) {
			throw new Error("Unexpected rotation result");
		}

		const accessToken = generateAccessToken(data.user_id);

		response.cookie("refreshToken", newRefreshToken, {
			...getRefreshCookieOptions(),
			maxAge: REFRESH_TOKEN_MAX_AGE,
		});

		return response.status(200).json({
			success: true,
			accessToken,
		});
	} catch (error) {
		console.error("Refresh token error:", error);

		return response.status(500).json({
			success: false,
			message: "Failed to refresh access token",
		});
	}
};

export const userAuthLogoutController = async (request, response) => {
	try {
		const refreshToken = request.cookies.refreshToken;
		if (!refreshToken) {
			return response.status(200).json({
				success: true,
				message: "Logged out successfully",
			});
		}

		const refreshTokenHash = hashRefreshToken(refreshToken);
		const { error } = await supabase
			.from("auth_sessions")
			.update({ revoked_at: new Date().toISOString() })
			.eq("token_hash", refreshTokenHash)
			.is("revoked_at", null);

		if (error) {
			throw error;
		}

		response.clearCookie("refreshToken", getRefreshCookieOptions());
		return response.status(200).json({
			success: true,
			message: "Logged out successfully",
		});
	} catch (error) {
		return response.status(500).json({
			success: false,
			message: "Failed to logout",
		});
	}
};

export const userAuthDeleteController = async (request, response) => {
	try {
		const userId = request.user?.userId;

		if (!userId) {
			return response.status(401).json({
				success: false,
				message:
					"Login to your account to proceed with deleting the account",
			});
		}

		const { error: practiceError } = await supabase
			.from("practice_history")
			.delete()
			.eq("user_id", userId);

		if (practiceError) {
			throw practiceError;
		}

		const { error: sessionError } = await supabase
			.from("auth_sessions")
			.delete()
			.eq("user_id", userId);

		if (sessionError) {
			throw sessionError;
		}

		const { data: deletedUsers, error: userError } = await supabase
			.from("users")
			.delete()
			.eq("id", userId)
			.select("id");

		if (userError) {
			throw userError;
		}

		if (!deletedUsers || deletedUsers.length === 0) {
			return response.status(404).json({
				success: false,
				message: "User not found",
			});
		}

		response.clearCookie("refreshToken", getRefreshCookieOptions());

		return response.status(200).json({
			success: true,
			message: "Account deleted successfully",
		});
	} catch (error) {
		return response.status(400).json({
			success: false,
			message: error.message,
		});
	}
};
