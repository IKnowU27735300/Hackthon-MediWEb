"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Chrome,
  AlertCircle,
  Loader2,
  User,
  Users,
  Package,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { HeartbeatLoader } from '@/components/HeartbeatLoader';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProfileModal } from '@/components/ProfileModal';
import { MediWebLogo } from '@/components/MediWebLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'assistant' | 'supplier'>('doctor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch existing profile to check role
      const profileRef = doc(db, 'businesses', result.user.uid);
      const profileSnap = await getDoc(profileRef);
      const existingData = profileSnap.data();

      // Only update role if it doesn't exist or if explicitly changing owner role
      // This prevents assistants from accidentally promoting themselves to doctors
      if (!existingData?.role || existingData.role === 'doctor') {
        await setDoc(profileRef, {
          role: selectedRole,
          updatedAt: new Date()
        }, { merge: true });
      }
      
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to login.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      await setDoc(doc(db, 'businesses', result.user.uid), {
        role: selectedRole,
        googleAccountEmail: result.user.email,
        googleAccessToken: accessToken,
        updatedAt: new Date()
      }, { merge: true });
      router.push('/dashboard');
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError(err.message || "Failed to login with Google.");
      setLoading(false);
    }
  };

  const handleSignupClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowSignupModal(true);
  };

  const roles = [
    { id: 'doctor', label: 'Doctor', icon: <User size={20} /> },
    { id: 'assistant', label: 'Clinical Team', icon: <Users size={20} /> },
    { id: 'supplier', label: 'Supplies', icon: <Package size={20} /> }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <HeartbeatLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500 bg-theme">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={toggleTheme}
          className="p-3 rounded-xl bg-theme-muted hover:bg-primary-500/10 border border-theme transition-all text-muted hover:text-primary-600 shadow-lg backdrop-blur-md"
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} className="text-primary-600" />}
        </button>
      </div>
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
        style={{ 
          backgroundImage: `url('https://images.unsplash.com/photo-1615461066841-6116ecaaba74?auto=format&fit=crop&q=80&w=2000')`,
          filter: theme === 'dark' ? 'brightness(0.15) contrast(1.1) grayscale(0.8)' : 'brightness(1.1) contrast(0.9) grayscale(0.2) opacity(0.3)'
        }}
      />
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-600/10 rounded-full blur-[120px] z-0" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        <Link 
          href="/" 
          className="absolute -top-12 left-0 flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs uppercase font-bold tracking-widest"
        >
          <ArrowRight className="rotate-180" size={16} /> Back to Home
        </Link>

        <div className="text-center mb-8">
          <MediWebLogo className="w-20 h-20 mx-auto mb-6 text-primary-500" />
          <h1 className="text-4xl font-extrabold tracking-tighter mb-2 bg-gradient-to-b from-white via-primary-200 to-primary-500 bg-clip-text text-transparent italic">MEDIWEB</h1>
          <p className="text-primary-200/40 text-xs font-bold uppercase tracking-[0.2em]">Secure Clinical Gateway</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRole(r.id as any)}
              className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                selectedRole === r.id 
                ? 'bg-primary-600 border-primary-500 shadow-xl shadow-primary-950/40 text-white dark:text-black' 
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-muted hover:text-primary-400'
              }`}
            >
              <div className={selectedRole === r.id ? 'text-white dark:text-black' : 'text-primary-400'}>{r.icon}</div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest">{r.label}</span>
            </button>
          ))}
        </div>

        <div className="glass-card p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-500 dark:text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted ml-1">Secure Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500/30" size={18} />
                <input 
                   type="email" 
                   required
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   placeholder="name@clinic.com" 
                   className="glass-input pl-12 pr-4 py-3.5 text-sm" 
                 />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold uppercase tracking-widest text-muted">Credential</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500/30" size={18} />
                <input 
                   type="password" 
                   required
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   placeholder="••••••••" 
                   className="glass-input pl-12 pr-4 py-3.5 text-sm" 
                 />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full glass-button mt-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : (
                <>
                  Access {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Portal
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <p className="mt-4 text-center text-xs text-muted">
              Don't have an account?{' '}
              <button 
                type="button"
                onClick={handleSignupClick}
                className="text-primary-500 hover:text-primary-400 font-bold transition-colors underline decoration-primary-500/30 underline-offset-4"
              >
                Sign up
              </button>
            </p>
          </form>

          <div className="relative my-8 text-center">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-theme-muted"></div>
            <span className="relative bg-white dark:bg-black px-4 text-[10px] uppercase font-bold tracking-[0.2em] text-muted">authorized access only</span>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 p-3.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all font-bold text-xs disabled:opacity-50 uppercase tracking-widest text-muted"
            >
              <Chrome size={18} />
              Continue with SSO
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] text-muted font-bold uppercase tracking-widest">
          High-Security Clinical Infrastructure
        </p>
      </motion.div>

      <AnimatePresence>
        {showSignupModal && (
          <ProfileModal 
            isSignup 
            role={selectedRole}
            onComplete={() => {
              setShowSignupModal(false);
              router.push('/dashboard'); // Already updated to dashboard in previous step
            }}
            onClose={() => setShowSignupModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
