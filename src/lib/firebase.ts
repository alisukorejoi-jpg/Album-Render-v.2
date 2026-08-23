import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDzc26l4X8Q5KSQCuhJBGsUM-ZaCtPTsis",
  authDomain: "fine-discovery-207pf.firebaseapp.com",
  projectId: "fine-discovery-207pf",
  storageBucket: "fine-discovery-207pf.firebasestorage.app",
  messagingSenderId: "319489128703",
  appId: "1:319489128703:web:05c29729a5f565a06eb4ca"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = getFirestore(app, "ai-studio-albumrender-3f384196-7978-4d70-86c2-f82d21417efe");
