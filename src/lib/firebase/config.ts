import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC-9bkWepX01heOwJPul9d83W457mc7WI0",
  authDomain: "courierx-in.firebaseapp.com",
  projectId: "courierx-in",
  storageBucket: "courierx-in.firebasestorage.app",
  messagingSenderId: "8149726702",
  appId: "1:8149726702:web:179e5ef37b8af603a98aff",
  measurementId: "G-HWDRSVXGYF",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
export default app;
