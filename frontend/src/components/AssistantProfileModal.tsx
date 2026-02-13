"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface AssistantProfileModalProps {
  userId: string;
  businessId: string;
  onComplete: () => void;
}

export function AssistantProfileModal({ userId, businessId, onComplete }: AssistantProfileModalProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'businesses', userId);
      await updateDoc(userRef, {
        displayName: name,
        profileCompleted: true,
        businessId: businessId, // Link permanently to the discovered clinic
        updatedAt: serverTimestamp()
      });
      onComplete();
    } catch (err) {
      console.error(err);
      alert("Failed to save your name. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md glass-card p-10 border-primary-500/30 shadow-[0_0_80px_rgba(212,175,55,0.15)] relative overflow-hidden"
      >
        {/* Decorative background elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl" />

        <div className="text-center mb-8 relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-600 to-primary-400 text-black rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg transform -rotate-3 hover:rotate-0 transition-transform duration-500">
            <User size={40} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome Aboard!</h2>
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] font-bold">Clinical Assistant Identification</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-primary-400 ml-1">Your Professional Name</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary-400 transition-colors" size={20} />
              <input 
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Assistant Sarah / Nurse James"
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary-500 transition-all text-sm placeholder:text-white/10 focus:bg-white/[0.08]"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full py-5 bg-primary-600 hover:bg-primary-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl font-black text-black transition-all flex items-center justify-center gap-3 mt-8 shadow-2xl shadow-primary-900/50 group"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : (
              <>
                Confirm Identity
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-white/20 mt-6">
            <Sparkles size={12} />
            <span className="text-[9px] uppercase font-bold tracking-tighter">This will be visible to clinical staff</span>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
