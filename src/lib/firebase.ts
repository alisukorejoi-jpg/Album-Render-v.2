import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCRQ6ydX5kgkfDlqJ3diDlCr_eORZNzfpY",
  authDomain: "gen-lang-client-0113721820.firebaseapp.com",
  projectId: "gen-lang-client-0113721820",
  storageBucket: "gen-lang-client-0113721820.firebasestorage.app",
  messagingSenderId: "88860378544",
  appId: "1:88860378544:web:107b2e71aadd59d51d0275"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = getFirestore(app, "ai-studio-albumrenderv2-2123d097-4d23-43b8-ad18-907b7c1045e1");
