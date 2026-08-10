import express from 'express'; 
import dotenv from 'dotenv'; 
import pool from '../model/db.js'; 

dotenv.config(); 

export const userProfileController = async (request, response) => {
    try {
        console.log("req: \n", request.cookies);
        // const userPersonalData = await pool.query(
        //     `
        //         SELECT * 
        //         FROM users 
        //         WHERE  
        //     `
        // ) 
        response.json({
            message: "testing"
        })
    } 
    catch (error) {
        response.status(400).json({
            error: error
        })
    }
}