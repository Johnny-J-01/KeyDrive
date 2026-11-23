import crypto from "crypto";
import supabase from "../model/supabase.js";

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

        const { data: user, error } = await supabase
            .from("users")
            .select("id, username")
            .eq("id", userId)
            .maybeSingle();

        if (error || !user) {
            return response.status(401).json({
                success: false,
                message: "User not found",
            });
        }

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
