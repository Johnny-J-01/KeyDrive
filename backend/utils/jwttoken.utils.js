import jwt from "jsonwebtoken";

export const generateVerificationToken = (userId, expiresIn = '1h') => {
    return jwt.sign({ userId, }, process.env.JWT_SECRET, { expiresIn, });
}

export const generateResetToken = (userId) => {
    return jwt.sign({ userId, }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

export const generateAccessToken = (userId) => {
    return jwt.sign( { userId }, process.env.JWT_SECRET, { expiresIn: "15m" });
};