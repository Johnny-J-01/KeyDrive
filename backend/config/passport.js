import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import pool from "../model/db.js";

dotenv.config();

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL: process.env.CALLBACK_URL,
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				const email = profile.emails?.[0]?.value;
				if (!email) {
					return done(new Error("Email not received from Google"));
				}

				const username =
					profile.displayName ||
					profile.name?.givenName ||
					"Google User";

				const existingUser = await pool.query(
					`SELECT * FROM users WHERE email = $1;`,
					[email],
				);

				if (existingUser.rows.length > 0) {
					const user = existingUser.rows[0];
					if (!user.isverified) {
						await pool.query(
							`UPDATE users SET isverified = TRUE WHERE id = $1;`,
							[user.id],
						);
					}
					return done(null, user);
				}

				const googlePasswordPlaceholder = await bcrypt.hash(
					`${email}-${Date.now()}-google-oauth`,
					10,
				);

				const createdUser = await pool.query(
					`
						INSERT INTO users (username, email, password_hash, isverified)
						VALUES ($1, $2, $3, TRUE)
						RETURNING *;
					`,
					[username, email, googlePasswordPlaceholder],
				);

				return done(null, createdUser.rows[0]);
			} catch (error) {
				return done(error);
			}
		},
	),
);

export default passport;
