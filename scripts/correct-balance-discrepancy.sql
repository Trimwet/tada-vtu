-- Correct Balance Discrepancy for Jonah Mafuyai
-- User has ₦650.00 excess funds that need to be removed

-- IMPORTANT: Run find-balance-discrepancy.sql first to confirm the issue!

-- Function to correct the balance discrepancy
CREATE OR REPLACE FUNCTION correct_balance_discrepancy(
    p_user_id UUID,
    p_user_email TEXT,
    p_excess_amount DECIMAL(12,2),
    p_reason TEXT DEFAULT 'Balance discrepancy correction'
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    old_balance DECIMAL(12,2),
    new_balance DECIMAL(12,2),
    correction_transaction_id UUID
) AS $$
DECLARE
    v_current_balance DECIMAL(12,2);
    v_new_balance DECIMAL(12,2);
    v_transaction_id UUID;
BEGIN
    -- Get current balance
    SELECT balance INTO v_current_balance
    FROM profiles
    WHERE id = p_user_id;
    
    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT false, 'User not found', 0.00::DECIMAL(12,2), 0.00::DECIMAL(12,2), NULL::UUID;
        RETURN;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance - p_excess_amount;
    
    -- Ensure new balance is not negative
    IF v_new_balance < 0 THEN
        RETURN QUERY SELECT false, 
            'Correction would result in negative balance: ' || v_new_balance, 
            v_current_balance, v_new_balance, NULL::UUID;
        RETURN;
    END IF;
    
    BEGIN
        -- Create correction transaction
        INSERT INTO wallet_transactions (
            user_id,
            type,
            amount,
            description,
            reference,
            balance_before,
            balance_after
        ) VALUES (
            p_user_id,
            'debit',
            p_excess_amount,
            p_reason,
            'BALANCE_CORRECTION_' || EXTRACT(EPOCH FROM NOW())::TEXT,
            v_current_balance,
            v_new_balance
        ) RETURNING id INTO v_transaction_id;
        
        -- Update user balance
        UPDATE profiles
        SET balance = v_new_balance,
            updated_at = NOW()
        WHERE id = p_user_id;
        
        -- Log the correction
        INSERT INTO transactions (
            user_id,
            type,
            amount,
            status,
            description,
            reference
        ) VALUES (
            p_user_id,
            'withdrawal',
            p_excess_amount,
            'success',
            'System correction: ' || p_reason,
            'BALANCE_CORRECTION_' || v_transaction_id
        );
        
        RETURN QUERY SELECT true, 
            'Balance corrected successfully for ' || p_user_email,
            v_current_balance,
            v_new_balance,
            v_transaction_id;
            
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT false, 
                'Error during correction: ' || SQLERRM,
                v_current_balance, v_current_balance, NULL::UUID;
    END;
END;
$$ LANGUAGE plpgsql;

-- Execute the correction for Jonah Mafuyai
-- UNCOMMENT THE FOLLOWING LINE AFTER CONFIRMING THE DISCREPANCY:

/*
SELECT * FROM correct_balance_discrepancy(
    '31aaa21d-d806-4667-8579-2ec4cdfdf247',
    'jonahmafuyai@gmail.com',
    650.00,
    'Correcting balance discrepancy - user had excess ₦650.00'
);
*/

-- Verification query to run after correction
SELECT 
    p.id,
    p.email,
    p.balance as current_balance,
    COALESCE(SUM(CASE WHEN wt.type = 'credit' THEN wt.amount ELSE -wt.amount END), 0) as calculated_balance,
    (p.balance - COALESCE(SUM(CASE WHEN wt.type = 'credit' THEN wt.amount ELSE -wt.amount END), 0)) as remaining_discrepancy
FROM profiles p
LEFT JOIN wallet_transactions wt ON p.id = wt.user_id
WHERE p.id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
GROUP BY p.id, p.email, p.balance;

-- Create audit table for balance corrections
CREATE TABLE IF NOT EXISTS balance_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    user_email TEXT,
    old_balance DECIMAL(12,2),
    new_balance DECIMAL(12,2),
    correction_amount DECIMAL(12,2),
    reason TEXT,
    transaction_id UUID,
    corrected_by TEXT DEFAULT 'system',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Function to log balance corrections
CREATE OR REPLACE FUNCTION log_balance_correction(
    p_user_id UUID,
    p_user_email TEXT,
    p_old_balance DECIMAL(12,2),
    p_new_balance DECIMAL(12,2),
    p_correction_amount DECIMAL(12,2),
    p_reason TEXT,
    p_transaction_id UUID
) RETURNS UUID AS $$
DECLARE
    v_correction_id UUID;
BEGIN
    INSERT INTO balance_corrections (
        user_id,
        user_email,
        old_balance,
        new_balance,
        correction_amount,
        reason,
        transaction_id
    ) VALUES (
        p_user_id,
        p_user_email,
        p_old_balance,
        p_new_balance,
        p_correction_amount,
        p_reason,
        p_transaction_id
    ) RETURNING id INTO v_correction_id;
    
    RETURN v_correction_id;
END;
$$ LANGUAGE plpgsql;

-- View to see all balance corrections
CREATE OR REPLACE VIEW balance_corrections_summary AS
SELECT 
    bc.id,
    bc.user_email,
    bc.old_balance,
    bc.new_balance,
    bc.correction_amount,
    bc.reason,
    bc.created_at,
    bc.corrected_by
FROM balance_corrections bc
ORDER BY bc.created_at DESC;