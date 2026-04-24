"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

export type UserRole = 'doctor' | 'assistant' | 'supplier';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  businessId: string | null;
  isProfileComplete: boolean;
  displayName: string | null;
  location: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  role: null, 
  businessId: null, 
  isProfileComplete: true, 
  displayName: null,
  location: null,
  loading: true 
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setRole(null);
        setBusinessId(null);
        setDisplayName(null);
        setLocation(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubProfile: (() => void) | null = null;
    
    if (!user?.uid) return;

    const safetyTimeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 10000); // Increased timeout for stability
    
    try {
      const docRef = doc(db, 'businesses', user.uid);
      unsubProfile = onSnapshot(docRef, (snap) => {
        if (!isMounted) return;

        const resolveProfile = async () => {
          let userRole: UserRole = 'doctor';
          let userBusinessId: string = user.uid;
          let profileDisplayName: string | null = null;
          let profileLocation: string | null = null;
          let profileComplete = false;

          if (snap.exists()) {
            const data = snap.data();
            userRole = (data.role as UserRole) || 'doctor';
            profileDisplayName = data.displayName || null;
            profileLocation = data.location || null;
            profileComplete = !!data.profileCompleted;
            
            if (userRole === 'assistant' && data.businessId) {
              userBusinessId = data.businessId;
            }
          }
          
          if (isMounted) {
            setRole(userRole);
            setBusinessId(userBusinessId);
            setIsProfileComplete(profileComplete);
            setDisplayName(profileDisplayName);
            setLocation(profileLocation);
            setLoading(false);
            clearTimeout(safetyTimeout);
          }
        };

        resolveProfile();
      }, (err) => {
        console.error("Critical: Profile stream interrupted", err);
        if (isMounted) setLoading(false);
      });
    } catch (err) {
      console.error("Firestore initialization failed", err);
    }

    return () => {
      isMounted = false;
      if (unsubProfile) unsubProfile();
      clearTimeout(safetyTimeout);
    };
  }, [user?.uid]); // Only re-run if UID actually changes

  // Network Heartbeat: Keep user activity updated
  useEffect(() => {
    let isMounted = true;
    let lastUpdate = 0;
    if (!user) return;
    
    // Throttled update to avoid ID: ca9 / b815 assertion loops
    const updateActivity = async () => {
      const now = Date.now();
      if (!isMounted || (now - lastUpdate < 60000)) return; // Max once per minute
      
      try {
        const userRef = doc(db, 'businesses', user.uid);
        await setDoc(userRef, { 
          lastActive: serverTimestamp(),
          status: 'online' 
        }, { merge: true });
        lastUpdate = Date.now();
      } catch (err) {
        console.warn("Heartbeat update skipped:", err);
      }
    };
    
    // Delay first update slightly to avoid conflict with initial profile resolution
    const initialDelay = setTimeout(updateActivity, 2000);

    // Heartbeat every 2 minutes
    const interval = setInterval(updateActivity, 120000);
    
    return () => {
      isMounted = false;
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [user?.uid]); // Use uid as stable dependency

  return (
    <AuthContext.Provider value={{ user, role, businessId, isProfileComplete, displayName, location, loading }}>
        {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
