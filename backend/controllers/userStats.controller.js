import express from 'express';
import dotenv from 'dotenv';
import supabase from '../model/supabase.js';
import jwt from 'jsonwebtoken';

dotenv.config();

export const userProfileController = async (request, response) => {
    try {
        const { data: rows, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', request.user.userId);

        if (error) {
            return response.status(400).json({
                error: error.message
            });
        }

        console.log(rows);
        response.status(200).json({
            data: { rows: rows || [] }
        });
    }
    catch (error) {
        response.status(400).json({
            error: error
        });
    }
};

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

        const { data: insertedData, error } = await supabase
            .from('practice_history')
            .insert({
                user_id: request.user.userId,
                mode: data.mode,
                word_count: data.word_count,
                duration_seconds: data.duration_seconds,
                wpm: data.wpm,
                accuracy: data.accuracy,
                errors: data.errors,
                started_at: data.started_at
            })
            .select()
            .single();

        if (error) {
            console.error("DATABASE ERROR:", error);
            return response.status(400).json({
                error: error.message
            });
        }

        response.status(201).json({
            message: "Data updated in the database successfully!!",
            data: insertedData
        });
    }
    catch (error) {
        console.error("DATABASE ERROR:", error);
        response.status(400).json({
            error: error.message
        });
    }
};

export const userStatsGetController = async (request, response) => {
    try {
        const userId = request.user?.userId;

        if (!userId) {
            return response.status(401).json({
                success: false,
                message: "Please login to view your stats."
            });
        }

        const { data: practiceStats, error: practiceError } = await supabase
            .rpc('get_user_practice_stats', { p_user_id: userId });

        if (practiceError) {
            console.error("DATABASE ERROR:", practiceError);
            return response.status(400).json({
                error: practiceError.message
            });
        }

        const avgWpm = practiceStats?.[0]?.avg_wpm ?? 0;
        const avgAcc = practiceStats?.[0]?.avg_accuracy ?? 0;
        const totalSessions = practiceStats?.[0]?.total_sessions ?? 0;

        const { data: statsData, error: statsError } = await supabase
            .from('user_stats')
            .select('races_won, total_races')
            .eq('user_id', userId)
            .maybeSingle();

        if (statsError) {
            console.error("DATABASE ERROR:", statsError);
            return response.status(400).json({
                error: statsError.message
            });
        }

        const racesWon = statsData?.races_won ?? 0;
        const totalRaces = statsData?.total_races ?? 0;

        const statData = {
            AVG_WPM: avgWpm,
            AVG_Acc: avgAcc,
            total_sessions: Number(totalSessions),
            racesWon: Number(racesWon),
            races_won: Number(racesWon),
            totalRaces: Number(totalRaces),
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
        });
    }
};

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
                const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
                if (decoded.purpose !== "access") {
                    return response.status(401).json({
                        success: false,
                        message: "Invalid token type",
                    });
                }
            } catch (error) {
                return response.status(401).json({
                    success: false,
                    message: "Please login to view this leaderboard period."
                });
            }
        }

        if (!["Daily", "Weekly", "Monthly", "All Time"].includes(filter)) {
            return response.status(400).json({
                message: "Invalid leaderboard filter",
            });
        }

        const { data: rows, error } = await supabase
            .rpc('get_leaderboard', { p_filter: filter });

        if (error) {
            console.error(error);
            return response.status(400).json({
                message: "Failed to Fetch Data"
            });
        }

        return response.status(200).json({
            message: "Data successfully fetched",
            data: rows || []
        });
    }
    catch (error) {
        console.error(error); 
        return response.status(400).json({
            error: error
        });
    }
};

export const userPerformanceHistoryController = async (request, response) => {
    try {
        const userId = request.user?.userId;

        if (!userId) {
            return response.status(401).json({
                success: false,
                message: "Please login to view performance history."
            });
        }

        const { data: rows, error } = await supabase
            .rpc('get_user_performance_history', { p_user_id: userId });

        if (error) {
            console.error("DATABASE ERROR:", error);
            return response.status(400).json({
                error: error.message
            });
        }

        const formatted = (rows || []).map((row) => ({
            wpm: Number(row.wpm),
            accuracy: Number(row.accuracy),
            timestamp: row.timestamp,
            date: row.timestamp,
            type: row.type,
            placement: row.placement ? Number(row.placement) : null,
        }));

        return response.status(200).json({
            message: "Performance history fetched successfully",
            data: formatted,
        });
    }
    catch (error) {
        console.error("DATABASE ERROR:", error);
        return response.status(400).json({
            error: error.message
        });
    }
};
