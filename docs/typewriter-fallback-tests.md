# Typewriter Fallback System Tests

## Test Scenarios

### 1. Normal Operation Tests
- ✅ Morning messages (6 AM - 12 PM)
- ✅ Afternoon messages (12 PM - 5 PM)  
- ✅ Evening messages (5 PM - 10 PM)
- ✅ Night messages (10 PM - 6 AM)
- ✅ Message rotation every 6 seconds
- ✅ Console logging for debugging

### 2. Edge Case Tests
- ✅ Midnight transition (23:59 → 00:01)
- ✅ Invalid hour values (negative, >24)
- ✅ Empty message pools
- ✅ Null/undefined inputs
- ✅ Component unmounting during rotation

### 3. Fallback Layer Tests

#### Level 1: Time-based Pool Fallback
```typescript
// If time-based pool fails, use TYPEWRITER_MESSAGES
const pool = getMessagePool(invalidHour);
// Should return TYPEWRITER_MESSAGES array
```

#### Level 2: Core Fallback Messages
```typescript
// If all pools are empty, use CORE_FALLBACK_MESSAGES
const message = safeSelectMessage([]);
// Should return "Ready to recharge?"
```

#### Level 3: Emergency Fallback
```typescript
// If everything fails, use EMERGENCY_FALLBACK
const message = safeSelectMessage(null);
// Should return "Welcome to TADA VTU!"
```

### 4. Error Handling Tests
- ✅ Try-catch around all operations
- ✅ Console error logging
- ✅ Graceful degradation
- ✅ No app crashes

### 5. Performance Tests
- ✅ Memory leak prevention
- ✅ Interval cleanup on unmount
- ✅ Efficient array operations
- ✅ No blocking operations

## Manual Testing Checklist

### Browser Console Tests
1. Open browser dev tools
2. Navigate to dashboard
3. Check console for typewriter logs
4. Verify message rotation every 6 seconds
5. Look for any error messages

### Time-based Testing
1. Change system time to different hours
2. Refresh dashboard
3. Verify appropriate messages show
4. Test midnight transitions

### Error Simulation
```javascript
// In browser console, simulate errors:
window.Date = null; // Break date functionality
// Check if fallback messages still work
```

### Network Issues
1. Disconnect internet
2. Refresh page
3. Verify typewriter still works
4. No API dependencies should break it

## Expected Behaviors

### Success Cases
- Messages rotate smoothly every 6 seconds
- Time-appropriate messages show
- Console shows selection logs
- No errors in console

### Fallback Cases
- Empty pools → Use core fallbacks
- Invalid time → Use general messages  
- Errors → Use emergency fallback
- Component unmount → Clean intervals

### Error Cases
- All errors caught and logged
- App continues functioning
- User sees fallback messages
- No blank/broken states

## Monitoring Commands

### Check Current Message Pool
```javascript
// In browser console:
const hour = new Date().getHours();
console.log('Current hour:', hour);
console.log('Expected pool:', hour >= 6 && hour < 12 ? 'MORNING' : 
                           hour >= 12 && hour < 17 ? 'AFTERNOON' :
                           hour >= 17 && hour < 22 ? 'EVENING' : 'NIGHT');
```

### Force Message Update
```javascript
// Trigger manual update (if exposed):
window.updateTypewriterMessage?.();
```

### Check for Memory Leaks
```javascript
// Monitor active intervals:
console.log('Active intervals:', window.setInterval.length);
```

## Deployment Checklist

### Pre-deployment
- [ ] All fallback layers tested
- [ ] Console logs reviewed
- [ ] No memory leaks detected
- [ ] Error handling verified
- [ ] Performance acceptable

### Post-deployment
- [ ] Monitor error logs
- [ ] Check user feedback
- [ ] Verify message variety
- [ ] Confirm rotation timing
- [ ] Test on different devices

## Troubleshooting Guide

### Issue: Messages not rotating
**Check:** Console for errors, interval cleanup
**Fix:** Verify useEffect dependencies

### Issue: Wrong time-based messages
**Check:** System time, hour calculation
**Fix:** Verify time ranges in getMessagePool

### Issue: Blank messages
**Check:** Fallback system activation
**Fix:** Ensure EMERGENCY_FALLBACK is set

### Issue: Console errors
**Check:** Error handling in try-catch blocks
**Fix:** Add more specific error handling

### Issue: Memory leaks
**Check:** Interval cleanup in useEffect
**Fix:** Ensure clearInterval in cleanup function