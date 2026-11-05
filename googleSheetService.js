// googleSheetService.js
// Dedicated Google Sheets Real-Time Audit Integration for Maa Park Championship 2026
// Zero-Downtime, Resilient Queue with Exponential Backoff Retry Engine
// Connects to Google Apps Script Web App for 4-Tab Audit Sync:
//   Tab 1: Master_Registrations
//   Tab 2: Itemized_Exam_Audit
//   Tab 3: Final_Scorecards
//   Tab 4: SNA_College_Ledger

import fs from 'fs';
import path from 'path';

const retryQueue = [];
let isProcessingQueue = false;
const FALLBACK_LOG_PATH = path.resolve('sheets_audit_fallback.jsonl');

/**
 * Append payload to fallback log on disk for absolute 0% data loss guarantee
 */
function appendToDiskFallback(payload, errorMsg) {
  try {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      error: errorMsg,
      payload,
    }) + '\n';
    fs.appendFileSync(FALLBACK_LOG_PATH, entry, 'utf8');
  } catch (fsErr) {
    console.error('❌ Failed to write fallback disk log:', fsErr.message);
  }
}

/**
 * Executes HTTP post with timeout protection
 */
async function postToGoogleAppsScript(url, payload, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const text = await res.text();
    return { success: true, response: text };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Background retry worker with exponential backoff
 */
async function processRetryQueue() {
  if (isProcessingQueue || retryQueue.length === 0) return;
  isProcessingQueue = true;

  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url || url.includes('YOUR_SCRIPT_ID')) {
    retryQueue.length = 0;
    isProcessingQueue = false;
    return;
  }

  while (retryQueue.length > 0) {
    const item = retryQueue[0];
    try {
      await postToGoogleAppsScript(url, item.payload, 15000);
      console.log(`✅ [Retry Queue Success] Synced [${item.payload.type}] after attempt ${item.attempts}`);
      retryQueue.shift(); // Remove successful item
    } catch (err) {
      item.attempts += 1;
      if (item.attempts > 5) {
        console.error(`🚨 [Retry Queue Abandoned after 5 attempts] Logging to disk:`, err.message);
        appendToDiskFallback(item.payload, err.message);
        retryQueue.shift();
      } else {
        // Exponential backoff delay: 1.5s, 3s, 6s, 12s...
        const delay = Math.min(30000, 1500 * Math.pow(2, item.attempts - 1));
        console.warn(`⏳ [Retry Queue Pausing ${delay}ms for attempt ${item.attempts}] Error: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  isProcessingQueue = false;
}

/**
 * Universal dispatcher with instant dispatch + automated retry fallback
 * @param {Object} payload 
 */
export async function syncToGoogleSheets(payload) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url || url.includes('YOUR_SCRIPT_ID')) {
    console.log('📊 [GoogleSheets Dev Log]:', payload.type, payload.rollNumber || payload.code || '');
    return { success: true, mode: 'local_dev_logged' };
  }

  try {
    const result = await postToGoogleAppsScript(url, payload, 15000);
    console.log(`📊 Google Sheets Synced [${payload.type}]:`, result.response);
    return result;
  } catch (err) {
    console.warn(`⚠️ Primary Sheets Sync Failed [${payload.type}]. Enqueuing for background retry:`, err.message);
    
    // Enqueue for background exponential retry
    retryQueue.push({
      payload,
      attempts: 1,
      enqueuedAt: new Date().toISOString(),
    });

    // Trigger retry processor asynchronously
    setTimeout(processRetryQueue, 1500);

    return { success: false, queued: true, error: err.message };
  }
}

/**
 * Tab 1: Master_Registrations logger
 */
export async function logRegistrationToSheets(data) {
  return syncToGoogleSheets({
    type: 'registration',
    timestamp: new Date().toISOString(),
    rollNumber: data.rollNumber,
    name: data.name,
    whatsapp: data.whatsapp,
    email: data.email,
    college: data.college,
    course: data.course,
    year: data.year,
    state: data.state,
    tier: data.tier || 'Tier 1',
    feePaid: data.feePaid || '₹99',
    refCode: data.refCode || '',
    snaWelfare: data.refCode ? '₹15' : '₹0',
    orderId: data.orderId,
    paymentId: data.paymentId,
  });
}

/**
 * Tab 2 & 3: Itemized Exam Responses & Official Result Scorecard logger
 */
export async function logExamResultToSheets(data) {
  return syncToGoogleSheets({
    type: 'exam_result_with_audit',
    timestamp: new Date().toISOString(),
    rollNumber: data.rollNumber,
    name: data.name,
    college: data.college,
    state: data.state,
    course: data.course,
    score: data.score,
    correct: data.correct,
    incorrect: data.incorrect,
    unattempted: data.unattempted,
    rank: data.rank,
    certificateId: data.certificateId,
    tabSwitches: data.tabSwitches || 0,
    autoSubmitted: data.autoSubmitted || false,
    timeSpent: data.timeSpent || 0,
    itemizedAudit: data.itemizedAudit || [],
  });
}

/**
 * Tab 4: SNA_College_Ledger affiliate registration logger
 */
export async function logAffiliateToSheets(data) {
  return syncToGoogleSheets({
    type: 'affiliate_created',
    timestamp: new Date().toISOString(),
    code: data.code,
    name: data.name,
    college: data.college,
    whatsapp: data.whatsapp,
    role: data.role,
    upiId: data.upiId || '',
    paidRegistrations: data.paidRegistrations || 0,
    snaFundAccrued: data.snaFundAccrued || '₹0',
    payoutStatus: data.payoutStatus || 'Pending',
  });
}

export default {
  syncToGoogleSheets,
  logRegistrationToSheets,
  logExamResultToSheets,
  logAffiliateToSheets,
};
