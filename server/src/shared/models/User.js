import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import SecurityUtils from "../utils/SecurityUtils.js";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        validate: {
            validator: function (userName) {
                return /^[a-zA-Z0-9_.-]+$/.test(userName);
            },
            message: "Please enter a valid username"
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function (email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: "Please enter a valid email"
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        validate: {
            validator: function (password) {
                if (this.isModified('password') && password && !password.startsWith('$2a$')) {
                    const validation = SecurityUtils.validatePassword(password);
                    return validation.success;
                }
                return true;
            },
            message: function (props) {
                if (props.value && !props.value.startsWith('$2a$')) {
                    const validation = SecurityUtils.validatePassword(props.value);
                    return validation.errors.join(". ");
                }
                return "Password validation failed";
            }
        },
    },
    role: {
        type: String,
        enum: ['super_admin', 'client_admin', 'client_viewer'],
        default: 'client_viewer'
    },
    // ── FIX: required removed from schema level ────────────────────────────
    // The original conditional required() caused a chicken-and-egg deadlock:
    // User needs clientId (Client._id) but Client needs createdBy (User._id).
    // Enforcement is now done in authService.register() instead.
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        default: null,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    permissions: {
        canCreateApiKeys: { type: Boolean, default: false },
        canManageUsers:   { type: Boolean, default: false },
        canViewAnalytics: { type: Boolean, default: true  },
        canExportData:    { type: Boolean, default: false },
    },
}, {
    timestamps: true,
    collection: "users"
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Ensure clientId is not required for validation
    if (this.role === 'super_admin' && this.clientId === undefined) {
        this.clientId = null;
    }
    
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.index({ clientId: 1, isActive: 1 });
userSchema.index({ role: 1 });

// Clear any existing model to ensure schema changes take effect
if (mongoose.models.User) {
    delete mongoose.models.User;
}
if (mongoose.modelSchemas && mongoose.modelSchemas.User) {
    delete mongoose.modelSchemas.User;
}

const User = mongoose.model("User", userSchema);
export default User;