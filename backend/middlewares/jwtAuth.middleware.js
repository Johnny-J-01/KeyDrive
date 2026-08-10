import jwt from 'jsonwebtoken'; 
export const jwtAuthMiddleware = (request, response, next) => {
    try {
        const token = request.signedCookies.token; 
        if (!token) {
            return response.status(401).json({
                message: "Please Login", 
            }); 
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET); 
        request.user = decoded; 
        next(); 
    }
    catch (error) {
        response.status(400).json({
            message: error.message, 
        })
    }
}