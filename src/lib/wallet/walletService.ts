// Wallet Service - Balance computation and validation
import { LedgerEntry, TransactionFilters, MIN_BALANCE_REQUIRED, MIN_RECHARGE_AMOUNT } from './types';
import { getEntries, addEntry, findByReferenceId } from './ledgerStore';

// Compute total balance from ledger entries
// Balance = SUM(credits + refunds + releases) - SUM(debits + holds)
export function computeBalance(userId: string): number {
  const entries = getEntries(userId);
  
  return entries.reduce((balance, entry) => {
    switch (entry.type) {
      case 'credit':
      case 'refund':
      case 'release':
        return balance + entry.amount;
      case 'debit':
      case 'hold':
        return balance - entry.amount;
      case 'adjustment':
        // Adjustments can be positive or negative based on metadata
        const isPositive = entry.metadata?.direction === 'credit';
        return isPositive ? balance + entry.amount : balance - entry.amount;
      default:
        return balance;
    }
  }, 0);
}

// Compute available balance (excludes held amounts)
export function computeAvailableBalance(userId: string): number {
  const entries = getEntries(userId);
  
  // Calculate total holds that haven't been released
  const holdEntries = entries.filter(e => e.type === 'hold');
  const releaseEntries = entries.filter(e => e.type === 'release');
  
  // Match releases to holds by referenceId
  const releasedHoldIds = new Set(releaseEntries.map(r => r.referenceId));
  const activeHolds = holdEntries.filter(h => !releasedHoldIds.has(h.id));
  const heldAmount = activeHolds.reduce((sum, h) => sum + h.amount, 0);
  
  const totalBalance = computeBalance(userId);
  return totalBalance - heldAmount;
}

// Get held amount
export function computeHeldAmount(userId: string): number {
  const entries = getEntries(userId);
  
  const holdEntries = entries.filter(e => e.type === 'hold');
  const releaseEntries = entries.filter(e => e.type === 'release');
  
  const releasedHoldIds = new Set(releaseEntries.map(r => r.referenceId));
  const activeHolds = holdEntries.filter(h => !releasedHoldIds.has(h.id));
  
  return activeHolds.reduce((sum, h) => sum + h.amount, 0);
}

// Validate if deduction is allowed
export function validateDeduction(userId: string, amount: number): { valid: boolean; error?: string } {
  const availableBalance = computeAvailableBalance(userId);
  
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }
  
  if (availableBalance < amount) {
    return { 
      valid: false, 
      error: `Insufficient balance. Available: ₹${availableBalance.toLocaleString('en-IN')}` 
    };
  }
  
  return { valid: true };
}

// Validate recharge amount
export function validateRecharge(amount: number): { valid: boolean; error?: string } {
  if (amount < MIN_RECHARGE_AMOUNT) {
    return { 
      valid: false, 
      error: `Minimum recharge amount is ₹${MIN_RECHARGE_AMOUNT.toLocaleString('en-IN')}` 
    };
  }
  return { valid: true };
}

// Validate refund amount against original debit
export function validateRefund(userId: string, shipmentId: string, refundAmount: number): { valid: boolean; error?: string } {
  const relatedEntries = findByReferenceId(userId, shipmentId);
  
  const totalDebited = relatedEntries
    .filter(e => e.type === 'debit')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const totalRefunded = relatedEntries
    .filter(e => e.type === 'refund')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const maxRefundable = totalDebited - totalRefunded;
  
  if (refundAmount > maxRefundable) {
    return { 
      valid: false, 
      error: `Refund amount exceeds maximum refundable: ₹${maxRefundable.toLocaleString('en-IN')}` 
    };
  }
  
  return { valid: true };
}

// Add funds to wallet
export function addFunds(
  userId: string, 
  amount: number, 
  paymentRef: string,
  description: string = 'Wallet recharge'
): LedgerEntry {
  return addEntry(userId, 'credit', amount, description, {
    referenceId: paymentRef,
    referenceType: 'payment',
    idempotencyKey: paymentRef, // Use payment ref as idempotency key
  });
}

// Deduct funds for shipment
export function deductFunds(
  userId: string,
  amount: number,
  shipmentId: string,
  description: string = 'Shipment booking'
): LedgerEntry | null {
  const validation = validateDeduction(userId, amount);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  return addEntry(userId, 'debit', amount, description, {
    referenceId: shipmentId,
    referenceType: 'shipment',
    idempotencyKey: `debit_${shipmentId}`,
  });
}

// Process refund
export function processRefund(
  userId: string,
  amount: number,
  shipmentId: string,
  description: string = 'Refund processed'
): LedgerEntry | null {
  const validation = validateRefund(userId, shipmentId, amount);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  return addEntry(userId, 'refund', amount, description, {
    referenceId: shipmentId,
    referenceType: 'refund',
  });
}

// Hold funds
export function holdFunds(
  userId: string,
  amount: number,
  referenceId: string,
  description: string = 'Funds held'
): LedgerEntry | null {
  const validation = validateDeduction(userId, amount);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  return addEntry(userId, 'hold', amount, description, {
    referenceId,
    idempotencyKey: `hold_${referenceId}`,
  });
}

// Release held funds
export function releaseFunds(
  userId: string,
  holdEntryId: string,
  description: string = 'Funds released'
): LedgerEntry {
  return addEntry(userId, 'release', 0, description, {
    referenceId: holdEntryId,
  });
}

// Get transaction history with filters
export function getTransactionHistory(
  userId: string,
  filters?: TransactionFilters
): LedgerEntry[] {
  let entries = getEntries(userId);
  
  if (filters?.type) {
    entries = entries.filter(e => e.type === filters.type);
  }
  
  if (filters?.startDate) {
    const start = new Date(filters.startDate);
    entries = entries.filter(e => new Date(e.createdAt) >= start);
  }
  
  if (filters?.endDate) {
    const end = new Date(filters.endDate);
    entries = entries.filter(e => new Date(e.createdAt) <= end);
  }
  
  // Apply pagination
  const offset = filters?.offset || 0;
  const limit = filters?.limit || entries.length;
  
  return entries.slice(offset, offset + limit);
}

// Calculate running balance at each transaction
export function getTransactionHistoryWithRunningBalance(
  userId: string,
  filters?: TransactionFilters
): Array<LedgerEntry & { runningBalance: number }> {
  const allEntries = getEntries(userId);
  
  // Calculate running balance from oldest to newest
  const reversedEntries = [...allEntries].reverse();
  let runningBalance = 0;
  
  const entriesWithBalance = reversedEntries.map(entry => {
    switch (entry.type) {
      case 'credit':
      case 'refund':
      case 'release':
        runningBalance += entry.amount;
        break;
      case 'debit':
      case 'hold':
        runningBalance -= entry.amount;
        break;
    }
    return { ...entry, runningBalance };
  });
  
  // Reverse back to newest first
  let result = entriesWithBalance.reverse();
  
  // Apply filters
  if (filters?.type) {
    result = result.filter(e => e.type === filters.type);
  }
  
  if (filters?.startDate) {
    const start = new Date(filters.startDate);
    result = result.filter(e => new Date(e.createdAt) >= start);
  }
  
  if (filters?.endDate) {
    const end = new Date(filters.endDate);
    result = result.filter(e => new Date(e.createdAt) <= end);
  }
  
  const offset = filters?.offset || 0;
  const limit = filters?.limit || result.length;
  
  return result.slice(offset, offset + limit);
}
