"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Mail, 
  MessageSquare, 
  Settings, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Package,
  CalendarCheck
} from 'lucide-react';

const steps = [
  { id: 1, title: 'Workspace', icon: <Building2 />, description: 'Define your business identity' },
  { id: 2, title: 'Connect', icon: <Mail />, description: 'Email & SMS setup' },
  { id: 3, title: 'Booking', icon: <CalendarCheck />, description: 'Services & Availability' },
  { id: 4, title: 'Inventory', icon: <Package />, description: 'Resource management' },
  { id: 5, title: 'Activate', icon: <ShieldCheck />, description: 'System validation' },
];

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { createWorkspace } from '@/services/api';

export default function Onboarding() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    address: '',
    email: '',
    smsActive: true,
    emailActive: true,
  });

  const nextStep = async () => {
    if (currentStep === 5) {
      if (!user) return;
      setLoading(true);
      try {
        await createWorkspace(user.uid, formData);
        router.push('/');
      } catch (err) {
        console.error(err);
        alert("Failed to activate workspace.");
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentStep((prev: number) => Math.min(prev + 1, steps.length));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Progress Sidebar */}
        <div className="lg:col-span-1 glass-card p-8 flex flex-col gap-8">
          <div>
            <div className="text-2xl font-bold gradient-text mb-2">MediWeb</div>
            <p className="text-sm text-white/50">Autonomous Business Setup</p>
          </div>
          
          <div className="flex flex-col gap-6">
            {steps.map((step) => (
              <div 
                key={step.id}
                className={`flex items-center gap-4 transition-all duration-500 ${currentStep >= step.id ? 'opacity-100' : 'opacity-30'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${currentStep >= step.id ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/40' : 'bg-white/5 outline outline-1 outline-white/10'}`}>
                  {currentStep > step.id ? <CheckCircle2 size={20} /> : step.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold">{step.title}</div>
                  <div className="text-[10px] text-white/40 uppercase">{step.description}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto p-4 bg-white/5 rounded-xl border border-white/10 italic text-[10px] text-white/40">
            "Zero manual intervention required after workspace activation."
          </div>
        </div>

        {/* Form Area */}
        <div className="lg:col-span-2 glass-card p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              <div className="mb-10">
                <h2 className="text-3xl font-bold mb-2">{steps[currentStep-1].title} Setup</h2>
                <p className="text-white/50">{steps[currentStep-1].description}</p>
              </div>

              <div className="flex-1 space-y-6">
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <InputField 
                      label="Business Name" 
                      placeholder="e.g. Acme Services" 
                      value={formData.businessName}
                      onChange={(val) => setFormData({...formData, businessName: val})}
                    />
                    <InputField 
                      label="Business Address" 
                      placeholder="123 Industrial Way, NY" 
                      value={formData.address}
                      onChange={(val) => setFormData({...formData, address: val})}
                    />
                    <InputField 
                      label="Business Email" 
                      placeholder="owner@acme.com" 
                      value={formData.email}
                      onChange={(val) => setFormData({...formData, email: val})}
                    />
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    <IntegrationToggle 
                      title="SendGrid Integration" 
                      desc="Used for booking confirmations & reminders."
                      active={true}
                    />
                    <IntegrationToggle 
                      title="Twilio SMS" 
                      desc="Used for urgent alerts & short updates."
                      active={false}
                    />
                    <div className="p-4 bg-primary-600/10 rounded-xl text-xs text-primary-400 border border-primary-500/20">
                      Note: At least one channel must be active to proceed.
                    </div>
                  </div>
                )}
                
                {currentStep === 5 && (
                  <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/30 animate-pulse">
                      <ShieldCheck size={40} />
                    </div>
                    <div className="text-2xl font-bold">System Validating...</div>
                    <p className="text-white/50 max-w-xs">Verifying integrations, booking links, and staff permissions.</p>
                  </div>
                )}
              </div>

              <div className="mt-10 flex justify-between items-center">
                <button 
                  onClick={() => setCurrentStep(prev => Math.max(1, prev-1))}
                  className="text-white/40 hover:text-white transition-colors"
                  disabled={currentStep === 1}
                >
                  Back
                </button>
                <button 
                  onClick={nextStep}
                  disabled={loading}
                  className="glass-button flex items-center gap-2 group disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (currentStep === 5 ? 'Activate Workspace' : 'Continue')}
                  {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

function InputField({ label, placeholder, value, onChange }: { label: string, placeholder: string, value: string, onChange: (val: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/70">{label}</label>
      <input 
        type="text" 
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="glass-input"
      />
    </div>
  );
}

function IntegrationToggle({ title, desc, active }: { title: string, desc: string, active: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 glass-card hover:bg-white/10 transition-colors">
      <div className="flex gap-4">
        <div className={`p-2 rounded-lg ${active ? 'bg-primary-600/20 text-primary-400' : 'bg-white/5 text-white/20'}`}>
          <Settings size={20} />
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-white/40">{desc}</div>
        </div>
      </div>
      <div className={`w-12 h-6 rounded-full relative transition-colors ${active ? 'bg-primary-600' : 'bg-white/10'}`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${active ? 'left-7' : 'left-1'}`} />
      </div>
    </div>
  );
}
