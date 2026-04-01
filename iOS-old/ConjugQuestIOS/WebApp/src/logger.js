// ─── Structured Game Logger ───
// Lightweight logger for key game events, useful for debugging.
// Logs are stored in memory and can be dumped from the console.

const LOG_MAX_ENTRIES = 500;
const _logs = [];

/**
 * Log levels: debug, info, warn, error.
 */
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
let _minLevel = LEVELS.info;

/**
 * Set the minimum log level to display.
 * @param {"debug"|"info"|"warn"|"error"} level
 */
export function setLogLevel(level) {
  _minLevel = LEVELS[level] ?? LEVELS.info;
}

function log(level, category, message, data) {
  const numLevel = LEVELS[level] ?? LEVELS.info;
  if (numLevel < _minLevel) return;

  const entry = {
    t: Date.now(),
    level,
    cat: category,
    msg: message,
    data: data ?? null,
  };

  _logs.push(entry);
  if (_logs.length > LOG_MAX_ENTRIES) {
    _logs.splice(0, _logs.length - LOG_MAX_ENTRIES);
  }

  const prefix = `[${category}]`;
  if (level === "error") {
    console.error(prefix, message, data ?? "");
  } else if (level === "warn") {
    console.warn(prefix, message, data ?? "");
  } else if (level === "debug") {
    // Only print to console at debug level if explicitly enabled.
    if (_minLevel === LEVELS.debug) {
      console.debug(prefix, message, data ?? "");
    }
  } else {
    console.log(prefix, message, data ?? "");
  }
}

export function logDebug(category, message, data) {
  log("debug", category, message, data);
}

export function logInfo(category, message, data) {
  log("info", category, message, data);
}

export function logWarn(category, message, data) {
  log("warn", category, message, data);
}

export function logError(category, message, data) {
  log("error", category, message, data);
}

/**
 * Get all stored log entries.
 * @returns {object[]}
 */
export function getLogs() {
  return _logs.slice();
}

/**
 * Clear all stored log entries.
 */
export function clearLogs() {
  _logs.length = 0;
}

/**
 * Dump logs as formatted text.
 * @returns {string}
 */
export function dumpLogs() {
  return _logs
    .map((e) => {
      const time = new Date(e.t).toISOString().slice(11, 23);
      const dataStr = e.data ? ` ${JSON.stringify(e.data)}` : "";
      return `${time} ${e.level.toUpperCase().padEnd(5)} [${e.cat}] ${e.msg}${dataStr}`;
    })
    .join("\n");
}
