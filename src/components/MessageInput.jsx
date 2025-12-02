import React, { useState } from 'react'
import { db } from '../firebase'
import { addDoc, serverTimestamp, collection, updateDoc, doc } from 'firebase/firestore'
import metrics from '../metrics'

export default function MessageInput({ user, channel, replyTarget, setReplyTarget }){
  const [text, setText] = useState('')

  const send = async () => {
    if(!text.trim()) return
    if(!channel){
      alert('Please select a channel first')
      return
    }
    try{
      // Store messages as a subcollection under the selected channel
      const clientSentAt = Date.now()
      const payload = {
        text: text.trim(),
        uid: user.uid,
        username: user.displayName || 'Anonymous',
        clientSentAt,
        createdAt: serverTimestamp(),
      }
      if(replyTarget){
        payload.replyTo = { id: replyTarget.id, username: replyTarget.username, text: replyTarget.text }
      }
      const ref = await addDoc(collection(db, 'channels', channel, 'messages'), payload)
      // register pending message to measure offline sync
      metrics.registerPendingMessage(ref.id, { clientSentAt, channelId: channel, uid: user.uid })
      // Update channel's lastMessageAt so channels can be ordered by activity.
      // This update will also be queued while offline.
      try{
        await updateDoc(doc(db, 'channels', channel), { lastMessageAt: serverTimestamp() })
      }catch(e){
        // non-fatal (channel doc might not exist yet); log and continue
        console.warn('Failed to update channel lastMessageAt', e)
      }
      setText('')
      if(setReplyTarget) setReplyTarget(null)
    }catch(e){
      console.error('Failed to send message', e)
      metrics.logMetric('send_failure', { error: e.message, channel })
    }
  }

  return (
    <div className="message-input">
      {replyTarget ? (
        <div style={{padding:8,background:'rgba(255,255,255,0.02)',borderRadius:8,marginBottom:8}}>
          Replying to <strong>{replyTarget.username}</strong>: <span style={{opacity:0.9}}>{replyTarget.text.length>80?replyTarget.text.substring(0,77)+'...':replyTarget.text}</span>
          <button style={{marginLeft:8}} onClick={()=>setReplyTarget && setReplyTarget(null)}>Cancel</button>
        </div>
      ) : null}
      <input
        value={text}
        onChange={e=>setText(e.target.value)}
        onKeyDown={e=>{ if(e.key === 'Enter'){ send() } }}
        placeholder="Type a message and press Enter"
      />
      <button onClick={send}>Send</button>
    </div>
  )
}
