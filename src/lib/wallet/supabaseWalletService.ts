// Real-time Supabase Wallet Service
// Uses Supabase database functions for all operations
import { supabase } from '@/integrations/supabase/client';
import { 
  LedgerEntry, 
  TransactionType, 
  TransactionFilters,
  MIN_RECHARGE_AMOUNT,
  MIN_BALANCE_REQUIRED,
} from './types';

// Get all ledger entries from Supabase
export async function getEntries(userId: string): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from('wallet_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('[Wallet] Error fetching entries:', error);
    throw new Error(`Failed to fetch wallet entries: ${error.message}`);
  }
  
  if (!data) return [];
  
  return data.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    type: row.transaction_type as TransactionType,
    amount: parseFloat(row.amount),
    description: row.description,
    referenceId: row.reference_id,
    referenceType: row.reference_type,
    idempotencyKey: row.idempotency_key,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
}

// Compute balance using Supabase function or fallback to manual calculation
export async function computeBalance(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_wallet_balance', {
      p_user_id: userId
    });
    
    if (!error && data !== null) {
      return parseFloat(data);
    }
  } catch (err) {
    console.warn('[Wallet] Function call failed, using manual calculation:', err);
  }
  
  // Fallback: compute from entries
  console.log('[Wallet] Using manual balance calculation');
  const entries = await getEntries(userId);
  return entries.reduce((balance, entry) => {
    switch (entry.type) {
      case 'credit':
      case 'refund':
      case 'release':
        return balance + entry.amount;
      case 'debit':
      case 'hold':
        return balance - entry.amount;
      default:
        return balance;
    }
  }, 0);
}

// Compute available balance using Supabase function or fallback
export async function computeAvailableBalance(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_available_balance', {
      p_user_id: userId
    });
    
    if (!error && data !== null) {
      return parseFloat(data);
    }
  } catch (err) {
    console.warn('[Wallet] Function call failed, using fallback:', err);
  }
  
  // Fallback to total balance
  console.log('[Wallet] Using total balance as available balance');
  return computeBalance(userId);
}

// Validate recharge
export function validateRecharge(amount: number, bypassMinRecharge = false): { valid: boolean; error?: string } {
  if (!bypassMinRecharge && amount < MIN_RECHARGE_AMOUNT) {
    return { valid: false, error: `Minimum recharge amount is ₹${MIN_RECHARGE_AMOUNT}` };
  }
  if (amount <= 0) {
    return { valid: false, error: 'Enter a valid amount' };
  }
  if (amount > 100000) {
    return { valid: false, error: 'Maximum recharge amount is ₹1,00,000' };
  }
  return { valid: true };
}

// Validate deduction
export async function validateDeduction(userId: string, amount: number): Promise<{ valid: boolean; error?: string }> {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }
  
  const balance = await computeAvailableBalance(userId);
  
  if (balance < amount) {
    return { 
      valid: false, 
      error: `Insufficient balance. Available: ₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
    };
  }
  
  return { valid: true };
}

// Add funds directly to ledger (bypass function if it doesn't exist)
export async function addFunds(
  userId: string, 
  amount: number, 
  paymentRef: string, 
  description: string = 'Wallet recharge'
): Promise<LedgerEntry | null> {
  try {
    // Try using the Supabase function first
    const { data: functionResult, error: functionError } = await supabase.rpc('add_wallet_funds', {
      p_user_id: userId,
      p_amount: amount,
      p_description: description,
      p_reference_id: paymentRef,
      p_idempotency_key: paymentRef
    });
    
    if (!functionError && functionResult) {
      // Fetch the created entry
      const { data: entry, error: fetchError } = await supabase
        .from('wallet_ledger')
        .select('*')
        .eq('id', functionResult)
        .single();
        
      if (!fetchError && entry) {
        return {
          id: entry.id,
          userId: entry.user_id,
          type: entry.transaction_type as TransactionType,
          amount: parseFloat(entry.amount),
          description: entry.description,
          referenceId: entry.reference_id,
          referenceType: entry.reference_type,
          idempotencyKey: entry.idempotency_key,
          metadata: entry.metadata,
          createdAt: entry.created_at,
        };
      }
    }
  } catch (err) {
    console.warn('[Wallet] Function call failed, using direct insert:', err);
  }
  
  // Fallback: Direct insert if function doesn't exist
  console.log('[Wallet] Using direct insert for add funds');
  
  // Check for existing entry with same idempotency key
  const { data: existing } = await supabase
    .from('wallet_ledger')
    .select('*')
    .eq('idempotency_key', paymentRef)
    .single();
    
  if (existing) {
    console.log('[Wallet] Found existing entry with idempotency key');
    return {
      id: existing.id,
      userId: existing.user_id,
      type: existing.transaction_type as TransactionType,
      amount: parseFloat(existing.amount),
      description: existing.description,
      referenceId: existing.reference_id,
      referenceType: existing.reference_type,
      idempotencyKey: existing.idempotency_key,
      metadata: existing.metadata,
      createdAt: existing.created_at,
    };
  }
  
  const { data, error } = await supabase
    .from('wallet_ledger')
    .insert({
      user_id: userId,
      transaction_type: 'credit',
      amount: Math.abs(amount),
      description,
      reference_id: paymentRef,
      reference_type: 'payment',
      idempotency_key: paymentRef,
    })
    .select()
    .single();
    
  if (error) {
    console.error('[Wallet] Error adding funds:', error);
    throw new Error(`Failed to add funds: ${error.message}`);
  }
  
  if (!data) {
    throw new Error('Failed to add funds: No data returned');
  }
  
  return {
    id: data.id,
    userId: data.user_id,
    type: data.transaction_type as TransactionType,
    amount: parseFloat(data.amount),
    description: data.description,
    referenceId: data.reference_id,
    referenceType: data.reference_type,
    idempotencyKey: data.idempotency_key,
    metadata: data.metadata,
    createdAt: data.created_at,
  };
}

// Deduct funds directly from ledger (bypass function if it doesn't exist)
export async function deductFunds(
  userId: string, 
  amount: number, 
  shipmentId: string, 
  description?: string
): Promise<LedgerEntry | null> {
  const validation = await validateDeduction(userId, amount);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const idempotencyKey = `debit_${shipmentId}_${Date.now()}`;
  
  try {
    // Try using the Supabase function first
    const { data: functionResult, error: functionError } = await supabase.rpc('deduct_wallet_funds', {
      p_user_id: userId,
      p_amount: amount,
      p_description: description || 'Shipment booking',
      p_shipment_id: shipmentId,
      p_idempotency_key: idempotencyKey
    });
    
    if (!functionError && functionResult) {
      // Fetch the created entry
      const { data: entry, error: fetchError } = await supabase
        .from('wallet_ledger')
        .select('*')
        .eq('id', functionResult)
        .single();
        
      if (!fetchError && entry) {
        return {
          id: entry.id,
          userId: entry.user_id,
          type: entry.transaction_type as TransactionType,
          amount: parseFloat(entry.amount),
          description: entry.description,
          referenceId: entry.reference_id,
          referenceType: entry.reference_type,
          idempotencyKey: entry.idempotency_key,
          metadata: entry.metadata,
          createdAt: entry.created_at,
        };
      }
    }
  } catch (err) {
    console.warn('[Wallet] Function call failed, using direct insert:', err);
  }
  
  // Fallback: Direct insert
  console.log('[Wallet] Using direct insert for deduct funds');
  
  const { data, error } = await supabase
    .from('wallet_ledger')
    .insert({
      user_id: userId,
      transaction_type: 'debit',
      amount: Math.abs(amount),
      description: description || 'Shipment booking',
      reference_id: shipmentId,
      reference_type: 'shipment',
      idempotency_key: idempotencyKey,
    })
    .select()
    .single();
    
  if (error) {
    console.error('[Wallet] Error deducting funds:', error);
    throw new Error(`Failed to deduct funds: ${error.message}`);
  }
  
  if (!data) {
    throw new Error('Failed to deduct funds: No data returned');
  }
  
  return {
    id: data.id,
    userId: data.user_id,
    type: data.transaction_type as TransactionType,
    amount: parseFloat(data.amount),
    description: data.description,
    referenceId: data.reference_id,
    referenceType: data.reference_type,
    idempotencyKey: data.idempotency_key,
    metadata: data.metadata,
    createdAt: data.created_at,
  };
}

// Process refund
export async function processRefund(
  userId: string, 
  amount: number, 
  shipmentId: string, 
  description?: string
): Promise<LedgerEntry | null> {
  const { data, error } = await supabase
    .from('wallet_ledger')
    .insert({
      user_id: userId,
      transaction_type: 'refund',
      amount: Math.abs(amount),
      description: description || 'Refund processed',
      reference_id: shipmentId,
      reference_type: 'refund',
    })
    .select()
    .single();
    
  if (error) {
    console.error('[Wallet] Error processing refund:', error);
    throw new Error(`Failed to process refund: ${error.message}`);
  }
  
  if (!data) return null;
  
  return {
    id: data.id,
    userId: data.user_id,
    type: data.transaction_type as TransactionType,
    amount: parseFloat(data.amount),
    description: data.description,
    referenceId: data.reference_id,
    referenceType: data.reference_type,
    idempotencyKey: data.idempotency_key,
    metadata: data.metadata,
    createdAt: data.created_at,
  };
}

// Get transaction history with filters
export async function getTransactionHistory(
  userId: string, 
  filters?: TransactionFilters
): Promise<LedgerEntry[]> {
  let query = supabase
    .from('wallet_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (filters?.type) {
    query = query.eq('transaction_type', filters.type);
  }
  
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[Wallet] Error fetching history:', error);
    return [];
  }
  
  if (!data) return [];
  
  return data.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    type: row.transaction_type as TransactionType,
    amount: parseFloat(row.amount),
    description: row.description,
    referenceId: row.reference_id,
    referenceType: row.reference_type,
    idempotencyKey: row.idempotency_key,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
}

// Store receipt in Supabase
export async function storeReceipt(
  userId: string, 
  ledgerEntryId: string, 
  receiptData: any
): Promise<boolean> {
  const { error } = await supabase
    .from('wallet_receipts')
    .insert({
      user_id: userId,
      ledger_entry_id: ledgerEntryId,
      receipt_number: receiptData.receiptNumber,
      transaction_id: receiptData.transactionId,
      amount: receiptData.amount,
      gst_amount: receiptData.gstAmount,
      total_amount: receiptData.totalAmount,
      payment_method: receiptData.paymentMethod,
      customer_name: receiptData.customerName,
      customer_email: receiptData.customerEmail,
    });
    
  if (error) {
    console.error('[Wallet] Error storing receipt:', error);
    return false;
  }
  
  return true;
}

// Get receipt by ledger entry ID
export async function getReceiptByLedgerEntryId(
  userId: string, 
  ledgerEntryId: string
): Promise<any | null> {
  const { data, error } = await supabase
    .from('wallet_receipts')
    .select('*')
    .eq('user_id', userId)
    .eq('ledger_entry_id', ledgerEntryId)
    .single();
    
  if (error) {
    console.error('[Wallet] Error fetching receipt:', error);
    return null;
  }
  
  return data;
}
