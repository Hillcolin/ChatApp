import React, { useState } from 'react'
import { signInWithGoogle } from '../firebase'
import MessageCountVisualization from './MessageCountVisualization'

export default function Auth(){
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const onGoogle = async () => {
    try{
      setLoading(true)
      setError(null)
      await signInWithGoogle()
    }catch(e){
      console.error('Google sign-in failed', e)
      setError(e.message || 'Sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <h2>Welcome to ChatApp</h2>
      <p>Please sign in to continue. Use Google to sign in.</p>

      <div style={{marginTop:24,marginBottom:24}}>
        <MessageCountVisualization />
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(242, 113, 113, 0.2)',
          color: '#f2b3b3',
          padding: '10px 12px',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '13px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      <div style={{display:'flex',gap:8,justifyContent:'center'}}>
        <button onClick={onGoogle} disabled={loading} style={{opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer'}}>
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>


    </div>
  )
}
