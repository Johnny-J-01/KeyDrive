import jwt, { decode } from "jsonwebtoken";
import dotenv from 'dotenv'; 

dotenv.config(); 

export const emailVerificationController = async (request, response) => {
    try {
        const { token } = request.params; 
        const decoded = jwt.verify(token, process.env.JWT_SECRET); 
        console.log(decoded);

        if (!user) {
            return response.status(400).json({
                message: "User not found!"
            })
        }

        console.log(user);
        if (user.is_verified) {
            return response.status(400).json({
                message: "Email already Verified", 
            }); 
        }

        // const verifiedUser = await userModel.findByIdAndUpdate({_id : decoded.userId}, {isVerified: true,}, {returnDocument: "after"}); 
        const verifiedUser = await updateUserVerification(decoded.userId); 
        console.log("veid: ", verifiedUser); 
        response.status(200).json({
            message: "Registration successfull. Please check your email"
        })
    }
    catch(error) {
        response.status(401).json({
            message: error.message, 
        })
    }
}