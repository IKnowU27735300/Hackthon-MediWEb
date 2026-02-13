"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, User, ArrowRight, X, Lock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MediWebLogo } from '@/components/MediWebLogo';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function LandingPage() {
  // Staff Gate State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  
  // Patient Clinic Selection State
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [clinics, setClinics] = useState<any[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(false);
  
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const handleStaffAccess = () => {
    setShowPasswordModal(true);
  };

  const handlePatientAccess = async () => {
    setShowClinicModal(true);
    setLoadingClinics(true);
    try {
      // Fetch all doctors/clinics for the patient to choose from
      const q = query(collection(db, 'businesses'), where('role', '==', 'doctor'));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClinics(list);
    } catch (err) {
      console.error("Failed to fetch clinics", err);
    } finally {
      setLoadingClinics(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin' || password === '1234') {
      router.push('/login');
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 bg-theme">
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

       {/* Background */}
       <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{ 
          backgroundImage: `url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2000')`,
          filter: 'grayscale(100%) contrast(1.2)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-transparent z-0" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 max-w-4xl w-full px-6 flex flex-col items-center"
      >
        <MediWebLogo className="w-32 h-32 mb-8 text-primary-500 dark:text-white" />
        
        <h1 className="text-6xl font-extrabold tracking-tighter mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-primary-400 to-primary-200 dark:from-white dark:via-gray-200 dark:to-gray-400">
          MEDIWEB
        </h1>
        <p className="text-xl text-muted mb-12 uppercase tracking-[0.3em] font-light text-center">
          Advanced Clinical Operations Ecosystem
        </p>

        <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Patient Option */}
          <button onClick={handlePatientAccess} className="group text-left w-full h-full">
            <div className="h-full glass-card p-8 flex flex-col items-center text-center cursor-pointer group-hover:-translate-y-1 duration-300">
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-6 group-hover:bg-blue-500/20 transition-colors">
                <User size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Patient Access</h2>
              <p className="text-sm text-muted mb-6 leading-relaxed">
                Find your clinic, book appointments, and access secure medical chats.
              </p>
              <span className="flex items-center gap-2 text-blue-500 text-sm font-bold uppercase tracking-widest group-hover:gap-3 transition-all">
                Find My Clinic <ArrowRight size={16} />
              </span>
            </div>
          </button>

          {/* Staff Option */}
          <button onClick={handleStaffAccess} className="group text-left w-full h-full"> 
            <div className="h-full glass-card p-8 flex flex-col items-center text-center cursor-pointer group-hover:-translate-y-1 duration-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-primary-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center text-primary-500 mb-6 group-hover:bg-primary-500/20 transition-colors z-10">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2 z-10">Clinical Staff</h2>
              <p className="text-sm text-muted mb-6 leading-relaxed z-10">
                Secure gateway for Doctors, Assistants, and Inventory Managers.
              </p>
              <span className="flex items-center gap-2 text-primary-500 text-sm font-bold uppercase tracking-widest group-hover:gap-3 transition-all z-10">
                Staff Login <ArrowRight size={16} />
              </span>
            </div>
          </button>
        </div>

        <div className="mt-16 flex items-center gap-4 opacity-30">
           <div className="h-[1px] w-12 bg-current"></div>
           <span className="text-[10px] uppercase tracking-widest font-mono">System Status: Operational</span>
           <div className="h-[1px] w-12 bg-current"></div>
        </div>
      </motion.div>

      {/* Password Modal (Staff) */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 dark:bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm glass-card p-8 relative"
            >
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-4 right-4 text-muted hover:text-current transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-500">
                  <Lock size={20} />
                </div>
                <h3 className="text-xl font-bold mb-1">Gateway Access</h3>
                <p className="text-xs text-muted uppercase tracking-widest">Authorized Personnel Only</p>
              </div>

              <form onSubmit={handlePasswordSubmit}>
                <div className="mb-6 relative">
                  <input 
                    type="password"
                    autoFocus
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(false);
                    }}
                    placeholder="Enter Access Code"
                    className={`glass-input text-center tracking-widest ${error ? 'border-red-500/50 text-red-500' : ''}`}
                  />
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-red-500 font-bold uppercase"
                    >
                      Invalid Access Code
                    </motion.p>
                  )}
                </div>

                <button 
                  type="submit"
                  className="w-full glass-button uppercase tracking-widest text-xs"
                >
                  Verify Access
                </button>
              </form>
              
              <div className="mt-4 text-center">
                 <p className="text-[10px] text-muted font-mono">Hint: admin</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clinic/Doctor Selection Modal (Patient) */}
      <AnimatePresence>
        {showClinicModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 dark:bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-card p-8 relative max-h-[80vh] flex flex-col"
            >
              <button 
                onClick={() => setShowClinicModal(false)}
                className="absolute top-4 right-4 text-muted hover:text-current transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6 flex-shrink-0">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                  <MapPin size={24} />
                </div>
                <h3 className="text-xl font-bold mb-1">Select Clinic</h3>
                <p className="text-xs text-muted uppercase tracking-widest">Connect with your doctor</p>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3 min-h-[200px]">
                {loadingClinics ? (
                  <div className="text-center py-10 text-muted animate-pulse">
                    Searching for nearby clinics...
                  </div>
                ) : clinics.length > 0 ? (
                  clinics.map((clinic) => (
                    <Link key={clinic.id} href={`/patient-form/${clinic.id}`}>
                      <div className="p-4 bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 rounded-xl hover:bg-blue-500/5 dark:hover:bg-blue-500/10 hover:border-blue-500/50 transition-all cursor-pointer group mb-3">
                         <div className="flex items-center justify-between">
                            <span className="font-bold group-hover:text-blue-500 transition-colors">
                              {clinic.displayName || "Medical Practice"}
                            </span>
                            <ArrowRight size={14} className="text-muted group-hover:translate-x-1 group-hover:text-blue-500 transition-all"/>
                         </div>
                         <div className="text-xs text-muted flex items-center gap-2 mt-1">
                            <MapPin size={10} />
                            {clinic.location || "Online"}
                         </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted">
                    <p>No active public clinics found.</p>
                    <Link href="/patient-form/demo-clinic" className="text-blue-500 text-xs mt-2 hover:underline block">
                      Try Demo Clinic
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
