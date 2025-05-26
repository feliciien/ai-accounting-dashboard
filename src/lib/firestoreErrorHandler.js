"use strict";
/**
 * Firestore Error Handler
 *
 * This utility provides enhanced error handling for Firestore operations,
 * specifically addressing common issues like 403 errors and "Unknown SID" errors.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.retryFirestoreOperation = exports.withFirestoreErrorHandling = exports.handleFirestoreError = exports.getFirestoreErrorMessage = exports.getFirestoreErrorType = void 0;
var app_1 = require("firebase/app");
var firestoreSecurityHelper_1 = require("./firestoreSecurityHelper");
/**
 * Determines the type of Firestore error
 */
var getFirestoreErrorType = function (error) {
    // Handle Firebase errors
    if (error instanceof app_1.FirebaseError) {
        return error.code;
    }
    // Handle the specific 403 error with "Unknown SID" message
    if (error && error.name === 'i' && error.code === 403) {
        return 'unknown-sid';
    }
    // Handle other error types
    if (error && error.message) {
        if (error.message.includes('permission denied'))
            return 'permission-denied';
        if (error.message.includes('unavailable'))
            return 'unavailable';
        if (error.message.includes('resource exhausted'))
            return 'resource-exhausted';
        if (error.message.includes('unauthenticated'))
            return 'unauthenticated';
        if (error.message.includes('failed precondition'))
            return 'failed-precondition';
        if (error.message.includes('invalid argument'))
            return 'invalid-argument';
        if (error.message.includes('Unknown SID'))
            return 'unknown-sid';
    }
    return 'unknown';
};
exports.getFirestoreErrorType = getFirestoreErrorType;
/**
 * Gets a user-friendly error message for a Firestore error
 */
var getFirestoreErrorMessage = function (error) {
    var errorType = (0, exports.getFirestoreErrorType)(error);
    switch (errorType) {
        case 'permission-denied':
            return 'You don\'t have permission to access this data. Please check your authentication status.';
        case 'unavailable':
            return 'The Firestore service is currently unavailable. Please try again later.';
        case 'resource-exhausted':
            return 'Firestore quota exceeded. Please try again later or consider upgrading your plan.';
        case 'unauthenticated':
            return 'Authentication required. Please sign in to access this data.';
        case 'failed-precondition':
            return 'Operation failed. This might be due to a missing index or other configuration issue.';
        case 'invalid-argument':
            return 'Invalid query or document data format.';
        case 'unknown-sid':
            return 'Session error: Unknown SID. Your session may have expired. Try signing out and back in.';
        default:
            return "Firestore error: ".concat(error.message || 'Unknown error');
    }
};
exports.getFirestoreErrorMessage = getFirestoreErrorMessage;
/**
 * Handles Firestore errors with appropriate actions
 */
var handleFirestoreError = function (error, customHandler) {
    var errorType = (0, exports.getFirestoreErrorType)(error);
    var errorMessage = (0, exports.getFirestoreErrorMessage)(error);
    // Log the error
    console.error("Firestore Error (".concat(errorType, "):"), errorMessage);
    // For specific error types, provide additional help
    if (errorType === 'permission-denied' || errorType === 'unknown-sid') {
        (0, firestoreSecurityHelper_1.logFirestoreSecurityHelp)();
    }
    // Call custom handler if provided
    if (customHandler) {
        customHandler(error);
    }
};
exports.handleFirestoreError = handleFirestoreError;
/**
 * Creates a wrapped version of a Firestore operation that includes error handling
 */
var withFirestoreErrorHandling = function (operation, customHandler) {
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(void 0, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, operation.apply(void 0, args)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_1 = _a.sent();
                        (0, exports.handleFirestoreError)(error_1, customHandler);
                        throw error_1; // Re-throw to allow calling code to handle it as well
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
};
exports.withFirestoreErrorHandling = withFirestoreErrorHandling;
/**
 * Utility to retry a Firestore operation with exponential backoff
 */
var retryFirestoreOperation = function (operation, maxRetries, initialDelayMs) {
    if (maxRetries === void 0) { maxRetries = 3; }
    if (initialDelayMs === void 0) { initialDelayMs = 1000; }
    return __awaiter(void 0, void 0, void 0, function () {
        var lastError, delay, attempt, error_2, errorType;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    delay = initialDelayMs;
                    attempt = 0;
                    _a.label = 1;
                case 1:
                    if (!(attempt <= maxRetries)) return [3 /*break*/, 7];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 6]);
                    return [4 /*yield*/, operation()];
                case 3: return [2 /*return*/, _a.sent()];
                case 4:
                    error_2 = _a.sent();
                    lastError = error_2;
                    errorType = (0, exports.getFirestoreErrorType)(error_2);
                    if (errorType === 'permission-denied' || errorType === 'invalid-argument') {
                        (0, exports.handleFirestoreError)(error_2);
                        throw error_2;
                    }
                    // Last attempt failed, handle the error and throw
                    if (attempt === maxRetries) {
                        (0, exports.handleFirestoreError)(error_2);
                        throw error_2;
                    }
                    // Wait before retrying
                    console.warn("Firestore operation failed (attempt ".concat(attempt + 1, "/").concat(maxRetries + 1, "). Retrying in ").concat(delay, "ms..."));
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay); })];
                case 5:
                    _a.sent();
                    // Exponential backoff
                    delay *= 2;
                    return [3 /*break*/, 6];
                case 6:
                    attempt++;
                    return [3 /*break*/, 1];
                case 7: 
                // This should never happen due to the throw in the loop
                throw lastError;
            }
        });
    });
};
exports.retryFirestoreOperation = retryFirestoreOperation;
