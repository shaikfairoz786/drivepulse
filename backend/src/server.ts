import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import prisma from './prisma';

const server = app.listen(config.port, () => {
  logger.info(`🚗 Automotive LMS Server running on http://localhost:${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});

// Configure keep-alive timeouts for reverse proxies (Nginx / Cloudflare / ALB)
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} signal received. Initiating graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Database connections closed cleanly.');
      process.exit(0);
    } catch (err) {
      logger.error('Error disconnecting from database:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 10s if connections fail to close
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 10000);
};

// Process signals & exception safety
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Promise Rejection caught:', reason);
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception caught:', error);
  gracefulShutdown('uncaughtException');
});

