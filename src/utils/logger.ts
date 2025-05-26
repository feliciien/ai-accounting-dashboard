/**
 * Logger Utility
 *
 * A simple logging utility that provides consistent logging across the application.
 * This can be extended to send logs to external services if needed.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LoggerOptions {
  prefix?: string;
  includeTimestamp?: boolean;
}

class Logger {
  private prefix: string;
  private includeTimestamp: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || 'AI-Accounting';
    this.includeTimestamp = options.includeTimestamp !== false;
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = this.includeTimestamp ? `[${new Date().toISOString()}]` : '';
    return `${timestamp} [${this.prefix}] [${level.toUpperCase()}] ${message}`;
  }

  info(message: string, ...args: any[]): void {
    console.info(this.formatMessage('info', message), ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('warn', message), ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage('error', message), ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }
}

// Export a singleton instance of the logger
export const logger = new Logger();

// Also export the class for creating custom loggers if needed
export default Logger;