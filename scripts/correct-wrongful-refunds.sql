-- Corrective Actions for Wrongful Gift Refunds
-- IMPORTANT: Run the investigation scripts first to identify issues before executing corrections

-- 1. Function to reverse a wrongful refund
CREATE OR REPLACE FUNCTION reverse_wrongful_refund(
    p_wrongful_recipient_email TEXT,
    p_correct_creator_email TEXT,
    p_amount DECIMAL(12,2),
    p_original_reference TEXT,
    p_reason TEXT DEFAULT 'Correcting wrongful gift refund'
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    debit_transaction_id UUID,
    credit_transaction_id UUID
) AS $$
DECLARE
    v_wrongful_recipient_id UUID;
    v_correct_creator_id UUID;
    v_wrongful_recipient_balance DECIMAL(12,2);
    v_debit_txn_id UUID;
    v_credit_txn_id UUID;
BEGIN
    -- Get user IDs
    SELECT id INTO v_wrongful_recipient_id 
    FROM profiles WHERE email = p_wrongful_recipient_email;
    
    SELECT id INTO v_correct_creator_id 
    FROM profiles WHERE email = p_correct_creator_email;
    
    -- Validate users exist
    IF v_wrongful_recipient_id IS NULL THEN
        RETURN QUERY SELECT false, 'Wrongful recipient not found', NULL::UUID, NULL::UUID;
        RETURN;
    END IF;
    
    IF v_correct_creator_id IS NULL THEN
        RETURN QUERY SELECT false, 'Correct creator not found', NULL::UUID, NULL::UUID;
        RETURN;
    END IF;
    
    -- Check if wrongful recipient has sufficient balance
    SELECT balance INTO v_wrongful_recipient_balance 
    FROM profiles WHERE id = v_wrongful_recipient_id;
    
    IF v_wrongful_recipient_balance < p_amount THEN
        RETURN QUERY SELECT false, 
            'Insufficient balance in wrongful recipient account: ' || v_wrongful_recipient_balance, 
            NULL::UUID, NULL::UUID;
        RETURN;
    END IF;
    
    -- Start transaction
    BEGIN
        -- Debit from wrongful recipient
        INSERT INTO wallet_transactions (
            user_id, type, amount, description, reference, 
            balance_before, balance_after
        ) VALUES (
            v_wrongful_recipient_id, 
            'debit', 
            p_amount,
            'Correction: ' || p_reason,
            'CORRECTION_DEBIT_' || p_original_reference,
            v_wrongful_recipient_balance,
            v_wrongful_recipient_balance - p_amount
        ) RETURNING id INTO v_debit_txn_id;
        
        -- Update wrongful recipient balance
        UPDATE profiles 
        SET balance = balance - p_amount, updated_at = NOW()
        WHERE id = v_wrongful_recipient_id;
        
        -- Credit to correct creator
        INSERT INTO wallet_transactions (
            user_id, type, amount, description, reference,
            balance_before, balance_after
        ) VALUES (
            v_correct_creator_id,
            'credit',
            p_amount,
            'Correction: ' || p_reason,
            'CORRECTION_CREDIT_' || p_original_reference,
            (SELECT balance FROM profiles WHERE id = v_correct_creator_id),
            (SELECT balance FROM profiles WHERE id = v_correct_creator_id) + p_amount
        ) RETURNING id INTO v_credit_txn_id;
        
        -- Update correct creator balance
        UPDATE profiles 
        SET balance = balance + p_amount, updated_at = NOW()
        WHERE id = v_correct_creator_id;
        
        -- Log the correction in gift room activities if room exists
        INSERT INTO gift_room_activities (
            gift_room_id, user_id, activity_type, details
        )
        SELECT 
            gr.id,
            v_correct_creator_id,
            'corrected',
            jsonb_build_object(
                'correction_type', 'wrongful_refund_reversal',
                'amount', p_amount,
                'from_user', p_wrongful_recipient_email,
                'to_user', p_correct_creator_email,
                'original_reference', p_original_reference,
                'debit_transaction_id', v_debit_txn_id,
                'credit_transaction_id', v_credit_txn_id,
                'timestamp', NOW()
            )
        FROM gift_rooms gr
        WHERE gr.creator_id = v_correct_creator_id
          AND p_original_reference ILIKE '%' || gr.id || '%'
        LIMIT 1;
        
        RETURN QUERY SELECT true, 
            'Successfully corrected wrongful refund: ₦' || p_amount || 
            ' moved from ' || p_wrongful_recipient_email || 
            ' to ' || p_correct_creator_email,
            v_debit_txn_id,
            v_credit_txn_id;
            
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT false, 
                'Error during correction: ' || SQLERRM, 
                NULL::UUID, NULL::UUID;
    END;
END;
$$ LANGUAGE plpgsql;

-- 2. Specific correction for jonahmafuyai@gmail.com if needed
-- UNCOMMENT AND MODIFY THE FOLLOWING AFTER INVESTIGATION:

/*
-- Example correction (MODIFY BASED ON INVESTIGATION RESULTS):
SELECT * FROM reverse_wrongful_refund(
    'jonahmafuyai@gmail.com',           -- wrongful recipient
    'actual_creator@example.com',        -- correct creator (REPLACE WITH ACTUAL)
    100.00,                             -- amount to reverse (REPLACE WITH ACTUAL)
    'gift_refund_12345',                -- original reference (REPLACE WITH ACTUAL)
    'Correcting wrongful gift room refund identified in investigation'
);
*/

-- 3. Batch correction function for multiple wrongful refunds
CREATE OR REPLACE FUNCTION batch_correct_wrongful_refunds()
RETURNS TABLE(
    correction_id INTEGER,
    success BOOLEAN,
    message TEXT,
    wrongful_recipient TEXT,
    correct_creator TEXT,
    amount DECIMAL(12,2)
) AS $$
DECLARE
    correction_record RECORD;
    correction_counter INTEGER := 0;
BEGIN
    -- This would be populated based on investigation results
    -- For now, it's a template for manual corrections
    
    FOR correction_record IN
        -- REPLACE THIS WITH ACTUAL WRONGFUL REFUNDS FROM INVESTIGATION
        SELECT 
            'jonahmafuyai@gmail.com' as wrongful_email,
            'correct_creator@example.com' as creator_email,
            100.00 as refund_amount,
            'gift_refund_example' as original_ref
        WHERE FALSE  -- Set to TRUE when ready to execute
    LOOP
        correction_counter := correction_counter + 1;
        
        -- Execute correction
        DECLARE
            correction_result RECORD;
        BEGIN
            SELECT * INTO correction_result 
            FROM reverse_wrongful_refund(
                correction_record.wrongful_email,
                correction_record.creator_email,
                correction_record.refund_amount,
                correction_record.original_ref,
                'Batch correction of wrongful gift refunds'
            );
            
            RETURN QUERY SELECT 
                correction_counter,
                correction_result.success,
                correction_result.message,
                correction_record.wrongful_email,
                correction_record.creator_email,
                correction_record.refund_amount;
        END;
    END LOOP;
    
    IF correction_counter = 0 THEN
        RETURN QUERY SELECT 
            0, 
            false, 
            'No corrections configured. Update the query with actual wrongful refunds.',
            ''::TEXT,
            ''::TEXT,
            0.00::DECIMAL(12,2);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Audit trail for corrections
CREATE TABLE IF NOT EXISTS refund_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wrongful_recipient_id UUID REFERENCES profiles(id),
    correct_creator_id UUID REFERENCES profiles(id),
    amount DECIMAL(12,2) NOT NULL,
    original_reference TEXT,
    debit_transaction_id UUID,
    credit_transaction_id UUID,
    reason TEXT,
    corrected_by TEXT DEFAULT 'system',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Function to log corrections
CREATE OR REPLACE FUNCTION log_refund_correction(
    p_wrongful_recipient_id UUID,
    p_correct_creator_id UUID,
    p_amount DECIMAL(12,2),
    p_original_reference TEXT,
    p_debit_txn_id UUID,
    p_credit_txn_id UUID,
    p_reason TEXT
) RETURNS UUID AS $$
DECLARE
    v_correction_id UUID;
BEGIN
    INSERT INTO refund_corrections (
        wrongful_recipient_id,
        correct_creator_id,
        amount,
        original_reference,
        debit_transaction_id,
        credit_transaction_id,
        reason
    ) VALUES (
        p_wrongful_recipient_id,
        p_correct_creator_id,
        p_amount,
        p_original_reference,
        p_debit_txn_id,
        p_credit_txn_id,
        p_reason
    ) RETURNING id INTO v_correction_id;
    
    RETURN v_correction_id;
END;
$$ LANGUAGE plpgsql;

-- 6. View to check all corrections made
CREATE OR REPLACE VIEW refund_corrections_summary AS
SELECT 
    rc.id,
    rc.amount,
    rc.original_reference,
    rc.reason,
    rc.created_at,
    wrongful.email as wrongful_recipient_email,
    wrongful.full_name as wrongful_recipient_name,
    creator.email as correct_creator_email,
    creator.full_name as correct_creator_name,
    rc.corrected_by
FROM refund_corrections rc
JOIN profiles wrongful ON rc.wrongful_recipient_id = wrongful.id
JOIN profiles creator ON rc.correct_creator_id = creator.id
ORDER BY rc.created_at DESC;

-- INSTRUCTIONS FOR USE:
-- 1. First run: investigate-user-jonahmafuyai.sql
-- 2. Then run: check-wrongful-gift-refunds.sql
-- 3. Review the results carefully
-- 4. If wrongful refunds are confirmed, modify the correction functions above
-- 5. Execute the corrections with proper parameters
-- 6. Verify the corrections using the summary view