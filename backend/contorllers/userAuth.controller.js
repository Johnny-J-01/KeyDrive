import express from 'express';
import {
    userRegisterSchema
} from '../validation/userAuth.validation.js';
import bcrypt from 'bcrypt';
import pool from '../model/db.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { generateVerificationToken } from '../utils/JWTtoken.utils.js';
import { verifyTemplate } from '../templates/verify.template.js';
import { sendEmail } from '../services/mail.services.js';

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
                VALUES ($1, $2, $3)
                RETURNING *; 
            `, [validationResult.data.userName, validationResult.data.userEmail, userHashedPassword]
        );

        const userId = result.rows[0].id;
        const verificationToken = generateVerificationToken(userId);
        console.log(verificationToken);
        const verificationLink = `http://localhost:5173/verify-email?token=${verificationToken}`;
        console.log("verificationLink: ", verificationLink);
        try {
            await sendEmail({
                to: validationResult.data.userEmail,
                subject: "Verify your email",
                html: verifyTemplate(
                    validationResult.data.userName,
                    verificationLink
                ),
            });
            response.status(200).json({ ...data });
        }
        catch (error) {
            console.log(`Failed to send the verification email: `, error.message);
        }
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

