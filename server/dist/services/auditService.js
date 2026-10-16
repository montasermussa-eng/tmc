"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
const db_1 = require("../db");
async function logAudit(params) {
    try {
        return await db_1.prisma.auditLog.create({
            data: {
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                details: params.details,
                userId: params.userId,
                userName: params.userName || 'مستخدم النظام',
                userRole: params.userRole,
                ipAddress: params.ipAddress || '127.0.0.1',
            },
        });
    }
    catch (error) {
        console.error('Audit log creation failed:', error);
    }
}
