import express from 'express';
import {
    userRegisterSchema,
    userLoginSchema
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
        // console.log(verificationToken);
        const verificationLink = `http://localhost:5173/verify-email?token=${verificationToken}`;
        // console.log("verificationLink: ", verificationLink);
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
        response.status(400).json({
            error: error
        })
    }
}

export const userAuthProfileController = async (request, response) => {
    try {
        const data = request.body;
        const validationResult = userRegisterSchema.safeParse({userName: data.username, userEmail: data.email, userPassword: data.password});
        if (!validationResult.success) {
            return response.status(400).json({
                success: false,
                message: validationResult.error.issues
            })
        }

        const userHashedPassword = await bcrypt.hash(data.password, 10);
        const result = await pool.query(
            `
                UPDATE users 
                SET 
                    username = $1,
                    email = $2,
                    password_hash = $3 
                WHERE id = $4
                RETURNING *; 
            `, [data.username, data.email, userHashedPassword, data.id]
        );

        response.status(200).json({
            message: "Successfully updated the data into the database"
        });
    }
    catch (error) {
        response.status(400).json({
            error: error
        })
    }
}

export const userAuthLoginController = async (request, response) => {
    try {
        const data = request.body;
        const validationResult = userLoginSchema.safeParse(data);
        if (!validationResult.success) {
            return response.status(400).json({
                success: false,
                message: validationResult.error.issues
            })
        }

        const { userEmail, userPassword } = data;

        if (!userEmail || !userPassword) {
            response.status(400).json({
                message: "Entered Email doesn't exists"
            })
        }

        const dataBaseStoredUserData = await pool.query(
            `
                SELECT * 
                FROM users
                WHERE email = $1; 
            `, [userEmail]
        );

        const isPasswordMatch = await bcrypt.compare(userPassword, dataBaseStoredUserData.rows[0].password_hash)

        if (!isPasswordMatch) {
            return response.status(400).json({
                error: `Incorrect Password`
            });
        }
        const dbUser = dataBaseStoredUserData.rows[0];
        const token = generateVerificationToken(dbUser.id);
        console.log(token);
        // response.cookie(, )
        response.cookie("token", token, {
            httpOnly: true,
            maxAge: 1000000 * 60 * 60 * 24,
            signed: true,
        });
        response.status(200).json({
            user: {
                id: dbUser.id,
                userName: dbUser.username,
                userEmail: dbUser.email,
            },
        });
    }
    catch (error) {
        response.status(400).json({
            error: error
        })
    }
}

export const userAuthLogoutController = (request, response) => {
    response.clearCookie("token", {
        path: "/"
    });
    response.status(200).json({ message: "Logged out successfully" });
}

export const userAuthDeleteController = async (request, response) => {
    try {
        const token = jwt.verify(request.signedCookies.token, process.env.JWT_SECRET); 
        if (!token) {
            response.status(400).json({
                message: "Login to your account, to proceed with the deletion of the account"
            })
        }
        const userId = token.userId; 

        const result = await pool.query(
            `
                DELETE FROM users 
                WHERE id = $1 
            `, [userId]
        ); 


        if (!result) {
            response.status(400).json({
                success: false,  
                message: "user not found"
            })
        }

        response.status(200).json({
            success: true,
            message: "deleted Successfully"
        })
    }
    catch (error) {
        response.status(400).json({
            error: error.message
        }); 
    }
}

