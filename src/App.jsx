import React, { useEffect, useState } from 'react'
import ChatWindow from './components/ChatWindow'
import MessageInput from './components/MessageInput'
import Auth from './components/Auth'
import ChannelList from './components/ChannelList'
import { auth, signOutUser } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import metrics from './metrics'

export default function App(){
  const [user, setUser] = useState(null)
  const [channel, setChannel] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [replyTarget, setReplyTarget] = useState(null)

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, (u)=>{
      setUser(u)
      // Log auth state changes for metrics
      if(u) metrics.logMetric('auth_signin', { uid: u.uid, provider: u.providerId || null })
    })
    return ()=>unsub()
  }, [])

  useEffect(()=>{
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if(!user){
    return <Auth />
  }

  return (
    <div className="app-root" style={{display:'grid',gridTemplateColumns:'220px 1fr',height:'100vh'}}>
      <ChannelList user={user} selectedChannel={channel} onSelect={setChannel} />

        <div className="main-column">
        <header>
          <h1>ChatApp</h1>
          <div className="user-info">Signed in as <strong>{user.displayName || 'Anonymous'}</strong>
            <span style={{marginLeft:12, color: isOnline ? '#9be7a0' : '#f2b3b3'}}>{isOnline ? 'online' : 'offline'}</span>
            <button style={{marginLeft:12}} onClick={()=>signOutUser()}>Sign out</button>
          </div>
        </header>

        <main style={{flex:1,overflow:'hidden',padding:10}}>
          {channel ? (
            <ChatWindow user={user} channel={channel} onReply={m=>setReplyTarget(m)} />
          ) : (
            <div style={{padding:20}}>Select or create a channel to start chatting.</div>
          )}
        </main>

        <footer style={{padding:8}}>
          <MessageInput user={user} channel={channel} replyTarget={replyTarget} setReplyTarget={setReplyTarget} />
        </footer>
      </div>
    </div>
  )
}
