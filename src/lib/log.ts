const originalLog = console.log.bind(console);
const originalInfo = (console.info ?? console.log).bind(console);
const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);

export type LogFn = (...args: unknown[]) => void;

type Logger = {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  debug: LogFn;
};

export const log: Logger = {
  info: (...args: unknown[]) => {
    if (__DEV__) {
      originalInfo(...args);
    }
  },
  warn: (...args: unknown[]) => {
    originalWarn(...args);
  },
  error: (...args: unknown[]) => {
    originalError(...args);
  },
  debug: (...args: unknown[]) => {
    if (__DEV__) {
      originalLog(...args);
    }
  },
};

if (typeof console !== "undefined") {
  console.log = (...args: unknown[]) => {
    log.info(...args);
  };
  console.info = (...args: unknown[]) => {
    log.info(...args);
  };
  console.warn = (...args: unknown[]) => {
    log.warn(...args);
  };
  console.error = (...args: unknown[]) => {
    log.error(...args);
  };
}

export default log;
