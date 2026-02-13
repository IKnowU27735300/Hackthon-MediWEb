"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, MapPin, Phone, Mail, CheckCircle2 } from 'lucide-react';

import { submitContactForm } from '@/services/api';

export default function ContactForm({ params }: { params: { businessId: string } }) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await submitContactForm(params.businessId, formData);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full glass-card p-10 text-center"
        >
          <div className="w-20 h-20 bg-primary-500/20 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-3xl font-bold mb-4">Message Sent!</h1>
          <p className="text-white/60 mb-8">
            Thank you for reaching out. Our team has received your message and will get back to you shortly via email or SMS.
          </p>
          <button onClick={() => setSubmitted(false)} className="w-full glass-button">Back to Form</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-6 max-w-4xl mx-auto flex flex-col lg:flex-row gap-12">
      <div className="flex-1">
        <div className="inline-block px-3 py-1 bg-primary-600/20 border border-primary-500/30 rounded-full text-xs text-primary-400 font-bold mb-6">
          GET IN TOUCH
        </div>
        <h1 className="text-5xl font-bold mb-6 tracking-tight">How can we help <span className="gradient-text">your business?</span></h1>
        <p className="text-lg text-white/50 mb-10 leading-relaxed">
          Fill out the form and our autonomous system will route your inquiry to the right staff member immediately.
        </p>

        <div className="space-y-6">
          <ContactDetail icon={<MapPin className="text-primary-500" />} label="Our Office" value="123 Health Ave, New York, NY" />
          <ContactDetail icon={<Phone className="text-primary-500" />} label="Phone" value="+1 (555) 000-0000" />
          <ContactDetail icon={<Mail className="text-primary-500" />} label="Email" value="concierge@acmemedical.com" />
        </div>
      </div>

      <div className="flex-1">
        <div className="glass-card p-8 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/10 blur-[60px] rounded-full" />
          
          {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Full Name</label>
                <input 
                  required 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500 focus:bg-white/10 transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Email Address</label>
                <input 
                  required 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="john@example.com" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500 focus:bg-white/10 transition-all" 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Phone Number (Optional)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm font-mono">+91</span>
                <input 
                  type="tel" 
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({...formData, phone: val});
                  }}
                  placeholder="00000 00000" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary-500 focus:bg-white/10 transition-all font-mono" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Message</label>
              <textarea 
                rows={4} 
                required
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="Tell us more about your inquiry..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500 focus:bg-white/10 transition-all resize-none"
              ></textarea>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full glass-button flex items-center justify-center gap-2 group py-4 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Inquiry'}
              {!loading && <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
            </button>
          </form>
        </div>
      </div>
      <div className="mt-12 text-center text-xs text-white/20 w-full lg:col-span-2">
        Powered by MediWeb
      </div>
    </div>
  );
}

function ContactDetail({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
        {icon}
      </div>
      <div>
        <div className="text-sm text-white/40 uppercase font-bold tracking-widest">{label}</div>
        <div className="text-white font-medium">{value}</div>
      </div>
    </div>
  );
}
