"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Phone, 
  MapPin, 
  ArrowRight, 
  Loader2, 
  Mail, 
  Lock, 
  AlertCircle,
  X
} from 'lucide-react';
import { updateDoctorProfile } from '@/services/profile';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDocs, collection, query, where } from 'firebase/firestore';

interface ProfileModalProps {
  businessId?: string;
  isSignup?: boolean;
  onComplete: () => void;
  onClose?: () => void;
  role?: 'doctor' | 'assistant' | 'supplier';
}

export function ProfileModal({ businessId, isSignup, onComplete, onClose, role = 'doctor' }: ProfileModalProps) {
  const [formData, setFormData] = useState({
    publicName: '',
    phone: '',
    location: '',
    email: '',
    password: '',
    confirmPassword: '',
    linkedClinicId: '',
    role: (role || 'doctor') as 'doctor' | 'assistant' | 'supplier'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinics, setClinics] = useState<any[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(false);
  
  const isSocialSignup = !!auth.currentUser && isSignup;

  // Sync email if social signup
  React.useEffect(() => {
    if (isSocialSignup && auth.currentUser?.email) {
      setFormData(prev => ({ ...prev, email: auth.currentUser?.email || '' }));
    }
  }, [isSocialSignup]);

  React.useEffect(() => {
    if (formData.role === 'assistant' && isSignup) {
      const fetchClinics = async () => {
        setLoadingClinics(true);
        try {
          const q = query(collection(db, 'businesses'), where('role', '==', 'doctor'));
          const snapshot = await getDocs(q);
          const clinicsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setClinics(clinicsData);
        } catch (err) {
          console.error("Error fetching clinics:", err);
        } finally {
          setLoadingClinics(false);
        }
      };
      fetchClinics();
    }
  }, [formData.role, isSignup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isSocialSignup = auth.currentUser && isSignup;

    if (!isSocialSignup && isSignup && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignup) {
        let uid = auth.currentUser?.uid;
        let email = formData.email || auth.currentUser?.email;

        if (!uid) {
          // Step 1: Create Firebase Auth User (Email/Password Flow)
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          uid = userCredential.user.uid;
          email = formData.email;
        }

        // Step 2: Initialize Business Profile with selected role
        await setDoc(doc(db, 'businesses', uid), {
          role: formData.role,
          displayName: formData.publicName,
          // Only save phone/location if relevant for role
          ...(formData.role === 'doctor' && { businessPhone: formData.phone, location: formData.location }),
          ...(formData.role === 'supplier' && { location: formData.location }),
          ...(formData.role === 'assistant' && { location: formData.location, businessId: formData.linkedClinicId }),
          email: email,
          profileCompleted: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        onComplete();
      } else if (businessId) {
        // Standard profile update flow
        const { email, password, confirmPassword, ...profileUpdate } = formData;
        await updateDoctorProfile(businessId, profileUpdate);
        onComplete();
      }
    } catch (err: any) {
      setError(err.message || "Failed to process request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    if (isSignup) {
      if (formData.role === 'doctor') return "Create Doctor Account";
      if (formData.role === 'assistant') return "Create Clinical Team Account";
      if (formData.role === 'supplier') return "Create Supplier Account";
    }
    return "Complete Profile";
  };

  const getSubtitle = () => {
    if (isSignup) {
      if (formData.role === 'doctor') return "Register your practice on the MediWeb network";
      if (formData.role === 'assistant') return "Join the clinical team";
      if (formData.role === 'supplier') return "Register as an authorized supplier";
    }
    return "These details will be visible on your profile";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md glass-card p-8 border-primary-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)] relative"
      >
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/20 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600/20 text-primary-400 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <User size={32} />
          </div>
          <h2 className="text-2xl font-bold italic tracking-tight text-emerald-400">
            {getTitle()}
          </h2>
          <p className="text-white/40 text-xs uppercase tracking-widest mt-2 px-4">
            {getSubtitle()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {isSignup && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary-400/60 ml-1">Identity Type</label>
              <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                {(['doctor', 'assistant', 'supplier'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFormData({...formData, role: r})}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                      formData.role === r 
                        ? 'bg-primary-600 text-black shadow-lg' 
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2 mb-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div className={`grid ${formData.role === 'doctor' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary-400/60 ml-1">
                 {formData.role === 'doctor' ? 'Clinic Name' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input 
                  required
                  value={formData.publicName}
                  onChange={(e) => setFormData({...formData, publicName: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-primary-500 transition-all text-xs"
                />
              </div>
            </div>

            {formData.role === 'doctor' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary-400/60 ml-1">Public Phone</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-xs font-mono">+91</span>
                  <input 
                    required={formData.role === 'doctor'}
                    type="tel"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({...formData, phone: val});
                    }}
                    placeholder="00000 00000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary-500 transition-all text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {!isSocialSignup && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary-400/60 ml-1">
                  {formData.role === 'doctor' ? 'Clinic Email Address' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                  <input 
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="email@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-primary-500 transition-all text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary-400/60 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    <input 
                      required
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="Password"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-primary-500 transition-all text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary-400/60 ml-1">Confirm</label>
                  <div className="relative">
                    <Lock 
                      className={`absolute left-4 top-1/2 -translate-y-1/2 ${formData.confirmPassword && formData.password === formData.confirmPassword ? 'text-emerald-500' : 'text-white/20'}`} 
                      size={16} 
                    />
                    <input 
                      required
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      placeholder="Password"
                      className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-3 focus:outline-none transition-all text-xs ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-500/50' : 'border-white/10 focus:border-primary-500'}`}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          
          {(formData.role === 'doctor' || formData.role === 'supplier' || formData.role === 'assistant') && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary-400/60 ml-1">
                 {formData.role === 'doctor' ? 'Clinic Location' : formData.role === 'supplier' ? 'Supplier Location' : 'Your Location'}
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input 
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="City, State"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-primary-500 transition-all text-xs"
                />
              </div>
            </div>
          )}

          {formData.role === 'assistant' && isSignup && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary-400/60 ml-1">
                 Select Clinic
              </label>
              <div className="relative">
                <select
                  required
                  value={formData.linkedClinicId}
                  onChange={(e) => setFormData({...formData, linkedClinicId: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500 transition-all text-xs appearance-none"
                >
                  <option value="" disabled className="bg-gray-900 text-white/50">Choose a clinic...</option>
                  {clinics
                    .filter(c => !formData.location || c.location?.toLowerCase().includes(formData.location.toLowerCase()))
                    .map(c => (
                      <option key={c.id} value={c.id} className="bg-gray-900 text-white">
                        {c.displayName || 'Unnamed Clinic'} ({c.location || 'No location'})
                      </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ArrowRight size={14} className="text-white/20 rotate-90" />
                </div>
              </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={isSubmitting || (formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword)}
            className="w-full py-4 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-xl font-bold text-black transition-all flex items-center justify-center gap-2 mt-6 shadow-xl shadow-primary-950/40"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                {isSignup ? `Create ${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)} Account` : "Save Changes"}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
