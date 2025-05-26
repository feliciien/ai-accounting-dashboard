"use strict";
/**
 * Xero Webhook Handler
 *
 * This file handles incoming webhook notifications from Xero.
 * It verifies the webhook signature and processes events like invoice creation,
 * contact updates, and payments.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var express_1 = require("express");
var crypto_1 = require("crypto");
var enhancedFirebase_1 = require("../../../lib/enhancedFirebase");
var firestore_1 = require("firebase/firestore");
var xeroTokenRefresh_1 = require("../../../utils/xeroTokenRefresh");
var logger_1 = require("../../../utils/logger");
var router = express_1["default"].Router();
// Webhook signature verification middleware
var verifyXeroWebhook = function (req, res, next) {
    try {
        // Get the Xero signature from the request headers
        var xeroSignature = req.headers['x-xero-signature'];
        if (!xeroSignature) {
            logger_1.logger.warn('Missing Xero signature header');
            return res.status(401).json({ error: 'Missing signature' });
        }
        // Get the webhook key from environment variables
        var webhookKey = process.env.REACT_APP_XERO_WEBHOOK_KEY;
        if (!webhookKey) {
            logger_1.logger.error('Xero webhook key not configured');
            return res.status(500).json({ error: 'Webhook key not configured' });
        }
        // Create HMAC using the webhook key
        var hmac = crypto_1["default"].createHmac('sha256', webhookKey);
        // Update HMAC with request body as string
        var rawBody = JSON.stringify(req.body);
        hmac.update(rawBody);
        // Get the calculated signature
        var calculatedSignature = hmac.digest('base64');
        // Compare the calculated signature with the one from Xero
        if (calculatedSignature !== xeroSignature) {
            logger_1.logger.warn('Invalid Xero webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }
        // If signature is valid, proceed to the route handler
        next();
    }
    catch (error) {
        logger_1.logger.error('Error verifying Xero webhook signature:', error);
        res.status(500).json({ error: 'Failed to verify webhook signature' });
    }
};
// Main webhook endpoint
router.post('/', verifyXeroWebhook, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var events, _i, events_1, event_1, resourceUrl, eventType, tenantId, usersCollection, usersSnapshot, userDoc, userId, _a, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 12, , 13]);
                events = req.body.events;
                if (!events || !Array.isArray(events)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid webhook payload' })];
                }
                logger_1.logger.info("Received ".concat(events.length, " Xero webhook events"));
                _i = 0, events_1 = events;
                _b.label = 1;
            case 1:
                if (!(_i < events_1.length)) return [3 /*break*/, 11];
                event_1 = events_1[_i];
                resourceUrl = event_1.resourceUrl, eventType = event_1.eventType, tenantId = event_1.tenantId;
                if (!resourceUrl || !eventType || !tenantId) {
                    logger_1.logger.warn('Incomplete event data received', { event: event_1 });
                    return [3 /*break*/, 10];
                }
                logger_1.logger.info("Processing Xero event: ".concat(eventType), { tenantId: tenantId });
                usersCollection = (0, enhancedFirebase_1.getCollection)('users');
                return [4 /*yield*/, (0, firestore_1.getDocs)((0, firestore_1.query)(usersCollection, (0, firestore_1.where)('xero.tenant_id', '==', tenantId), (0, firestore_1.limit)(1)))];
            case 2:
                usersSnapshot = _b.sent();
                if (usersSnapshot.empty) {
                    logger_1.logger.warn("No user found for Xero tenant ID: ".concat(tenantId));
                    return [3 /*break*/, 10];
                }
                userDoc = usersSnapshot.docs[0];
                userId = userDoc.id;
                _a = eventType;
                switch (_a) {
                    case 'Invoice.created': return [3 /*break*/, 3];
                    case 'Invoice.updated': return [3 /*break*/, 3];
                    case 'Contact.created': return [3 /*break*/, 5];
                    case 'Contact.updated': return [3 /*break*/, 5];
                    case 'Payment.created': return [3 /*break*/, 7];
                }
                return [3 /*break*/, 9];
            case 3: return [4 /*yield*/, processInvoiceEvent(userId, resourceUrl, tenantId)];
            case 4:
                _b.sent();
                return [3 /*break*/, 10];
            case 5: return [4 /*yield*/, processContactEvent(userId, resourceUrl, tenantId)];
            case 6:
                _b.sent();
                return [3 /*break*/, 10];
            case 7: return [4 /*yield*/, processPaymentEvent(userId, resourceUrl, tenantId)];
            case 8:
                _b.sent();
                return [3 /*break*/, 10];
            case 9:
                logger_1.logger.info("Unhandled Xero event type: ".concat(eventType));
                _b.label = 10;
            case 10:
                _i++;
                return [3 /*break*/, 1];
            case 11: 
            // Always respond with 200 OK to acknowledge receipt
            return [2 /*return*/, res.status(200).send('OK')];
            case 12:
                error_1 = _b.sent();
                logger_1.logger.error('Error processing Xero webhook:', error_1);
                // Still return 200 to prevent Xero from retrying
                return [2 /*return*/, res.status(200).send('OK')];
            case 13: return [2 /*return*/];
        }
    });
}); });
/**
 * Process invoice events from Xero
 */
function processInvoiceEvent(userId, resourceUrl, tenantId) {
    return __awaiter(this, void 0, void 0, function () {
        var endpoint, invoiceData, invoiceRef, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    endpoint = resourceUrl.replace('https://api.xero.com', '');
                    return [4 /*yield*/, (0, xeroTokenRefresh_1.fetchFromXero)(userId, endpoint)];
                case 1:
                    invoiceData = _a.sent();
                    if (!invoiceData) {
                        logger_1.logger.warn("Failed to fetch invoice data for user ".concat(userId));
                        return [2 /*return*/];
                    }
                    invoiceRef = (0, enhancedFirebase_1.getDocument)("users/".concat(userId, "/xero_invoices"), invoiceData.InvoiceID);
                    return [4 /*yield*/, (0, enhancedFirebase_1.enhancedSetDoc)(invoiceRef, __assign(__assign({}, invoiceData), { updated_at: new Date().toISOString(), tenant_id: tenantId }))];
                case 2:
                    _a.sent();
                    logger_1.logger.info("Updated Xero invoice ".concat(invoiceData.InvoiceID, " for user ").concat(userId));
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    logger_1.logger.error("Error processing Xero invoice event for user ".concat(userId, ":"), error_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Process contact events from Xero
 */
function processContactEvent(userId, resourceUrl, tenantId) {
    return __awaiter(this, void 0, void 0, function () {
        var endpoint, contactData, contactRef, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    endpoint = resourceUrl.replace('https://api.xero.com', '');
                    return [4 /*yield*/, (0, xeroTokenRefresh_1.fetchFromXero)(userId, endpoint)];
                case 1:
                    contactData = _a.sent();
                    if (!contactData) {
                        logger_1.logger.warn("Failed to fetch contact data for user ".concat(userId));
                        return [2 /*return*/];
                    }
                    contactRef = (0, enhancedFirebase_1.getDocument)("users/".concat(userId, "/xero_contacts"), contactData.ContactID);
                    return [4 /*yield*/, (0, enhancedFirebase_1.enhancedSetDoc)(contactRef, __assign(__assign({}, contactData), { updated_at: new Date().toISOString(), tenant_id: tenantId }))];
                case 2:
                    _a.sent();
                    logger_1.logger.info("Updated Xero contact ".concat(contactData.ContactID, " for user ").concat(userId));
                    return [3 /*break*/, 4];
                case 3:
                    error_3 = _a.sent();
                    logger_1.logger.error("Error processing Xero contact event for user ".concat(userId, ":"), error_3);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Process payment events from Xero
 */
function processPaymentEvent(userId, resourceUrl, tenantId) {
    return __awaiter(this, void 0, void 0, function () {
        var endpoint, paymentData, paymentRef, invoiceRef, invoiceDoc, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    endpoint = resourceUrl.replace('https://api.xero.com', '');
                    return [4 /*yield*/, (0, xeroTokenRefresh_1.fetchFromXero)(userId, endpoint)];
                case 1:
                    paymentData = _a.sent();
                    if (!paymentData) {
                        logger_1.logger.warn("Failed to fetch payment data for user ".concat(userId));
                        return [2 /*return*/];
                    }
                    paymentRef = (0, enhancedFirebase_1.getDocument)("users/".concat(userId, "/xero_payments"), paymentData.PaymentID);
                    return [4 /*yield*/, (0, enhancedFirebase_1.enhancedSetDoc)(paymentRef, __assign(__assign({}, paymentData), { updated_at: new Date().toISOString(), tenant_id: tenantId }))];
                case 2:
                    _a.sent();
                    if (!(paymentData.Invoice && paymentData.Invoice.InvoiceID)) return [3 /*break*/, 5];
                    invoiceRef = (0, enhancedFirebase_1.getDocument)("users/".concat(userId, "/xero_invoices"), paymentData.Invoice.InvoiceID);
                    return [4 /*yield*/, (0, enhancedFirebase_1.enhancedGetDoc)(invoiceRef)];
                case 3:
                    invoiceDoc = _a.sent();
                    if (!invoiceDoc.exists()) return [3 /*break*/, 5];
                    // Update the invoice with the new payment information
                    return [4 /*yield*/, (0, enhancedFirebase_1.enhancedUpdateDoc)(invoiceRef, {
                            AmountPaid: paymentData.Amount,
                            Status: 'PAID',
                            updated_at: new Date().toISOString()
                        })];
                case 4:
                    // Update the invoice with the new payment information
                    _a.sent();
                    logger_1.logger.info("Updated invoice ".concat(paymentData.Invoice.InvoiceID, " payment status for user ").concat(userId));
                    _a.label = 5;
                case 5:
                    logger_1.logger.info("Processed Xero payment ".concat(paymentData.PaymentID, " for user ").concat(userId));
                    return [3 /*break*/, 7];
                case 6:
                    error_4 = _a.sent();
                    logger_1.logger.error("Error processing Xero payment event for user ".concat(userId, ":"), error_4);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
exports["default"] = router;
