import { transporter } from "../config/mail.js"; 
import dotenv from 'dotenv'; 

dotenv.config(); 

export const sendEmail = async ({to, subject, html }) => {
    await transporter.sendMail({
        from: process.env.MAIL_FROM, 
        to, 
        subject, 
        html,
    }); 
}; 

console.log(process.env.MAIL_HOST);
console.log(process.env.MAIL_PORT);