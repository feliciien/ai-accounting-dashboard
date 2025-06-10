# Firestore WebChannel Connection Troubleshooting Guide

## Common Error Messages

```
WebChannelConnection RPC 'Listen' stream transport errored
WebChannelConnection RPC 'Write' stream transport errored
GET https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/... 400 (Bad Request)
```

## Quick Fix Steps

1. **Clear Browser Cache and Cookies**
   - This resolves most temporary connection issues
   - In Chrome: Settings > Privacy and Security > Clear browsing data

2. **Refresh the Page**
   - The application now includes automatic recovery mechanisms
   - A simple refresh often resolves the issue

3. **Check Firebase Console Configuration**
   - Ensure your domain is authorized in Firebase Console
   - Go to Firebase Console > Authentication > Settings > Authorized Domains
   - Add your domain (e.g., workfusionapp.com) to the list

## For Developers

### Firebase Configuration

Ensure your `.env` file has all required Firebase configuration variables:

```
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### Firestore Security Rules

Check your Firestore security rules to ensure they allow proper access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read and write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Add other rules as needed
  }
}
```

### CORS Configuration

If you're experiencing CORS issues, ensure your application has the proper CORS headers:

```html
<meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin-allow-popups">
<meta http-equiv="Cross-Origin-Embedder-Policy" content="credentialless">
<meta http-equiv="Cross-Origin-Resource-Policy" content="cross-origin">
<meta name="referrer" content="no-referrer-when-downgrade">
```

## Advanced Troubleshooting

### Check Browser Console

Look for these diagnostic messages in your browser console:

- "Enhanced Firebase initialized successfully"
- "Firestore connection fixes initialized"
- "Firestore WebChannel fix applied successfully"

### Network Tab Analysis

In Chrome DevTools Network tab:

1. Filter for "firestore" requests
2. Look for 400 (Bad Request) responses
3. Check the request headers and payload

### Firebase Quota and Billing

- Verify your Firebase project has billing enabled
- Check if you've exceeded your quota limits
- Go to Firebase Console > Usage and Billing

## Analytics Endpoint Errors (500 Internal Server Error)

If you're seeing 500 errors for `/api/analytics/track` requests:

1. **Check Server Logs**
   - Look for detailed error messages in your server logs
   - Common issues include database connection problems or API rate limits

2. **Verify API Route Implementation**
   - Ensure the analytics endpoint is properly handling requests
   - Check for missing error handling or invalid data processing

3. **Server Resources**
   - Verify your server has sufficient resources (memory, CPU)
   - Consider scaling up if you're experiencing high traffic

4. **Authentication**
   - Ensure the analytics endpoint is properly authenticating requests
   - Check for expired tokens or missing credentials

## React Maximum Update Depth Exceeded

This error occurs in the Dashboard component when React detects an infinite update loop.

### Common Causes and Fixes

1. **Missing Dependency Arrays in useEffect**
   - Check all useEffect hooks in Dashboard.tsx
   - Ensure each useEffect has a proper dependency array
   - Example fix:
     ```jsx
     // Before (problematic)
     useEffect(() => {
       // Effect code
     }); // No dependency array
     
     // After (fixed)
     useEffect(() => {
       // Effect code
     }, [dependency1, dependency2]); // Proper dependency array
     ```

2. **State Updates Causing Re-renders**
   - Look for state updates that trigger other state updates
   - Use functional updates for state that depends on previous state
   - Example fix:
     ```jsx
     // Before (problematic)
     setCount(count + 1);
     
     // After (fixed)
     setCount(prevCount => prevCount + 1);
     ```

3. **Circular Dependencies**
   - Check for circular dependencies between state variables
   - Break the cycle by using useRef or restructuring your component

4. **Specific Issues in Dashboard.tsx**
   - The login streak tracking in useEffect (lines 200-250) might be causing issues
   - The achievement progress updates might trigger re-renders
   - Check the updateAchievementProgress function calls

### Recommended Fixes

1. **Use useCallback for Functions**
   ```jsx
   const updateAchievement = useCallback((id, progress) => {
     updateAchievementProgress(id, progress);
   }, [updateAchievementProgress]);
   ```

2. **Use useMemo for Derived State**
   ```jsx
   const derivedValue = useMemo(() => {
     return calculateValue(dependency);
   }, [dependency]);
   ```

3. **Use useRef for Values That Don't Trigger Re-renders**
   ```jsx
   const valueRef = useRef(initialValue);
   // Update without causing re-render
   valueRef.current = newValue;
   ```

4. **Conditional State Updates**
   ```jsx
   // Only update if the value has changed
   if (newValue !== currentValue) {
     setCurrentValue(newValue);
   }
   ```

## Automatic Recovery Mechanisms

The application includes automatic recovery mechanisms for Firestore connection issues:

1. **Error Detection**
   - The application listens for WebChannel errors
   - It identifies specific error types (listen_stream, write_stream, bad_request)

2. **Recovery Process**
   - Disables the Firestore network
   - Clears IndexedDB cache for specific error types
   - Re-enables the network after a delay
   - Refreshes authentication tokens

3. **Retry Logic**
   - Uses exponential backoff for retries
   - Limits to 5 maximum retry attempts
   - Resets retry count on successful connection

If automatic recovery fails, a manual page refresh is still recommended.