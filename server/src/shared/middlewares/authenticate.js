import config from "../config/index.js";
import ResponseFormatter from "../utils/responseFormatter.js";
import jwt from "jsonwebtoken";
import logger from "../config/logger.js"

/**
 * Middleware to authenticate requests using JWT.
 * Accepts token from:
 *   1. httpOnly cookie: authToken  (browser sessions)
 *   2. Authorization: Bearer <token> header  (API / dashboard SPA)
 */
const authenticate = async (req, res, next) => {
    try {
        let token = null;

        // 1. Try cookie first (set by login/register endpoints)
        if (req.cookies && req.cookies.authToken) {
            token = req.cookies.authToken;
        }

        // 2. Fall back to Authorization: Bearer header (dashboard SPA / API clients)
        if (!token) {
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.slice(7).trim();
            }
        }

        if (!token) {
            return res.status(401).json(ResponseFormatter.error("Authentication token is required", 401));
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        const { userId, email, username, role, clientId } = decoded;

        req.user = { userId, email, username, role, clientId };
        next();
    } catch (error) {
        logger.error("Authentication failed", { error: error.message, path: req.path });

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json(ResponseFormatter.error('Token expired', 401));
        }
        return res.status(401).json(ResponseFormatter.error('Invalid token', 401));
    }
};

export default authenticate;
