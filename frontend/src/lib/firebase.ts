import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  terminate, 
  clearIndexedDbPersistence,
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyC54guTb0WrnofHywIsh5GTWee0tmfDEGA",
  authDomain: "aiattendance-9ca58.firebaseapp.com",
  databaseURL: "https://aiattendance-9ca58-default-rtdb.firebaseio.com",
  projectId: "aiattendance-9ca58",
  storageBucket: "aiattendance-9ca58.firebasestorage.app",
  messagingSenderId: "609262233779",
  appId: "1:609262233779:web:37c775542953637075a8c6",
  measurementId: "G-RM6H9WJNGV"
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
