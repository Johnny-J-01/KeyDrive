import express, { response } from 'express'; 
import dotenv from 'dotenv'; 
import pool from '../model/db.js'; 

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
        console.log(data);
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
            error: error.messadg
        })
    }
} 

export const userStatsGetController = async (request, response) => {
    try {
        const result = await pool.query(
            `
                SELECT ROUND(AVG(wpm), 2) as AVG_WPM,
                ROUND(AVG(accuracy), 2) as AVG_accuracy
                FROM practice_history; 
            `
        ) 
        const AVG_WPM = result.rows[0].avg_wpm; 
        const AVG_Acc = result.rows[0].avg_accuracy; 

        const statData = {
            AVG_WPM, 
            AVG_Acc,
        }

        response.status(201).json({
            message: "Data updated in the database successfully!!", 
            data: statData 
        }); 
    }
    catch (error) {
        console.error("DATABASE ERROR:", error);
        response.status(400).json({
            error: error.messadg
        })
    }
} 