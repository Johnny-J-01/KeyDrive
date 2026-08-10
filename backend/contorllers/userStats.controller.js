import express from 'express'; 
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