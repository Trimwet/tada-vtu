# Objective: Withdrawal & Automated Refund System

## Goal
Enable users to withdraw wallet funds to their Nigerian bank accounts via Flutterwave transfers, with fully automated refunds when the transfer fails (merchant wallet insufficient, network error, etc.).

## Success Criteria
1. User can withdraw ₦100–₦500,000 to any Nigerian bank account
2. Frontend shows correct totalDebit (withdrawal amount + real transfer fee)
3. Backend atomically debits user's wallet, then initiates Flutterwave transfer
4. If Flutterwave transfer fails, `coreRefund` automatically restores the user's balance
5. Webhook handler processes Flutterwave `transfer.completed` events (both SUCCESSFUL and FAILED)
6. No money is ever stuck — failed transfers always trigger a refund
7. Webhook logs and notifications keep an audit trail

## Non-Goals
- Card or USSD withdrawal methods
- Recurring/scheduled withdrawals
- Withdrawal fee configuration UI (fees are hardcoded in `getTransferFee`)
- Automatic retry of failed Flutterwave transfers (refund + manual retry only)
