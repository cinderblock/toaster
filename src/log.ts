import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'debug',
  format: format.json(),
  // Send to console by default
  transports: [
    new transports.Console({
      format: format.simple(),
    }),
  ],
});

export default logger;
