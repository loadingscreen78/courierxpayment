import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase project config — API key is the testing token provided
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AdrTqXEkMGVg2dREOORQTZatYoTGHj-G3PLg2rcvwbfbw_OYC1ObvZhgF1gxl6PTRo14KTOKbJ-my_tAm4ccAvPAs0KHzEd_iNI3Ra0h7ryM2iO39WWm0B_XUOe7aS86xcr0DLNNfPY5p_uVac0bzBmEZwth',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Prevent duplicate app initialization in Next.js hot-reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
export default app;
