import config from "../../../shared/config/index.js";
import { APPLICATION_ROLES } from "../../../shared/constants/roles.js";
import ResponseFormatter from "../../../shared/utils/responseFormatter.js"

export class AuthController {
    constructor(authService) {
        if (!authService) throw new Error("authService is Required");
        this.authService = authService;
    }

    _setCookie(res, token) {
        res.cookie("authToken", token, {
            httpOnly: config.cookie.httpOnly,
            secure: config.cookie.secure,
            sameSite: config.cookie.secure ? 'none' : 'lax',
            maxAge: config.cookie.expiresIn,
        });
    }

    async onboardSuperAdmin(req, res, next) {
        try {
            const { username, email, password } = req.body;
            const { token, user } = await this.authService.onboardSuperAdmin({
                username, email, password, role: APPLICATION_ROLES.SUPER_ADMIN
            });
            this._setCookie(res, token);
            res.status(201).json(ResponseFormatter.success({ user, token }, "Super admin created successfully", 201));
        } catch (error) { next(error); }
    }

    async register(req, res, next) {
        try {
            const { username, name, email, password, role } = req.body;
            const { token, user } = await this.authService.register({
                // Keep username optional; service will derive a valid slug from `name` when missing.
                username,
                name,
                email,
                password,
                role: role || APPLICATION_ROLES.CLIENT_VIEWER,
            });
            this._setCookie(res, token);
            // Return token in body so SPA can store it in Zustand
            res.status(201).json(ResponseFormatter.success({ user, token }, "User created successfully", 201));
        } catch (error) { next(error); }
    }

    async login(req, res, next) {
        try {
            // Accept { email } or { username } as the identifier
            const identifier = req.body.username || req.body.email;
            const { password } = req.body;
            const { user, token } = await this.authService.login(identifier, password);
            this._setCookie(res, token);
            // Return token in body so SPA can store it in Zustand
            res.status(200).json(ResponseFormatter.success({ user, token }, "User logged in successfully", 200));
        } catch (error) { next(error); }
    }

    async getProfile(req, res, next) {
        try {
            const result = await this.authService.getProfile(req.user.userId);
            res.status(200).json(ResponseFormatter.success(result, "Profile fetched successfully", 200));
        } catch (error) { next(error); }
    }

    async logout(req, res, next) {
        try {
            res.clearCookie("authToken");
            res.status(200).json(ResponseFormatter.success({}, "Logout successful", 200));
        } catch (error) { next(error); }
    }
}
