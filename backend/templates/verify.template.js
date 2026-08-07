import jwt from "jsonwebtoken"; 

export const verifyTemplate = (name, verificationLink) => {

    return `

        <h1>Hello ${name}</h1>

        <p>

            Please verify your email.

        </p>

        <a href="${verificationLink}">

            Verify Email

        </a>

    `;

};