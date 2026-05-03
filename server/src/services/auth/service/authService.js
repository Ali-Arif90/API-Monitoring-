import config from "../../../shared/config/index.js";
import AppError from "../../../shared/utils/AppError.js";
import jwt from "jsonwebtoken";
import logger from "../../../shared/config/logger.js";
import bcrypt from "bcryptjs";
import { APPLICATION_ROLES } from "../../../shared/constants/roles.js";
import Client from "../../../shared/models/Client.js";
import User from "../../../shared/models/User.js";

export class AuthService {
    constructor(userRepository) {
        if (!userRepository) throw new Error("UserRepository is Required");
        this.userRepository = userRepository;
    }

    generateToken(user) {
        const { _id, email, username, role, clientId } = user;
        return jwt.sign(
            { userId: _id, username, email, role, clientId },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );
    }

    formatUserForResponse(user) {
        const userObj = user.toObject ? user.toObject() : { ...user };
        delete userObj.password;
        return userObj;
    }

    async comparePassword(plain, hashed) {
        return bcrypt.compare(plain, hashed);
    }

    _buildSlug(name) {
        const base = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 40);
        const suffix = Math.random().toString(36).slice(2, 6);
        return `${base}-${suffix}`;
    }

    async onboardSuperAdmin(superAdminData) {
        try {
            const existing = await this.userRepository.findAll();
            if (existing && existing.length > 0) {
                throw new AppError("Super admin onboarding is disabled", 403);
            }
            const user = await this.userRepository.create(superAdminData);
            const token = this.generateToken(user);
            logger.info("Admin onboarded", { username: user.username });
            return { user: this.formatUserForResponse(user), token };
        } catch (error) {
            logger.error("Error onboarding super admin", error);
            throw error;
        }
    }

    /**
     * Self-registration — works with the original User schema unchanged.
     *
     * The schema has a chicken-and-egg problem:
     *   User.clientId required when role !== "super_admin"
     *   Client.createdBy required (needs a real User._id)
     *
     * Solution — 4 steps, all safe:
     *   1. Save User as "super_admin" so clientId is NOT required by the schema
     *   2. Save Client with the real user._id as createdBy
     *   3. Patch user using MongoDB's native driver ($set role + clientId together)
     *      — bypasses Mongoose validation so the schema required() is never re-run
     *   4. Issue JWT with the correct clientId
     */
    async register(userData) {
        let savedUser  = null;
        let savedClient = null;

        try {
            const derivedUsername = userData.username
                ? userData.username
                : this._buildSlug(userData.name || userData.username || '');
            if (!derivedUsername) throw new AppError("Name is required", 400);

            // Duplicate checks
            const existingUser = await this.userRepository.findByUsername(derivedUsername);
            if (existingUser) throw new AppError("Username already taken", 409);

            const existingEmail = await this.userRepository.findByEmail(userData.email);
            if (existingEmail) throw new AppError("Email already registered", 409);

            const desiredRole  = userData.role || APPLICATION_ROLES.CLIENT_VIEWER;
            const permissions  = desiredRole === APPLICATION_ROLES.CLIENT_ADMIN
                ? { canCreateApiKeys: true,  canManageUsers: true,  canViewAnalytics: true, canExportData: true  }
                : { canCreateApiKeys: true,  canManageUsers: false, canViewAnalytics: true, canExportData: false };

            // ── Step 1: Save user as super_admin (skips clientId required check) ──
            savedUser = await this.userRepository.create({
                username: derivedUsername,
                email:       userData.email,
                password:    userData.password,
                role:        "super_admin",   // temporary — overwritten in step 3
                permissions,
                // No clientId here — super_admin doesn't need it per schema
            });

            // ── Step 2: Save Client with the real user._id ─────────────────────
            savedClient = await Client.create({
                name:      userData.name || derivedUsername,
                slug:      this._buildSlug(userData.name || derivedUsername),
                email:     userData.email,
                createdBy: savedUser._id,     // real user _id — no temp placeholder
                isActive:  true,
            });

            // ── Step 3: Patch user with native driver — bypasses Mongoose required() ──
            // Using collection.updateOne goes directly to MongoDB and does NOT
            // run Mongoose schema validators, so the required() function on
            // clientId is never evaluated during this update.
            await User.collection.updateOne(
                { _id: savedUser._id },
                { $set: { role: desiredRole, clientId: savedClient._id } }
            );

            // Update the in-memory object so the JWT carries the right values
            savedUser.role     = desiredRole;
            savedUser.clientId = savedClient._id;

            const token = this.generateToken(savedUser);
            logger.info("User registered", {
                username:  savedUser.username,
                clientId:  savedClient._id,
                role:      desiredRole,
            });

            return { user: this.formatUserForResponse(savedUser), token };

        } catch (error) {
            // ── Rollback: clean up any partially created documents ─────────────
            if (savedUser?._id)    await User.deleteOne({ _id: savedUser._id }).catch(() => {});
            if (savedClient?._id)  await Client.deleteOne({ _id: savedClient._id }).catch(() => {});
            logger.error("Error in register — rolled back", { error: error.message });
            throw error;
        }
    }

    /**
     * Login — accepts email OR username as the identifier.
     */
    async login(identifier, password) {
        try {
            let user = await this.userRepository.findByUsername(identifier);
            if (!user) user = await this.userRepository.findByEmail(identifier);

            if (!user)           throw new AppError("Invalid credentials", 401);
            if (!user.isActive)  throw new AppError("Account is deactivated", 403);

            const valid = await this.comparePassword(password, user.password);
            if (!valid) throw new AppError("Invalid credentials", 401);

            const token = this.generateToken(user);
            logger.info("User logged in", { username: user.username });
            return { user: this.formatUserForResponse(user), token };
        } catch (error) {
            logger.error("Error in login service", error);
            throw error;
        }
    }

    async getProfile(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) throw new AppError("User not found", 404);
            return this.formatUserForResponse(user);
        } catch (error) {
            logger.error("Error getting profile:", error);
            throw error;
        }
    }

    async checkSuperAdminPermissions(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) throw new AppError("User not found", 404);
            return user.role === APPLICATION_ROLES.SUPER_ADMIN;
        } catch (error) {
            logger.error("Error checking super admin permissions:", error);
            throw error;
        }
    }
}