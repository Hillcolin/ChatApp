import React, { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore'

export default function ChannelList({ user, selectedChannel, onSelect }){
  const [channels, setChannels] = useState([])
  const [newName, setNewName] = useState('')

  useEffect(()=>{
    const q = query(collection(db, 'channels'), orderBy('name'))
    const unsub = onSnapshot(q, snap => {
      setChannels(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [])

  const createChannel = async () => {
    const name = newName.trim()
    if(!name) return
    try{
      const payload = { name }
      if(user?.uid) payload.createdBy = user.uid
      if(user?.email) payload.members = [user.email]
      payload.createdAt = serverTimestamp()
      await addDoc(collection(db, 'channels'), payload)
      setNewName('')
    }catch(e){
      console.error('Failed to create channel', e)
      alert('Failed to create channel: ' + e.message)
    }
  }


  return (
    <aside className="channel-list">
      <h3>Channels</h3>
      <ul>
        {channels.map(c => (
          <li key={c.id} className={c.id === selectedChannel ? 'selected' : ''}>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <button onClick={()=>onSelect(c.id)} style={{flex:1, textAlign:'left'}}>
                <span className="channel-name">{c.name}</span>
              </button>
              {/* add-member UI removed */}
            </div>
          </li>
        ))}
      </ul>

      <div className="new-channel">
        <input placeholder="New channel" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') createChannel() }} />
      </div>
    </aside>
  )
}
