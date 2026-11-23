import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import supabase from "../model/supabase.js";

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

				const { data: user, error: selectError } = await supabase
					.from("users")
					.select("*")
					.eq("email", email)
					.maybeSingle();

				if (selectError) {
					return done(selectError);
				}

				if (user) {
					if (!user.isverified) {
						const { error: updateError } = await supabase
							.from("users")
							.update({ isverified: true })
							.eq("id", user.id);
						if (updateError) {
							return done(updateError);
						}
					}
					return done(null, user);
				}

				const googlePasswordPlaceholder = await bcrypt.hash(
					`${email}-${Date.now()}-google-oauth`,
					10,
				);

				const { data: createdUser, error: insertError } = await supabase
					.from("users")
					.insert({
						username,
						email,
						password_hash: googlePasswordPlaceholder,
						isverified: true,
					})
					.select()
					.single();

				if (insertError) {
					return done(insertError);
				}

				return done(null, createdUser);
			} catch (error) {
				return done(error);
			}
		},
	),
);

export default passport;
