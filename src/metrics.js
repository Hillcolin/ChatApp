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

    // Try to compute three useful metrics when possible:
    // - sendToServerMs: how long the sender took to reach the server (serverTs - clientSentAt)
    // - serverToReceiveMs: how long between server write and this client's receipt (now - serverTs)
    // - totalMs: end-to-end from client send to this client's receipt (now - clientSentAt)
    let serverMillis = null
    let clientMillis = null
    try{
      if(message.createdAt && typeof message.createdAt.toMillis === 'function'){
        serverMillis = message.createdAt.toMillis()
      }
    }catch(e){ /* ignore */ }
    try{
      if(typeof message.clientSentAt === 'number') clientMillis = message.clientSentAt
      else if(message.clientSentAt && typeof message.clientSentAt.toMillis === 'function') clientMillis = message.clientSentAt.toMillis()
    }catch(e){ /* ignore */ }

    const results = {}
    if(clientMillis != null && serverMillis != null){
      const sendToServerMs = serverMillis - clientMillis
      const serverToReceiveMs = now - serverMillis
      const totalMs = now - clientMillis
      // sanity checks
      if(sendToServerMs < 0 || sendToServerMs > 24 * 3600 * 1000) return
      if(serverToReceiveMs < 0 || serverToReceiveMs > 24 * 3600 * 1000) return
      if(totalMs < 0 || totalMs > 24 * 3600 * 1000) return
      results.sendToServerMs = sendToServerMs
      results.serverToReceiveMs = serverToReceiveMs
      results.totalMs = totalMs
    }else if(clientMillis != null){
      const totalMs = now - clientMillis
      if(totalMs < 0 || totalMs > 24 * 3600 * 1000) return
      results.totalMs = totalMs
    }else if(serverMillis != null){
      const serverToReceiveMs = now - serverMillis
      if(serverToReceiveMs < 0 || serverToReceiveMs > 24 * 3600 * 1000) return
      results.serverToReceiveMs = serverToReceiveMs
    }else{
      return // nothing measurable
    }

    // Attach some context and write via logMetric (non-blocking wrapper)
    try{
      await logMetric('message_latency', { messageId: message.id, senderUid: message.uid, receiverUid, channelId: message.channelId || null, ...results })
      try{ recordedLatency.set(message.id, Date.now()) }catch(e){}
    }catch(e){
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
