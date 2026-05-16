import { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  GoogleAuthProvider,
  User 
} from 'firebase/auth';
import { getFirebaseAuth, getGoogleProvider } from '@/lib/firebase';
import { setAccessToken, clearAccessToken } from '@/lib/google-drive';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (typeof window === 'undefined') {
      throw new Error('Cannot sign in on the server');
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey || apiKey.includes('your_')) {
      throw new Error('Firebase is not configured. Please update your .env.local file with your actual Firebase keys from the Firebase Console.');
    }

    try {
      const auth = getFirebaseAuth();
      const provider = getGoogleProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Extract and store the Google access token for Drive API access
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
      }
      
      return result.user;
    } catch (error: any) {
      console.error('Google Sign-In Error:', error.code, error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      clearAccessToken();
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return {
    user,
    loading,
    signInWithGoogle,
    logout,
  };
}
