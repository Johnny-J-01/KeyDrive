import crypto from "crypto";
import pool from "../model/db.js";

const tickets = new Map();

const TICKET_TTL_MS = 30_000;
const CLEANUP_INTERVAL_MS = 60_000;

setInterval(() => {
    const now = Date.now();
    for (const [ticket, data] of tickets) {
        if (data.expiresAt <= now) {
            tickets.delete(ticket);
        }
    }
}, CLEANUP_INTERVAL_MS);

export const issueWsTicketController = async (request, response) => {
    try {
        const userId = request.user?.userId;
        if (!userId) {
            return response.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const result = await pool.query(
            `SELECT id, username FROM users WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return response.status(401).json({
                success: false,
                message: "User not found",
            });
        }

        const user = result.rows[0];
        const ticket = crypto.randomBytes(32).toString("hex");

        tickets.set(ticket, {
            userId: user.id,
            username: user.username,
            expiresAt: Date.now() + TICKET_TTL_MS,
        });

        return response.status(200).json({
            success: true,
            ticket,
        });
    } catch (error) {
        return response.status(500).json({
            success: false,
            message: "Failed to issue WebSocket ticket",
        });
    }
};

export function validateAndConsumeTicket(ticket) {
    if (!ticket || typeof ticket !== "string") {
        return null;
    }

    const data = tickets.get(ticket);
    if (!data) {
        return null;
    }

    tickets.delete(ticket);
    if (data.expiresAt <= Date.now()) {
        return null;
    }

    return {
        userId: data.userId,
        username: data.username,
    };
}
