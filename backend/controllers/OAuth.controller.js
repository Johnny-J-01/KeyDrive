import { generateAccessToken } from "../utils/jwttoken.utils.js";
import {
	generateRefreshToken,
	hashRefreshToken,
} from "../utils/refreshTokens.utils.js";
import supabase from "../model/supabase.js";

export const googleLoginController = async (request, response) => {
	const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

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

		const { error: insertError } = await supabase
			.from("auth_sessions")
			.insert({
				user_id: user.id,
				token_hash: refreshTokenHash,
				expires_at: expiresAt.toISOString(),
			});

		if (insertError) {
			throw insertError;
		}

		const isProd = process.env.NODE_ENV === "production";

		response.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: isProd,
			sameSite: isProd ? "none" : "lax",
			maxAge: 30 * 24 * 60 * 60 * 1000,
			path: "/",
		});
		return response.redirect(
			`${clientUrl}/login?oauth=success&token=${encodeURIComponent(accessToken)}`,
		);
	} catch (error) {
		console.error("Google OAuth error:", error);
		return response.redirect(`${clientUrl}/login?oauth=failed`);
	}
};
