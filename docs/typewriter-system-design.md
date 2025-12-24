# Typewriter System Design - TADA VTU

## Overview
The typewriter system provides dynamic, contextual messages on the dashboard that rotate automatically to keep the user experience fresh and engaging.

## Architecture

### Core Components

1. **useGreeting Hook** (`src/hooks/useGreeting.ts`)
   - Main controller for message rotation
   - Time-based message pool selection
   - Automatic rotation every 6 seconds
   - Fallback mechanisms

2. **Message Pools** (Categorized by time and context)
   - Morning messages (6 AM - 12 PM)
   - Afternoon messages (12 PM - 5 PM) 
   - Evening messages (5 PM - 10 PM)
   - Night messages (10 PM - 6 AM)
   - General messages (always available)
   - Balance-specific messages

3. **Fallback System** (Multi-layer protection)
   - Primary: Time-based pools
   - Secondary: General message pool
   - Tertiary: Static default message
   - Error handling for all edge cases

## Message Categories

### Time-Based Messages
```
Morning (6-12): "Rise and shine! Ready to hustle?"
Afternoon (12-17): "Afternoon grind mode activated"
Evening (17-22): "Evening vibes, chill and recharge"
Night (22-6): "Night owl? We dey here for you"
```

### Context-Based Messages
```
Low Balance (<₦500): "Time to fund your wallet!"
High Balance (>₦5000): "Wallet looking healthy!"
General: "Wetin you wan buy today?"
```

## Fallback Strategy

### Level 1: Time-Based Pool
- Select appropriate pool based on current hour
- Combine time-specific + general messages
- Random selection from combined pool

### Level 2: General Pool Fallback
- If time-based selection fails
- Use general TYPEWRITER_MESSAGES array
- Guaranteed to have content

### Level 3: Static Fallback
- If all pools fail (edge case)
- Display: "Welcome to TADA VTU!"
- Prevents blank/broken state

### Level 4: Error Handling
- Try-catch around all operations
- Console logging for debugging
- Graceful degradation

## Technical Implementation

### Rotation Logic
```typescript
// 6-second interval rotation
setInterval(() => {
  const pool = getMessagePool(currentHour);
  const randomMessage = selectRandom(pool);
  setGreeting(randomMessage);
}, 6000);
```

### Pool Selection Algorithm
```typescript
function getMessagePool(hour: number) {
  let pool = [...GENERAL_MESSAGES]; // Base fallback
  
  if (hour >= 6 && hour < 12) {
    pool = [...MORNING_MESSAGES, ...GENERAL_MESSAGES.slice(0, 5)];
  } else if (hour >= 12 && hour < 17) {
    pool = [...AFTERNOON_MESSAGES, ...GENERAL_MESSAGES.slice(0, 5)];
  } else if (hour >= 17 && hour < 22) {
    pool = [...EVENING_MESSAGES, ...GENERAL_MESSAGES.slice(0, 5)];
  } else {
    pool = [...NIGHT_MESSAGES, ...GENERAL_MESSAGES.slice(0, 5)];
  }
  
  return pool.length > 0 ? pool : FALLBACK_MESSAGES;
}
```

## Message Content Strategy

### Nigerian Context
- Use local expressions: "Wetin you wan buy?"
- Include cultural references: "hustle", "sharp guy"
- Mix English and Pidgin appropriately

### Tone Guidelines
- Friendly and approachable
- Encouraging and positive
- Action-oriented
- Brief (under 40 characters when possible)

### Content Categories
1. **Greeting/Welcome**: Personal connection
2. **Action Prompts**: Encourage transactions
3. **Value Props**: Highlight benefits
4. **Social Proof**: Build trust
5. **Motivational**: Inspire success

## Error Handling

### Potential Issues & Solutions
1. **Empty Message Pool**: Use FALLBACK_MESSAGES
2. **Invalid Time**: Default to general pool
3. **Component Unmount**: Clear intervals
4. **Render Errors**: Try-catch with static fallback

### Monitoring
- Console logs for debugging
- Message rotation tracking
- Pool selection logging

## Performance Considerations

### Optimization
- Pre-compute message pools
- Avoid heavy operations in intervals
- Use React.memo for static content
- Cleanup intervals on unmount

### Memory Management
- Clear timeouts/intervals
- Avoid memory leaks
- Efficient array operations

## Future Enhancements

### Planned Features
1. **User Personalization**: Name-based messages
2. **Balance Integration**: Amount-specific content
3. **Activity Context**: Transaction-based messages
4. **A/B Testing**: Message effectiveness tracking
5. **Admin Panel**: Dynamic message management

### Scalability
- Database-driven messages
- Real-time updates
- Multi-language support
- Analytics integration

## Testing Strategy

### Unit Tests
- Message pool selection
- Time-based logic
- Fallback mechanisms
- Error handling

### Integration Tests
- Component rendering
- Interval behavior
- State management
- User interactions

### Edge Cases
- Midnight transitions
- Daylight saving time
- Invalid dates
- Network issues

## Maintenance

### Regular Tasks
1. **Content Review**: Update messages quarterly
2. **Performance Check**: Monitor rotation smoothness
3. **User Feedback**: Gather message preferences
4. **Analytics Review**: Track engagement metrics

### Content Guidelines
- Keep messages fresh and relevant
- Test new content with small groups
- Maintain brand voice consistency
- Regular A/B testing of variants