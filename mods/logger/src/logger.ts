import winston from 'winston';

interface LoggerConfig {
  service: string;
  filePath: string;
  level?: 'verbose' | 'info' | 'warn' | 'error';
}

const logLevel = (process.env.LOGS_LEVEL as 'verbose' | 'info' | 'warn' | 'error') || 'info';

const levelMap: Record<string, string> = {
  verbose: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error'
};

export function getLogger(config: LoggerConfig): winston.Logger {
  const { service, filePath } = config;
  const fileName = filePath.split('/').pop() || 'unknown';

  return winston.createLogger({
    level: levelMap[logLevel] || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: {
      service,
      file: fileName
    },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, service, file, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
          })
        )
      })
    ]
  });
}

