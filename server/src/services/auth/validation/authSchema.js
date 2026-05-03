import { isValidRole } from "../../../shared/constants/roles.js";

export const onboardSuperAdminSchema = {
    email:    { required: true },
    password: { required: true, minLength: 6 },
};

/**
 * Public self-registration schema.
 * Accepts { name, email, password } from the dashboard frontend
 * OR { username, email, password } from direct API usage.
 */
export const registrationSchema = {
    email:    { required: true },
    password: { required: true, minLength: 8 },
    // username or name must be present — checked by custom validator
    name: {
        required: false,
        custom: (value, body) => {
            if (!value && !body.username) return 'username or name is required';
            return null;
        },
    },
    role: {
        required: false,
        custom: (value) => {
            if (!value) return null;
            return isValidRole(value) ? null : 'Invalid role';
        },
    },
};

/**
 * Login schema — accepts { email, password } or { username, password }.
 * The `password` field is always required.
 * At least one of email/username must be present.
 */
export const loginSchema = {
    password: { required: true },
    email: {
        required: false,
        custom: (value, body) => {
            if (!value && !body.username) return 'email or username is required';
            return null;
        },
    },
};
