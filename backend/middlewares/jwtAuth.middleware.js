import jwt from "jsonwebtoken";

export const jwtAuthMiddleware = (request, response, next) => {
	try {
		const authHeader = request.headers.authorization;

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return response.status(401).json({
				success: false,
				message: "Please Login",
			});
		}

		const accessToken = authHeader.split(" ")[1];

		const decoded = jwt.verify(
			accessToken,
			process.env.JWT_SECRET
		);

		if (decoded.purpose !== "access") {
			return response.status(401).json({
				success: false,
				message: "Invalid token type",
			});
		}

		request.user = decoded;

		next();
	} catch (error) {
		return response.status(401).json({
			success: false,
			message: "Invalid or expired access token",
		});
	}
};
