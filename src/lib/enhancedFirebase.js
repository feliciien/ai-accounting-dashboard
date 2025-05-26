"use strict";
/**
 * Enhanced Firebase Wrapper
 *
 * This utility provides enhanced Firebase functionality with better error handling,
 * retry mechanisms, and session management to address common Firestore issues.
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
exports.checkAndRefreshAuth = exports.enhancedOnSnapshot = exports.enhancedUpdateDoc = exports.enhancedSetDoc = exports.enhancedGetDocs = exports.enhancedGetDoc = exports.getDocument = exports.getCollection = exports.getEnhancedFirebaseFirestore = exports.getEnhancedFirebaseAuth = exports.initializeEnhancedFirebase = exports.db = void 0;
var app_1 = require("firebase/app");
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
var firestoreErrorHandler_1 = require("./firestoreErrorHandler");
// Store the original Firebase instances
var app;
var auth;
var db;
exports.db = db;
// Initialize Firebase with better error handling
var initializeEnhancedFirebase = function () {
    try {
        // Your web app's Firebase configuration
        var firebaseConfig = {
            apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
            authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
            storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.REACT_APP_FIREBASE_APP_ID,
            measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
        };
        app = (0, app_1.initializeApp)(firebaseConfig);
        auth = (0, auth_1.getAuth)(app);
        exports.db = db = (0, firestore_1.getFirestore)(app);
        console.log('Enhanced Firebase initialized successfully');
        return { app: app, auth: auth, db: db };
    }
    catch (error) {
        console.error('Enhanced Firebase initialization error:', error);
        throw error;
    }
};
exports.initializeEnhancedFirebase = initializeEnhancedFirebase;
// Get the Firebase instances, initializing if needed
var getEnhancedFirebaseAuth = function () {
    if (!auth) {
        var newAuth = (0, exports.initializeEnhancedFirebase)().auth;
        return newAuth;
    }
    return auth;
};
exports.getEnhancedFirebaseAuth = getEnhancedFirebaseAuth;
var getEnhancedFirebaseFirestore = function () {
    if (!db) {
        var newDb = (0, exports.initializeEnhancedFirebase)().db;
        return newDb;
    }
    return db;
};
exports.getEnhancedFirebaseFirestore = getEnhancedFirebaseFirestore;
// Helper functions for Firestore collections
var getCollection = function (collectionPath) {
    var firestore = (0, exports.getEnhancedFirebaseFirestore)();
    return (0, firestore_1.collection)(firestore, collectionPath);
};
exports.getCollection = getCollection;
var getDocument = function (collectionPath, docId) {
    var firestore = (0, exports.getEnhancedFirebaseFirestore)();
    return (0, firestore_1.doc)(firestore, collectionPath, docId);
};
exports.getDocument = getDocument;
// Enhanced Firestore operations with error handling and retry
var enhancedGetDoc = function (docRef) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, (0, firestoreErrorHandler_1.retryFirestoreOperation)(function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, (0, firestore_1.getDoc)(docRef)];
                        case 1: return [2 /*return*/, _a.sent()];
                        case 2:
                            error_1 = _a.sent();
                            (0, firestoreErrorHandler_1.handleFirestoreError)(error_1);
                            throw error_1;
                        case 3: return [2 /*return*/];
                    }
                });
            }); })];
    });
}); };
exports.enhancedGetDoc = enhancedGetDoc;
var enhancedGetDocs = function (queryRef) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, (0, firestoreErrorHandler_1.retryFirestoreOperation)(function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, (0, firestore_1.getDocs)(queryRef)];
                        case 1: return [2 /*return*/, _a.sent()];
                        case 2:
                            error_2 = _a.sent();
                            (0, firestoreErrorHandler_1.handleFirestoreError)(error_2);
                            throw error_2;
                        case 3: return [2 /*return*/];
                    }
                });
            }); })];
    });
}); };
exports.enhancedGetDocs = enhancedGetDocs;
var enhancedSetDoc = function (docRef, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, (0, firestoreErrorHandler_1.retryFirestoreOperation)(function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, (0, firestore_1.setDoc)(docRef, data)];
                        case 1: return [2 /*return*/, _a.sent()];
                        case 2:
                            error_3 = _a.sent();
                            (0, firestoreErrorHandler_1.handleFirestoreError)(error_3);
                            throw error_3;
                        case 3: return [2 /*return*/];
                    }
                });
            }); })];
    });
}); };
exports.enhancedSetDoc = enhancedSetDoc;
var enhancedUpdateDoc = function (docRef, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, (0, firestoreErrorHandler_1.retryFirestoreOperation)(function () { return __awaiter(void 0, void 0, void 0, function () {
                var error_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, (0, firestore_1.updateDoc)(docRef, data)];
                        case 1: return [2 /*return*/, _a.sent()];
                        case 2:
                            error_4 = _a.sent();
                            (0, firestoreErrorHandler_1.handleFirestoreError)(error_4);
                            throw error_4;
                        case 3: return [2 /*return*/];
                    }
                });
            }); })];
    });
}); };
exports.enhancedUpdateDoc = enhancedUpdateDoc;
// Enhanced onSnapshot with error handling and automatic reconnection
var enhancedOnSnapshot = function (queryRef, callback, errorCallback) {
    var unsubscribe = null;
    var retryCount = 0;
    var maxRetries = 5;
    var retryDelay = 1000; // Start with 1 second delay
    // Define attemptRetry function before it's used
    var attemptRetry = function () {
        if (retryCount < maxRetries) {
            retryCount++;
            var delay = retryDelay * Math.pow(2, retryCount - 1); // Exponential backoff
            console.warn("Firestore listener disconnected. Retrying in ".concat(delay, "ms (attempt ").concat(retryCount, "/").concat(maxRetries, ")"));
            setTimeout(function () {
                if (unsubscribe) {
                    unsubscribe();
                    unsubscribe = null;
                }
                setupListener();
            }, delay);
        }
        else {
            console.error("Failed to establish Firestore listener after ".concat(maxRetries, " attempts."));
        }
    };
    var setupListener = function () {
        try {
            // Handle different reference types
            if (queryRef.type === 'document') {
                // It's a DocumentReference
                unsubscribe = (0, firestore_1.onSnapshot)(queryRef, function (snapshot) {
                    // Reset retry count on successful snapshot
                    retryCount = 0;
                    callback(snapshot);
                }, function (error) {
                    (0, firestoreErrorHandler_1.handleFirestoreError)(error);
                    // Check if it's a session error (Unknown SID)
                    if (error.name === 'i' && error.code === 403) {
                        console.warn('Firestore session error detected. Attempting to refresh authentication...');
                        // Try to refresh authentication
                        var auth_2 = (0, exports.getEnhancedFirebaseAuth)();
                        (0, auth_1.signOut)(auth_2).then(function () {
                            // Try anonymous auth to refresh the session
                            return (0, auth_1.signInAnonymously)(auth_2);
                        }).then(function () {
                            console.log('Authentication refreshed. Reconnecting Firestore listener...');
                            // Reconnect after auth refresh
                            if (unsubscribe) {
                                unsubscribe();
                                unsubscribe = null;
                            }
                            setupListener();
                        })["catch"](function (authError) {
                            console.error('Failed to refresh authentication:', authError);
                            attemptRetry();
                        });
                    }
                    else {
                        // For other errors, attempt retry with backoff
                        attemptRetry();
                    }
                    // Call error callback if provided
                    if (errorCallback) {
                        errorCallback(error);
                    }
                });
            }
            else {
                // It's a Query
                unsubscribe = (0, firestore_1.onSnapshot)(queryRef, function (snapshot) {
                    // Reset retry count on successful snapshot
                    retryCount = 0;
                    callback(snapshot);
                }, function (error) {
                    (0, firestoreErrorHandler_1.handleFirestoreError)(error);
                    // Check if it's a session error (Unknown SID)
                    if (error.name === 'i' && error.code === 403) {
                        console.warn('Firestore session error detected. Attempting to refresh authentication...');
                        // Try to refresh authentication
                        var auth_3 = (0, exports.getEnhancedFirebaseAuth)();
                        (0, auth_1.signOut)(auth_3).then(function () {
                            // Try anonymous auth to refresh the session
                            return (0, auth_1.signInAnonymously)(auth_3);
                        }).then(function () {
                            console.log('Authentication refreshed. Reconnecting Firestore listener...');
                            // Reconnect after auth refresh
                            if (unsubscribe) {
                                unsubscribe();
                                unsubscribe = null;
                            }
                            setupListener();
                        })["catch"](function (authError) {
                            console.error('Failed to refresh authentication:', authError);
                            attemptRetry();
                        });
                    }
                    else {
                        // For other errors, attempt retry with backoff
                        attemptRetry();
                    }
                    // Call error callback if provided
                    if (errorCallback) {
                        errorCallback(error);
                    }
                });
            }
        }
        catch (setupError) {
            console.error('Error setting up Firestore listener:', setupError);
            attemptRetry();
        }
    };
    // Initial setup
    setupListener();
    // Return function to unsubscribe
    return function () {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
    };
};
exports.enhancedOnSnapshot = enhancedOnSnapshot;
// Function to check and refresh authentication if needed
var checkAndRefreshAuth = function () { return __awaiter(void 0, void 0, void 0, function () {
    var auth;
    return __generator(this, function (_a) {
        auth = (0, exports.getEnhancedFirebaseAuth)();
        return [2 /*return*/, new Promise(function (resolve) {
                // Check current auth state
                var unsubscribe = (0, auth_1.onAuthStateChanged)(auth, function (user) {
                    unsubscribe();
                    if (user) {
                        // User is signed in, check if token needs refresh
                        user.getIdToken(true).then(function () {
                            console.log('Authentication token refreshed successfully');
                            resolve(true);
                        })["catch"](function (error) {
                            console.error('Failed to refresh token:', error);
                            // Try to sign out and sign in anonymously
                            (0, auth_1.signOut)(auth).then(function () {
                                return (0, auth_1.signInAnonymously)(auth);
                            }).then(function () {
                                console.log('Re-authenticated successfully');
                                resolve(true);
                            })["catch"](function (error) {
                                console.error('Failed to re-authenticate:', error);
                                resolve(false);
                            });
                        });
                    }
                    else {
                        // No user signed in, try anonymous auth
                        (0, auth_1.signInAnonymously)(auth).then(function () {
                            console.log('Signed in anonymously');
                            resolve(true);
                        })["catch"](function (error) {
                            console.error('Failed to sign in anonymously:', error);
                            resolve(false);
                        });
                    }
                });
            })];
    });
}); };
exports.checkAndRefreshAuth = checkAndRefreshAuth;
// Initialize Firebase on module load to ensure db is available
(function () {
    try {
        var _a = (0, exports.initializeEnhancedFirebase)(), initialApp = _a.app, initialAuth = _a.auth, initialDb = _a.db;
        app = initialApp;
        auth = initialAuth;
        exports.db = db = initialDb;
        console.log('Firebase initialized on module load');
    }
    catch (error) {
        console.error('Failed to initialize Firebase on module load:', error);
    }
})();
