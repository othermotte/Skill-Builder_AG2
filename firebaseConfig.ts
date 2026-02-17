
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

/**
 * FIREBASE CONFIGURATION - LEADERSHIP SKILL BUILDER
 * 
 * Configured for project: leadership-skill-builder-7aba5
 */
const firebaseConfig = {
  apiKey: "AIzaSyA4YkAjcsSyjXyi9gCB4q7wMBXi5VoRuK4",
  authDomain: "leadership-skill-builder-7aba5.firebaseapp.com",
  projectId: "leadership-skill-builder-7aba5",
  storageBucket: "leadership-skill-builder-7aba5.firebasestorage.app",
  messagingSenderId: "188511440983",
  appId: "1:188511440983:web:bd30c625c1fb550a909312",
  measurementId: "G-VCNLCTV78H"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/**
 * Initialize Firestore with persistent local cache.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  }),
});
