import { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { getFirebaseAuth, getGoogleProvider } from '@/lib/firebase';

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
