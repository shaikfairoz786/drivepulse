import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'automotive-lms-jwt-secret-key-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
};

export const MATCH_WEIGHTS = {
  PASSENGER: {
    BRAND: 25,
    MODEL: 25,
    BUDGET: 20,
    FUEL: 10,
    YEAR: 10,
    TRANSMISSION_KM: 10,
  },
  COMMERCIAL: {
    BRAND: 20,
    MODEL: 20,
    BODY_TYPE_PAYLOAD: 20,
    BUDGET: 15,
    FUEL: 10,
    YEAR: 10,
    WHEELS_KM: 5,
  },
};
