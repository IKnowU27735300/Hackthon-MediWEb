import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  terminate, 
  clearIndexedDbPersistence,
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC54guTb0WrnofHywIsh5GTWee0tmfDEGA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "aiattendance-9ca58.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://aiattendance-9ca58-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "aiattendance-9ca58",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "aiattendance-9ca58.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "609262233779",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:609262233779:web:37c775542953637075a8c6",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-RM6H9WJNGV"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// FORCED FIX FOR "ID: ca9 / b815":
// 1. Force Long Polling (Disables WebSockets which have the assertion bug)
// 2. Disable Persistence (Stop loading the corrupted local state)
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, 
  // Disable persistence temporarily to clear the "Unexpected State"
  // We will re-enable it once your browser is stabilized.
});

// Clear any corrupted state once on startup
if (typeof window !== "undefined") {
  clearIndexedDbPersistence(db).catch((err) => {
    console.warn("Firestore: Persistence already cleared or not supported", err);
  });
}

// Analytics 
let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) analytics = getAnalytics(app);
  });
}

export { app, auth, db, analytics };
