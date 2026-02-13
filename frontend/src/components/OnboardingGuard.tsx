"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export function OnboardingGuard() {
  const { user, loading, isProfileComplete, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    
    // 1. Define Public Routes (No Auth Required)
    const isPublicRoute = 
      pathname === '/' || 
      pathname === '/login' || 
      pathname === '/signup' || 
      pathname?.startsWith('/patient-');

    // 2. Protected Route Logic
    if (!isPublicRoute) {
      if (!user) {
        // If trying to access private route without login -> Login
        router.push('/login');
        return;
      }
      
      // If user is logged in, check profile completion
      if (!isProfileComplete && pathname !== '/onboarding') {
        // Only redirect doctors (business owners) to onboarding setup
        // Assistants and Suppliers are added to existing businesses, so they don't need to create a workspace
        if (role === 'doctor') {
          router.push('/onboarding');
          return;
        }
      }
    }

    // 3. Auth Redirect Logic (If already logged in)
    if (user && isProfileComplete) {
      // If user visits Login or Landing while authenticated -> Dashboard
      if (pathname === '/login') {
        router.push('/dashboard');
      }
      // Note: We might allow visiting '/' (Landing) even if logged in, 
      // or redirect to dashboard. Usually for staff, redirecting to dashboard is better.
      // But let's allow '/' for now in case they want to see the landing page options.
      // Actually, user said: "when clicked on overview... it taking tot he main login web... it should be doctors dashboard"
      // This implies they don't want to see '/' when they are working.
      // So let's redirect '/' to '/dashboard' if logged in?
      // No, they specifically said "Overview link" was taking them there.
      // Only redirect /login.
    }

  }, [user, loading, isProfileComplete, pathname, router]);

  return null;
}
