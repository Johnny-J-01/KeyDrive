import express from 'express'; 
import { 
    userRegisterSchema
} from '../validation/userAuth.validation.js'; 
import bcrypt from 'bcrypt'; 
import pool from '../model/db.js'; 
import dotenv from 'dotenv'; 
import jwt from 'jsonwebtoken'; 

dotenv.config(); 

export const userAuthRegisterController = async (request, response) => {
    try {
        const data = request.body; 
        const validationResult = userRegisterSchema.safeParse(data); 
        if (!validationResult.success) {
            return response.status(400).json({
                success: false, 
                message: validationResult.error.issues
            })
        }

        const userHashedPassword = await bcrypt.hash(validationResult.data.userPassword, 10); 
        const result = await pool.query(
            `
                INSERT INTO users (username, email, password_hash) 
                VALUES ($1, $2, $3); 
            `, [validationResult.data.userName, validationResult.data.userEmail, userHashedPassword]
        ); 

        console.log(result);
    }

    catch (error) {
        response.json({
            error: error
        })
    }
}

export const userAuthLoginController = (request, response) => {

}

export const userAuthLogoutController = (request, response) => {

}


export const userAuthDeleteController = (request, response) => {

}

