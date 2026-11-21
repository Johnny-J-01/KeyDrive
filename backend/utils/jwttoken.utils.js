import jwt from "jsonwebtoken";

export const generateVerificationToken = (userId, expiresIn = '1h') => {
    return jwt.sign({ userId, purpose: "email_verification" }, process.env.JWT_SECRET, { expiresIn, });
}

export const generateResetToken = (userId) => {
    return jwt.sign({ userId, purpose: "password_reset" }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

export const generateAccessToken = (userId) => {
    return jwt.sign( { userId, purpose: "access" }, process.env.JWT_SECRET, { expiresIn: "15m" });
};
