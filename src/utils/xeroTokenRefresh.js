"use strict";
/**
 * Xero Token Refresh Utility
 *
 * This utility handles refreshing Xero OAuth2 tokens when they expire.
 * Xero access tokens expire after 30 minutes, so we need to use the refresh token
 * to get a new access token before making API calls.
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
exports.fetchFromXero = exports.refreshXeroTokenIfNeeded = void 0;
var firestore_1 = require("firebase-admin/firestore");
/**
 * Refreshes the Xero access token if it's expired
 * @param uid User ID
 * @returns The current valid tokens
 */
var refreshXeroTokenIfNeeded = function (uid) { return __awaiter(void 0, void 0, void 0, function () {
    var db, doc, data, xeroData, isExpired, tokenResponse, errorData, tokens, updatedTokens, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 9, , 10]);
                db = (0, firestore_1.getFirestore)();
                return [4 /*yield*/, db.collection('integrations').doc(uid).get()];
            case 1:
                doc = _a.sent();
                if (!doc.exists) {
                    console.error('No integration found for user:', uid);
                    return [2 /*return*/, null];
                }
                data = doc.data();
                xeroData = data === null || data === void 0 ? void 0 : data.xero;
                if (!xeroData || !xeroData.connected) {
                    console.error('Xero not connected for user:', uid);
                    return [2 /*return*/, null];
                }
                isExpired = xeroData.expires_at < (Date.now() + 5 * 60 * 1000);
                if (!isExpired) {
                    return [2 /*return*/, xeroData];
                }
                console.log('Refreshing Xero token for user:', uid);
                return [4 /*yield*/, fetch('https://identity.xero.com/connect/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            grant_type: 'refresh_token',
                            refresh_token: xeroData.refresh_token,
                            client_id: process.env.REACT_APP_XERO_CLIENT_ID,
                            client_secret: process.env.REACT_APP_XERO_CLIENT_SECRET
                        })
                    })];
            case 2:
                tokenResponse = _a.sent();
                if (!!tokenResponse.ok) return [3 /*break*/, 6];
                return [4 /*yield*/, tokenResponse.text()];
            case 3:
                errorData = _a.sent();
                console.error('Failed to refresh Xero token:', errorData);
                if (!(tokenResponse.status === 400)) return [3 /*break*/, 5];
                return [4 /*yield*/, db.collection('integrations').doc(uid).set({
                        xero: {
                            connected: false,
                            disconnected_at: Date.now(),
                            error: 'Refresh token expired or invalid'
                        }
                    }, { merge: true })];
            case 4:
                _a.sent();
                _a.label = 5;
            case 5: return [2 /*return*/, null];
            case 6: return [4 /*yield*/, tokenResponse.json()];
            case 7:
                tokens = _a.sent();
                updatedTokens = {
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expires_at: Date.now() + tokens.expires_in * 1000,
                    connected_at: xeroData.connected_at,
                    connected: true
                };
                return [4 /*yield*/, db.collection('integrations').doc(uid).set({
                        xero: updatedTokens
                    }, { merge: true })];
            case 8:
                _a.sent();
                return [2 /*return*/, updatedTokens];
            case 9:
                error_1 = _a.sent();
                console.error('Error refreshing Xero token:', error_1);
                return [2 /*return*/, null];
            case 10: return [2 /*return*/];
        }
    });
}); };
exports.refreshXeroTokenIfNeeded = refreshXeroTokenIfNeeded;
/**
 * Fetches data from Xero API with automatic token refresh
 * @param uid User ID
 * @param endpoint Xero API endpoint (e.g., '/api.xro/2.0/Invoices')
 * @returns The API response data or null if failed
 */
var fetchFromXero = function (uid, endpoint) { return __awaiter(void 0, void 0, void 0, function () {
    var tokens, response, errorText, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                return [4 /*yield*/, (0, exports.refreshXeroTokenIfNeeded)(uid)];
            case 1:
                tokens = _a.sent();
                if (!tokens) {
                    throw new Error('No valid Xero tokens available');
                }
                return [4 /*yield*/, fetch("https://api.xero.com".concat(endpoint), {
                        headers: {
                            'Authorization': "Bearer ".concat(tokens.access_token),
                            'Accept': 'application/json'
                        }
                    })];
            case 2:
                response = _a.sent();
                if (!!response.ok) return [3 /*break*/, 4];
                return [4 /*yield*/, response.text()];
            case 3:
                errorText = _a.sent();
                throw new Error("Xero API error (".concat(response.status, "): ").concat(errorText));
            case 4: return [4 /*yield*/, response.json()];
            case 5: return [2 /*return*/, _a.sent()];
            case 6:
                error_2 = _a.sent();
                console.error('Error fetching from Xero:', error_2);
                return [2 /*return*/, null];
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.fetchFromXero = fetchFromXero;
