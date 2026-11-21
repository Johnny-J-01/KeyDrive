import express from "express";
import { issueWsTicketController } from "../controllers/wsTicket.controller.js";
import { jwtAuthMiddleware } from "../middlewares/jwtAuth.middleware.js";

const router = express.Router();

router.post("/ws/ticket", jwtAuthMiddleware, issueWsTicketController);

export default router;
