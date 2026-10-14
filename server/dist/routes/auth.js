"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
exports.authRouter = (0, express_1.Router)();
// Current User Profile - Always returns المقدم / أسامة الجمل
exports.authRouter.get('/me', (req, res) => {
    return res.json({ user: auth_1.OFFICIAL_USER });
});
// Login (optional fallback, returns OFFICIAL_USER)
exports.authRouter.post('/login', (req, res) => {
    return res.json({
        success: true,
        token: 'tmc-authenticated-session',
        user: auth_1.OFFICIAL_USER,
    });
});
