import { generateAccessToken } from "../utils/JWTtoken.utils.js";
import { generateRefreshToken, hashRefreshToken } from "../utils/refreshTokens.utils.js";
import pool from "../model/db.js";

export const googleLoginController = async (request, response) => {
	try {
		const user = request.user;

		if (!user) {
			return response.status(401).json({
				success: false,
				message: "Google login failed",
			});
		}

		const accessToken = generateAccessToken(user.id);
		const refreshToken = generateRefreshToken();
		const refreshTokenHash = hashRefreshToken(refreshToken);
		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

		await pool.query(
			`
				INSERT INTO auth_sessions (user_id, token_hash, expires_at)
				VALUES ($1, $2, $3);
			`,
			[user.id, refreshTokenHash, expiresAt],
		);

		response.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 30 * 24 * 60 * 60 * 1000,
			path: "/",
		});

		return response.redirect(
			`http://localhost:5173/login?oauth=success&token=${encodeURIComponent(accessToken)}`,
		);
	} catch (error) {
		console.error("Google OAuth error:", error);
		return response.redirect("http://localhost:5173/login?oauth=failed");
	}
};
