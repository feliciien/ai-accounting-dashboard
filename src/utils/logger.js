"use strict";
/**
 * Logger Utility
 *
 * A simple logging utility that provides consistent logging across the application.
 * This can be extended to send logs to external services if needed.
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.logger = void 0;
var Logger = /** @class */ (function () {
    function Logger(options) {
        if (options === void 0) { options = {}; }
        this.prefix = options.prefix || 'AI-Accounting';
        this.includeTimestamp = options.includeTimestamp !== false;
    }
    Logger.prototype.formatMessage = function (level, message) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        var timestamp = this.includeTimestamp ? "[".concat(new Date().toISOString(), "]") : '';
        return "".concat(timestamp, " [").concat(this.prefix, "] [").concat(level.toUpperCase(), "] ").concat(message);
    };
    Logger.prototype.info = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.info.apply(console, __spreadArray([this.formatMessage('info', message)], args, false));
    };
    Logger.prototype.warn = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.warn.apply(console, __spreadArray([this.formatMessage('warn', message)], args, false));
    };
    Logger.prototype.error = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.error.apply(console, __spreadArray([this.formatMessage('error', message)], args, false));
    };
    Logger.prototype.debug = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (process.env.NODE_ENV !== 'production') {
            console.debug.apply(console, __spreadArray([this.formatMessage('debug', message)], args, false));
        }
    };
    return Logger;
}());
// Export a singleton instance of the logger
exports.logger = new Logger();
// Also export the class for creating custom loggers if needed
exports["default"] = Logger;
