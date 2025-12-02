import React, { useEffect, useState, useRef } from 'react'
import { db } from '../firebase'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore'
import metrics from '../metrics'

export default function ChatWindow({ user, channel, onReply }){
  const [messages, setMessages] = useState([])
  const bottomRef = useRef(null)
  const [editingId, setEditingId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [openOptionsId, setOpenOptionsId] = useState(null)

  useEffect(()=>{
    if(!channel) return
    // Query messages from the channel's messages subcollection
    const q = query(collection(db, 'channels', channel, 'messages'), orderBy('createdAt'))
    // Track when we started the listener so we can measure initial server-delivered latency
    const listenerStart = { t: performance.now() }
    const unsub = onSnapshot(q, (snapshot)=>{
      // Include pending-writes metadata so we can show a "sending..." indicator
      const arr = snapshot.docs.map(d => ({ id: d.id, ...d.data(), _pending: d.metadata.hasPendingWrites }))
      // detect transitions for pending -> committed for our own messages
      arr.forEach(m => {
        if(m._pending === false){
          // mark synced if we previously registered this message as pending
          metrics.markMessageSynced(m.id)
          // measure incoming latency when other clients send messages with client timestamp
          // only measure when the message no longer has pending writes (committed)
          metrics.recordIncomingMessageLatency(m, user?.uid)
        }
      })

      // If the listener was just started, measure the time until the first server-backed snapshot.
      // `snapshot.metadata.fromCache === false` indicates data came from the backend rather than local cache.
      try{
        if(listenerStart.t && snapshot && snapshot.metadata && snapshot.metadata.fromCache === false){
          const now = performance.now()
          const latencyMs = Math.round(now - listenerStart.t)
          metrics.logMetric('realtime_listener_initial', { channel, latencyMs })
          // Prevent logging again for this listener instance
          listenerStart.t = null
        }
      }catch(e){ /* don't let metrics break UI */ }
      setMessages(arr)
    })
    return ()=>unsub()
  }, [channel])

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close options when clicking outside
  const onMessagesClick = () => setOpenOptionsId(null)

  const saveEdit = async (id) => {
    if(!editingText.trim()){
      alert('Message cannot be empty')
      return
    }
    try{
      const ref = doc(db, 'channels', channel, 'messages', id)
      await updateDoc(ref, {
        text: editingText.trim(),
        editedAt: serverTimestamp()
      })
      metrics.logMetric('edit_success', { messageId: id, channel })
      setEditingId(null)
      setEditingText('')
    }catch(e){
      console.error('Failed to save edited message', e)
      metrics.logMetric('edit_failure', { messageId: id, channel, error: e.message })
      alert('Failed to save edit: ' + e.message)
    }
  }

  const deleteMessage = async (id) => {
    try{
      const ref = doc(db, 'channels', channel, 'messages', id)
      await deleteDoc(ref)
      metrics.logMetric('delete_success', { messageId: id, channel })
    }catch(e){
      console.error('Failed to delete message', e)
      metrics.logMetric('delete_failure', { messageId: id, channel, error: e.message })
      alert('Failed to delete message: ' + e.message)
    }
  }

  return (
    <div className="chat-window">
    <div className="messages" onClick={onMessagesClick}>
        {messages.map(m => (
          <div key={m.id} className={m.uid === user?.uid ? 'message-row mine' : 'message-row'}>
            <div className="avatar">{m.username ? m.username.charAt(0).toUpperCase() : (m.uid ? m.uid.charAt(0) : '?')}</div>
            <div className="message-body" onContextMenu={(e)=>{ e.preventDefault(); e.stopPropagation(); setOpenOptionsId(openOptionsId===m.id?null:m.id) }}>
              <div className="meta">
                <strong>{m.username || (m.uid ? m.uid.substring(0,6) : 'Unknown')}</strong>
                <span className="time">{m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : ''}</span>
                {m.editedAt ? <span className="edited">edited</span> : null}
                {m._pending ? <span className="pending">sending...</span> : null}
              </div>

              {/* show referenced message if present */}
              {m.replyTo ? (
                <div className="reply-quote">
                  <div className="reply-author">{m.replyTo.username}</div>
                  <div className="reply-text">{m.replyTo.text.length > 140 ? m.replyTo.text.substring(0,137) + '...' : m.replyTo.text}</div>
                </div>
              ) : null}

              {/* editing UI for message owner */}
              {editingId === m.id ? (
                <div className="text">
                  <input
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    onKeyDown={e => { if(e.key === 'Enter'){ saveEdit(m.id) } }}
                    style={{width: '100%', padding: '8px', borderRadius: '6px'}}
                    onClick={e=>e.stopPropagation()}
                  />
                  <div style={{marginTop:6, display:'flex', gap:8}}>
                    <button onClick={(e)=>{ e.stopPropagation(); saveEdit(m.id) }}>Save</button>
                    <button onClick={(e)=>{ e.stopPropagation(); setEditingId(null); setEditingText('') }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text">{m.text}</div>
                  {/* options shown when message is clicked */}
                  {openOptionsId === m.id ? (
                    <div className="message-options" onClick={e=>e.stopPropagation()}>
                      <button onClick={(e)=>{ e.stopPropagation(); onReply && onReply(m); setOpenOptionsId(null) }}>Reply</button>
                      {m.uid === user?.uid ? (
                        <>
                          <button onClick={(e)=>{ e.stopPropagation(); setEditingId(m.id); setEditingText(m.text); setOpenOptionsId(null) }}>Edit</button>
                          <button onClick={(e)=>{ e.stopPropagation(); deleteMessage(m.id); setOpenOptionsId(null) }}>Delete</button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
