import {
    userRegisterSchema,
    userLoginSchema
} from '../validation/userAuth.validation.js';
import bcrypt from 'bcrypt';
import pool from '../model/db.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import {
    generateRefreshToken,
    hashRefreshToken
} from "../utils/refreshTokens.utils.js";
import { generateVerificationToken, generateAccessToken } from '../utils/JWTtoken.utils.js';
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

// export const userAuthLoginController = async (request, response) => {
//     try {
//         const data = request.body;
//         const validationResult = userLoginSchema.safeParse(data);
//         if (!validationResult.success) {
//             return response.status(400).json({
//                 success: false,
//                 message: validationResult.error.issues
//             })
//         }

//         const { userEmail, userPassword } = data;

//         if (!userEmail || !userPassword) {
//             response.status(400).json({
//                 message: "Entered Email doesn't exists"
//             })
//         }

//         const dataBaseStoredUserData = await pool.query(
//             `
//                 SELECT * 
//                 FROM users
//                 WHERE email = $1; 
//             `, [userEmail]
//         );

//         const isPasswordMatch = await bcrypt.compare(userPassword, dataBaseStoredUserData.rows[0].password_hash)

//         if (!isPasswordMatch) {
//             return response.status(400).json({
//                 error: `Incorrect Password`
//             });
//         }
//         const dbUser = dataBaseStoredUserData.rows[0];
//         const token = generateVerificationToken(dbUser.id);
//         response.cookie("token", token, {
//             httpOnly: true,
//             maxAge: 1000000 * 60 * 60 * 24,
//             signed: true,
//         });
//         response.status(200).json({
//             user: {
//                 id: dbUser.id,
//                 userName: dbUser.username,
//                 userEmail: dbUser.email,
//             },
//         });
//     }
//     catch (error) {
//         response.status(400).json({
//             error: error
//         })
//     }
// }


export const userAuthLoginController = async (request, response) => {
    try {
        const data = request.body;
        const validationResult = userLoginSchema.safeParse(data);
        if (!validationResult.success) {
            return response.status(400).json({
                success: false,
                message: validationResult.error.issues
            });
        }

        const { userEmail, userPassword } = validationResult.data;
        if (!userEmail || !userPassword) {
            return response.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }
        const dataBaseStoredUserData = await pool.query(
            `
                SELECT *
                FROM users
                WHERE email = $1;
            `,
            [userEmail]
        );

        if (dataBaseStoredUserData.rows.length === 0) {
            return response.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }
        const dbUser = dataBaseStoredUserData.rows[0];
        const isPasswordMatch = await bcrypt.compare(
            userPassword,
            dbUser.password_hash
        );
        if (!isPasswordMatch) {
            return response.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // access token Geneartion: 
        const accessToken = generateAccessToken(dbUser.id);

        // refresh token generation: 
        const refreshToken = generateRefreshToken();
        const refreshTokenHash = hashRefreshToken(refreshToken);
        const expiresAt = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
        );

        await pool.query(
            `
                INSERT INTO auth_sessions ( user_id, token_hash, expires_at)
                VALUES ($1, $2, $3);
            `, [ dbUser.id, refreshTokenHash, expiresAt ]
        );

        response.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: "/"
        });


        return response.status(200).json({
            success: true,
            user: {
                id: dbUser.id,
                userName: dbUser.username,
                userEmail: dbUser.email
            },
            accessToken
        });
    }

    catch (error) {
        return response.status(400).json({
            error: error.message
        });
    }
};

export const userAuthRefreshController = async (request, response) => {
    const client = await pool.connect();
    try {
        const refreshToken = request.cookies.refreshToken;

        if (!refreshToken) {
            return response.status(401).json({
                success: false,
                message: "Refresh token not found"
            });
        }

        const refreshTokenHash = hashRefreshToken(refreshToken);
        await client.query("BEGIN");

        const sessionResult = await client.query(
            `
                SELECT *
                FROM auth_sessions
                WHERE token_hash = $1
                FOR UPDATE;
            `, [refreshTokenHash]
        );

        if (sessionResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return response.status(401).json({
                success: false,
                message: "Invalid refresh token"
            });
        }

        const session = sessionResult.rows[0];

        if (session.revoked_at !== null) {
            await client.query(
                `
                    UPDATE auth_sessions
                    SET revoked_at = CURRENT_TIMESTAMP
                    WHERE family_id = $1 AND revoked_at IS NULL;
                `, [session.family_id]
            );

            await client.query("COMMIT");

            response.clearCookie("refreshToken", {
                path: "/auth"
            });

            return response.status(401).json({
                success: false,
                message: "Refresh token reuse detected. Please login again."
            });
        }

        if (new Date(session.expires_at) <= new Date()) {
            await client.query(
                `
                    UPDATE auth_sessions
                    SET revoked_at = CURRENT_TIMESTAMP
                    WHERE id = $1;
                `, [session.id]
            );

            await client.query("COMMIT");

            response.clearCookie("refreshToken", {
                path: "/auth"
            });

            return response.status(401).json({
                success: false,
                message: "Refresh token expired. Please login again."
            });
        }

        const userResult = await client.query(
            `
                SELECT id, username, email
                FROM users
                WHERE id = $1;
            `, [session.user_id]
        );
        if (userResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return response.status(401).json({
                success: false,
                message: "User no longer exists"
            });
        }
        const user = userResult.rows[0];
        const accessToken = generateAccessToken(user.id);
        const newRefreshToken = generateRefreshToken();
        const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

        const newSessionResult = await client.query(
            `
                INSERT INTO auth_sessions ( user_id, token_hash, family_id, expires_at)
                VALUES ( $1, $2, $3, $4)
                RETURNING id;
            `, [ user.id, newRefreshTokenHash, session.family_id, new Date( Date.now() + 30 * 24 * 60 * 60 * 1000) ]
        );

        const newSessionId = newSessionResult.rows[0].id;
        await client.query(
            `
                UPDATE auth_sessions
                SET
                    revoked_at = CURRENT_TIMESTAMP,
                    last_used_at = CURRENT_TIMESTAMP,
                    replaced_by_session_id = $1
                WHERE id = $2;
            `, [ newSessionId, session.id ]
        );

        await client.query("COMMIT");
        response.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: "/"
        });

        return response.status(200).json({
            success: true,
            accessToken
        });
    }

    catch (error) {
        await client.query("ROLLBACK");

        console.error("Refresh token error:", error);

        return response.status(500).json({
            success: false,
            message: "Failed to refresh access token"
        });
    }

    finally {
        client.release();
    }
};

// export const userAuthLogoutController = (request, response) => {
//     response.clearCookie("token", {
//         path: "/"
//     });
//     response.status(200).json({ message: "Logged out successfully" });
// }

export const userAuthLogoutController = async (request, response) => {
    try {
        const refreshToken = request.cookies.refreshToken;
        if (!refreshToken) {
            return response.status(200).json({
                success: true,
                message: "Logged out successfully"
            });
        }

        const refreshTokenHash = hashRefreshToken(refreshToken);
        const result = await pool.query(
            `
                UPDATE auth_sessions
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE token_hash = $1
                  AND revoked_at IS NULL;
            `,
            [refreshTokenHash]
        );

        response.clearCookie("refreshToken", {
            path: "/auth"
        });

        return response.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    }

    catch (error) {
        return response.status(500).json({
            success: false,
            message: "Failed to logout"
        });
    }
};

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

