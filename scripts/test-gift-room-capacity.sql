-- Test script to verify gift room capacity fixes

-- Check current gift room status
SELECT 
    id,
    token,
    capacity,
    joined_count,
    status,
    (SELECT COUNT(*) FROM reservations WHERE room_id = gift_rooms.id AND status = 'active' AND expires_at > NOW()) as actual_active_reservations
FROM gift_rooms 
WHERE status IN ('active', 'full')
ORDER BY created_at DESC
LIMIT 10;

-- Check for any inconsistencies
SELECT 
    gr.id,
    gr.token,
    gr.capacity,
    gr.joined_count,
    gr.status,
    COUNT(r.id) as actual_active_reservations,
    (gr.joined_count - COUNT(r.id)) as discrepancy
FROM gift_rooms gr
LEFT JOIN reservations r ON r.room_id = gr.id AND r.status = 'active' AND r.expires_at > NOW()
WHERE gr.status IN ('active', 'full')
GROUP BY gr.id, gr.token, gr.capacity, gr.joined_count, gr.status
HAVING gr.joined_count != COUNT(r.id)
ORDER BY discrepancy DESC;

-- Check for expired reservations that should be cleaned up
SELECT 
    room_id,
    COUNT(*) as expired_reservations
FROM reservations 
WHERE status = 'active' 
AND expires_at < NOW()
GROUP BY room_id
ORDER BY expired_reservations DESC;

-- Run sync function to fix any issues
SELECT sync_gift_room_counts() as rooms_updated;