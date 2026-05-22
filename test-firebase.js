import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    console.log("Writing to trips/test1234...");
    await setDoc(doc(db, 'trips', 'test1234'), { title: 'Test Trip' });
    console.log("Write success!");
    
    console.log("Reading from trips/test1234...");
    const snap = await getDoc(doc(db, 'trips', 'test1234'));
    console.log("Read success! Data:", snap.data());
  } catch (err) {
    console.error("Firebase Error:", err);
  }
}

test();
