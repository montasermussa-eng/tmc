"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OFFICIAL_USER = void 0;
exports.generateToken = generateToken;
exports.authenticate = authenticate;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'tmc-military-tech-college-secret-key-2026';
// Single official system user: المقدم / أسامة الجمل
exports.OFFICIAL_USER = {
    id: 'osama-elgamal',
    username: 'osama_elgamal',
    fullName: 'المقدم / أسامة الجمل',
    role: 'ADMIN',
    militaryNumber: 'M-10001',
};
function generateToken(user) {
    return jsonwebtoken_1.default.sign(user, JWT_SECRET, { expiresIn: '365d' });
}
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            req.user = decoded;
            return next();
        }
        catch (err) {
            // fallback to official user
        }
    }
    // Default automatic authentication as المقدم / أسامة الجمل (No login needed)
    req.user = exports.OFFICIAL_USER;
    next();
}
function requireRole(allowedRoles) {
    return (req, res, next) => {
        // Single admin user has all permissions
        if (!req.user) {
            req.user = exports.OFFICIAL_USER;
        }
        next();
    };
}
