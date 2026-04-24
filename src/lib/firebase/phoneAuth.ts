'use client';

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { firebaseAuth } from './config';

let confirmationResult: ConfirmationResult | null = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Initialise (or reuse) an invisible reCAPTCHA verifier.
 * containerId must be the id of a DOM element that exists when this is called.
 */
function getRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier) return recaptchaVerifier;
  recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'invisible',
    callback: () => { /* reCAPTCHA solved */ },
    'expired-callback': () => {
      recaptchaVerifier = null;
    },
  });
  return recaptchaVerifier;
}

/**
 * Send OTP to the given E.164 phone number via Firebase Phone Auth.
 * Returns { success, error? }
 */
export async function sendFirebaseOtp(
  phone: string,
  recaptchaContainerId = 'recaptcha-container'
): Promise<{ success: boolean; error?: string }> {
  try {
    const verifier = getRecaptchaVerifier(recaptchaContainerId);
    confirmationResult = await signInWithPhoneNumber(firebaseAuth, phone, verifier);
    return { success: true };
  } catch (err: unknown) {
    // Reset verifier on error so next attempt gets a fresh one
    recaptchaVerifier = null;
    confirmationResult = null;
    const msg = err instanceof Error ? err.message : 'Failed to send OTP';
    return { success: false, error: msg };
  }
}

/**
 * Verify the OTP code entered by the user.
 * Returns { success, error? }
 */
export async function verifyFirebaseOtp(
  code: string
): Promise<{ success: boolean; error?: string }> {
  if (!confirmationResult) {
    return { success: false, error: 'No OTP session found. Please request a new OTP.' };
  }
  try {
    await confirmationResult.confirm(code);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid OTP';
    return { success: false, error: msg };
  }
}

/** Clear the current OTP session (e.g. on modal close) */
export function clearOtpSession() {
  confirmationResult = null;
}
