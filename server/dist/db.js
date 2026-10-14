"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
exports.prisma = new client_1.PrismaClient();
// Configure SQLite WAL mode for high concurrency
exports.prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
    .catch((err) => console.warn('Could not enable WAL mode:', err.message));
exports.prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;')
    .catch((err) => console.warn('Could not set PRAGMA synchronous:', err.message));
