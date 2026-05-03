import express from "express";
import rateLimit from "express-rate-limit";
import dependencies from "../Dependencies/dependencies.js";
import authorize from "../../../shared/middlewares/authorize.js";
import authenticate from "../../../shared/middlewares/authenticate.js";
import validate from "../../../shared/middlewares/validate.js";
import requestLogger from "../../../shared/middlewares/requestLogger.js";
import {
    onboardSuperAdminSchema,
    loginSchema,
    registrationSchema,
} from "../validation/authSchema.js";
import { APPLICATION_ROLES } from "../../../shared/constants/roles.js";

const router = express.Router();
const authController = dependencies.controller.authController;

// Rate limiter — strict on auth endpoints to slow brute-force attacks
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,                   // 20 attempts per IP per window
    message: { success: false, message: "Too many attempts, please try again in 15 minutes.", statusCode: 429 },
    standardHeaders: true,
    legacyHeaders: false,
});

// One-time super-admin bootstrap (disabled once any user exists)
router.post(
    "/onboard-super-admin",
    requestLogger,
    authLimiter,
    validate(onboardSuperAdminSchema),
    (req, res, next) => authController.onboardSuperAdmin(req, res, next)
);

// Public self-registration — anyone can create a CLIENT_VIEWER account
router.post(
    "/register",
    requestLogger,
    authLimiter,
    validate(registrationSchema),
    (req, res, next) => authController.register(req, res, next)
);

// Admin-only registration (can assign any role)
router.post(
    "/admin/register",
    requestLogger,
    authenticate,
    authorize([APPLICATION_ROLES.SUPER_ADMIN]),
    validate(registrationSchema),
    (req, res, next) => authController.register(req, res, next)
);

router.post(
    "/login",
    requestLogger,
    authLimiter,
    validate(loginSchema),
    (req, res, next) => authController.login(req, res, next)
);

router.get(
    "/profile",
    requestLogger,
    authenticate,
    (req, res, next) => authController.getProfile(req, res, next)
);

router.post(
    "/logout",
    requestLogger,
    (req, res, next) => authController.logout(req, res, next)
);

// Legacy GET logout kept for backward compat
router.get("/logout", requestLogger, (req, res, next) => authController.logout(req, res, next));

export default router;
