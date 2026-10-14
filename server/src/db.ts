import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Configure SQLite WAL mode for high concurrency
prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
  .catch((err: any) => console.warn('Could not enable WAL mode:', err.message));

prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;')
  .catch((err: any) => console.warn('Could not set PRAGMA synchronous:', err.message));
