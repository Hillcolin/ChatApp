import { db } from './firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

const metricsCol = collection(db, 'metrics')

const pendingMessages = new Map()
// Track which message IDs we've already recorded latency for so we only write one metric per message.
const recordedLatency = new Map() // messageId -> timestampRecorded

// Periodically prune recordedLatency entries older than RECORDED_TTL_MS to avoid unbounded growth.
// Keep a longer window (1 hour) so we don't re-log for messages that take longer to arrive.
const RECORDED_TTL_MS = 60 * 60 * 1000 // 1 hour
setInterval(() => {
  const now = Date.now()
  for (const [id, ts] of recordedLatency.entries()){
    if (now - ts > RECORDED_TTL_MS) recordedLatency.delete(id)
  }
}, 60 * 1000)

export async function logMetric(type, details = {}){
  try{
    await addDoc(metricsCol, {
      type,
      details,
      ts: serverTimestamp(),
      clientTs: Date.now()
    })
  }catch(e){
    // metrics should never block app behavior; just log locally
    console.warn('Failed to write metric', e)
  }
}

// Register a message that we've just sent so we can later measure how long it
// took to sync (useful for offline testing). id should be the message doc id.
export function registerPendingMessage(id, { clientSentAt, channelId, uid }){
  if(!id) return
  pendingMessages.set(id, { clientSentAt, channelId, uid })
}

// Called when a message is observed to have completed syncing (no pending writes)
export function markMessageSynced(id){
  const entry = pendingMessages.get(id)
  if(!entry) return
  const now = Date.now()
  const durationMs = entry.clientSentAt ? (now - entry.clientSentAt) : null
  logMetric('offline_sync', { messageId: id, channelId: entry.channelId, uid: entry.uid, durationMs })
  pendingMessages.delete(id)
}

// Record incoming message latency (time between sender clientTs and receive time)
export async function recordIncomingMessageLatency(message, receiverUid){
  try{
    if(!message) return
    if(!message.id) return
    if(message.uid === receiverUid) return // don't measure to self
    // If we've already recorded latency for this message id, skip (dedupe across snapshots)
    if(recordedLatency.has(message.id)) return

    const now = Date.now()

    // Prefer server-based timestamp if available (more robust than relying on client clocks).
    // `createdAt` is a Firestore Timestamp with `.toMillis()` when resolved.
    let latencyMs = null
    try{
      if(message.createdAt && typeof message.createdAt.toMillis === 'function'){
        const serverMillis = message.createdAt.toMillis()
        latencyMs = now - serverMillis
      }else if(message.clientSentAt){
        // fallback to sender-provided clientSentAt
        latencyMs = now - message.clientSentAt
      } else {
        return // nothing to measure
      }
    }catch(e){
      // if something goes wrong computing, bail out
      return
    }

    // sanity-check the result: ignore negatives or implausibly large values (> 1 day)
    if(typeof latencyMs !== 'number' || latencyMs < 0 || latencyMs > 24 * 3600 * 1000) return
    // Only record the end result (latency in ms) to the metrics collection.
    // This avoids storing extra fields unrelated to the timing result.
    try{
      await addDoc(metricsCol, {
        type: 'message_latency',
        latencyMs,
        ts: serverTimestamp(),
        clientTs: now
      })
      // Mark as recorded so subsequent snapshots don't create duplicates
      try{ recordedLatency.set(message.id, Date.now()) }catch(e){}
    }catch(e){
      // fallback to non-blocking console warning if metric write fails
      console.warn('Failed to write message_latency metric', e)
    }
  }catch(e){
    console.warn('Latency metric failed', e)
  }
}

export default {
  logMetric,
  registerPendingMessage,
  markMessageSynced,
  recordIncomingMessageLatency
}
