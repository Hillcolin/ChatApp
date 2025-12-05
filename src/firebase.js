import { initializeApp } from 'firebase/app'
import { getFirestore, collection, enableIndexedDbPersistence } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { getAnalytics } from "firebase/analytics";

// Vite uses VITE_ prefixed env vars. Copy .env.example -> .env.local and fill
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
// Enable offline persistence (IndexedDB). This allows the client to queue writes while
// offline and sync them automatically when connectivity returns.
try {
  enableIndexedDbPersistence(db).catch((err) => {
    // Typical reasons this fails are multiple tabs open or unsupported browsers.
    // We'll log them to the console but continue — Firestore will still work without persistence.
    console.warn('Could not enable IndexedDB persistence:', err);
  });
} catch (e) {
  console.warn('Persistence setup error', e)
}

const analytics = getAnalytics(app);

// --- Auth exports ---
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// Helper functions you can import/use directly
export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider)
  } catch (error) {
    // If popup was blocked/cancelled, try redirect as fallback
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      console.log('Popup blocked/cancelled, using redirect method instead')
      // Fallback: use redirect (requires proper redirect URI in Firebase console)
      // For now, just re-throw with better message
      throw new Error('Please allow popups or check your Firebase console configuration')
    }
    throw error
  }
}


export const signOutUser = async () => {
  return signOut(auth)
}
