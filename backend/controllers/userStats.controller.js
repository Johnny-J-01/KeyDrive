import express, { response } from 'express';
import dotenv from 'dotenv';
import pool from '../model/db.js';
import jwt from 'jsonwebtoken';

dotenv.config();

export const userProfileController = async (request, response) => {
    try {
        const userPersonalData = await pool.query(
            `
                SELECT * 
                FROM users 
                WHERE id = $1
            `, [request.user.userId]
        )
        console.log(userPersonalData);
        response.status(200).json({
            data: userPersonalData
        })
    }
    catch (error) {
        response.status(400).json({
            error: error
        })
    }
}

export const userStatsPostController = async (request, response) => {
    try {
        const data = request.body;

        if (!request.user || !request.user.userId) {
            return response.status(401).json({
                success: false,
                message: "Please login to save your results."
            });
        }

        if (data.user_id === "guest") {
            return response.status(401).json({
                success: false,
                message: "Guest account cannot save results. Please login first."
            });
        }

        const result = await pool.query(
            `
                INSERT INTO practice_history (user_id, mode, word_count, duration_seconds, wpm, accuracy, errors, started_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *; 
            `, [request.user.userId, data.mode, data.word_count, data.duration_seconds, data.wpm, data.accuracy, data.errors, data.started_at]
        );

        response.status(201).json({
            message: "Data updated in the database successfully!!",
            data: result.rows[0]
        })
    }
    catch (error) {
        console.error("DATABASE ERROR:", error);
        response.status(400).json({
            error: error.message
        })
    }
}

export const userStatsGetController = async (request, response) => {
    try {
        const userId = request.user?.userId;

        if (!userId) {
            return response.status(401).json({
                success: false,
                message: "Please login to view your stats."
            });
        }

        const result = await pool.query(
            `
                SELECT 
                    ROUND(AVG(wpm), 2) as avg_wpm,
                    ROUND(AVG(accuracy), 2) as avg_accuracy,
                    COUNT(*) as total_sessions
                FROM practice_history
                WHERE user_id = $1;
            `,
            [userId]
        );

        const avgWpm = result.rows[0]?.avg_wpm ?? 0;
        const avgAcc = result.rows[0]?.avg_accuracy ?? 0;

        const statData = {
            AVG_WPM: avgWpm,
            AVG_Acc: avgAcc,
            total_sessions: result.rows[0]?.total_sessions ?? 0,
        };

        return response.status(200).json({
            message: "User stats fetched successfully",
            data: statData
        });
    }
    catch (error) {
        console.error("DATABASE ERROR:", error);
        return response.status(400).json({
            error: error.message
        })
    }
}

export const allUserDataController = async (request, response) => {
    try {
        const filter = request.query.filter || "All Time";

        if (filter !== "All Time") {
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return response.status(401).json({
                    success: false,
                    message: "Please login to view this leaderboard period."
                });
            }

            const accessToken = authHeader.split(" ")[1];
            try {
                jwt.verify(accessToken, process.env.JWT_SECRET);
            } catch (error) {
                return response.status(401).json({
                    success: false,
                    message: "Please login to view this leaderboard period."
                });
            }
        }

        let dateCondition = "";
        switch (filter) {
            case "Daily":
                dateCondition = `
                    AND practice_history.started_at >= CURRENT_DATE
                `;
                break;

            case "Weekly":
                dateCondition = `
                    AND practice_history.started_at >= DATE_TRUNC('week', CURRENT_DATE)
                `;
                break;

            case "Monthly":
                dateCondition = `
                    AND practice_history.started_at >= DATE_TRUNC('month', CURRENT_DATE)
                `;
                break;

            case "All Time":
                dateCondition = "";
                break;

            default:
                return response.status(400).json({
                    message: "Invalid leaderboard filter",
                });
        }

        const result = await pool.query(
            `
                SELECT *
                FROM (
                    SELECT DISTINCT ON (users.id)
                        users.id,
                        users.username,
                        users.avatar_url,
                        practice_history.wpm AS max_wpm,
                        practice_history.accuracy
                    FROM users
                    JOIN practice_history
                        ON users.id = practice_history.user_id
                    WHERE 1 = 1
                    ${dateCondition}
                    ORDER BY
                        users.id,
                        practice_history.wpm DESC
                ) AS leaderboard
                ORDER BY max_wpm DESC;
            `
        );

        if (!result) {
            return response.status(400).json({
                message: "Failed to Fetch Data"
            });
        }

        return response.status(200).json({
            message: "Data successfully fetched",
            data: result.rows
        });
    }
    catch (error) {
        console.error(error); 
        return response.status(400).json({
            error: error
        });
    }
}