# Zentrue Expense Tracker

## Current State
Each expense has: id, date, category, amount, description, paymentMode, createdAt.
No concept of partial payment, remaining balance, or file attachments.

## Requested Changes (Diff)

### Add
- `paidAmount` field (Float) to Expense type — how much has been paid so far
- `receiptUrl` field (optional Text) to store blob storage URL of uploaded screenshot/receipt
- Computed `remainingAmount = amount - paidAmount` displayed in UI
- Paid/Remaining columns in expense table with color coding (green = fully paid, orange = partial, red = unpaid)
- Two KPI cards on Dashboard: "Total Paid" and "Total Remaining"
- Paid Amount input in add/edit expense modal
- Screenshot/receipt upload button in add/edit expense modal (uses blob-storage)
- Receipt thumbnail/link visible in expense table row

### Modify
- `addExpense` and `editExpense` backend functions to accept `paidAmount` and `receiptUrl`
- `ExpensePartial` to include optional `paidAmount` and `receiptUrl`
- backend.d.ts types and interface
- useQueries hooks to pass new fields
- ExpenseModal: add Paid Amount input + file upload for screenshot
- Expenses table: add Paid and Remaining columns
- Dashboard: add Total Paid and Total Remaining KPI cards

### Remove
- Nothing

## Implementation Plan
1. Update Motoko backend: add paidAmount + receiptUrl to Expense, ExpensePartial, addExpense, editExpense
2. Update backend.d.ts
3. Update useQueries hooks
4. Update ExpenseModal with paidAmount input + blob-storage upload for screenshot
5. Update Expenses table with Paid/Remaining columns and receipt icon
6. Update Dashboard KPI cards to show Total Paid and Total Remaining
