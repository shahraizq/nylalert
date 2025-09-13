import winston from 'winston';
import { Validator } from './security/validator.js';
import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { mode: 0o700 }); // Secure permissions
}

// Custom format to sanitize sensitive data
const sanitizeFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  // Sanitize message and metadata
  const sanitizedMessage = Validator.sanitizeForLog(message);
  const sanitizedMeta = JSON.stringify(meta, (key, value) => {
    if (typeof value === 'string') {
      return Validator.sanitizeForLog(value);
    }
    return value;
  });
  
  return `${timestamp} [${level.toUpperCase()}]: ${sanitizedMessage} ${
    Object.keys(meta).length ? sanitizedMeta : ''
  }`;
});

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    sanitizeFormat
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'nyla-alerts.log'),
      maxsize: 10 * 1024 * 1024, // 10MB max file size
      maxFiles: 5, // Keep 5 rotated files
      tailable: true
    })
  ]
});