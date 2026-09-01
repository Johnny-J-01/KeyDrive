import express from "express";
import passport from "../config/passport.js";
import { googleLoginController } from "../controllers/OAuth.controller.js";

const router = express.Router();

router.get(
	"/auth/google",
	passport.authenticate("google", {
		scope: ["profile", "email"],
		session: false,
	}),
);

router.get(
	"/auth/google/callback",
	passport.authenticate("google", {
		failureRedirect: "http://localhost:5173/login?oauth=failed",
		session: false,
	}),
	googleLoginController,
);

export default router;
