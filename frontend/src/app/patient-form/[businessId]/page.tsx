"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, User, Mail, Phone, ArrowRight, Loader2, CheckCircle2, Stethoscope, ChevronDown } from 'lucide-react';
import { createBooking } from '@/services/api';
import { useRouter } from 'next/navigation';

export default function PatientIntakeForm({ params }: { params: { businessId: string } }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    intent: null as boolean | null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (formData.intent === false) {
      // User does not want to visit doctor -> Exit flow
      setStep(3);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create a Booking/Inquiry Record
      // This ensures every form submission is a distinct, trackable item in the dashboard
      // automatically handled by the 'Multiple Bookings' logic in the backend.
      
      const now = new Date();
      const end = new Date(now.getTime() + 30 * 60000); // Default 30 min slot

      await createBooking(params.businessId, {
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone, // Now capturing phone
        service: formData.service,
        startTime: now.toISOString(),
        endTime: end.toISOString(),
        status: 'upcoming', // Will show in dashboard as a new request
        note: "Submitted via Online Intake Form"
      });

      // Redirect to status Lobby / Chat
      const encodedEmail = encodeURIComponent(formData.email);
      router.push(`/patient-portal/${params.businessId}/${encodedEmail}`);
      
    } catch (err: any) {
      console.error(err);
      setError("Unable to process request. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0ebf8] flex flex-col items-center py-12 px-4 font-sans text-gray-800">
      {/* Header Image / Branding */}
      <div className="w-full max-w-2xl bg-white rounded-t-lg border-t-[10px] border-purple-600 shadow-sm mb-4 overflow-hidden">
         <div className="h-32 bg-purple-100 flex items-center justify-center">
            <h1 className="text-3xl font-normal text-purple-800">Patient Intake & Triage</h1>
         </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
        {step === 3 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-10 text-center"
            >
              <h2 className="text-2xl mb-4">Thank you.</h2>
              <p className="text-gray-600">Your response has been recorded. No further action is required.</p>
            </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="p-0">
            {/* Title Section */}
            <div className="p-8 border-b border-gray-100">
              <p className="text-sm text-gray-500 mb-4">
                Please complete this form to initiate a consultation request. Our automated system will route you to the appropriate medical assistant.
              </p>
              <div className="text-red-500 text-xs">* Indicates required question</div>
            </div>

            {/* ERROR ALERT */}
            {error && (
              <div className="bg-red-50 px-8 py-4 border-b border-red-100 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="p-8 space-y-8">
              {/* Question 1: Name */}
              <div className="space-y-4">
                <label className="block text-base font-medium">
                  What is your full name? <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <User className="absolute left-0 bottom-3 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={20} />
                  <input 
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border-b border-gray-300 focus:border-purple-600 outline-none py-2 pl-8 transition-colors bg-transparent group-hover:border-gray-400"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>

              {/* Question 2: Email */}
              <div className="space-y-4">
                <label className="block text-base font-medium">
                  Your email address <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                   <Mail className="absolute left-0 bottom-3 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={20} />
                   <input 
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full border-b border-gray-300 focus:border-purple-600 outline-none py-2 pl-8 transition-colors bg-transparent group-hover:border-gray-400"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              {/* Question 3: Phone (Added for Booking Creation) */}
              <div className="space-y-4">
                <label className="block text-base font-medium">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                   <Phone className="absolute left-0 bottom-3 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={20} />
                   <input 
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full border-b border-gray-300 focus:border-purple-600 outline-none py-2 pl-8 transition-colors bg-transparent group-hover:border-gray-400"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              {/* Question 3.5: Service Selection */}
              <div className="space-y-4">
                <label className="block text-base font-medium">
                  Reason for Visit / Service <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                   <Stethoscope className="absolute left-0 bottom-3 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={20} />
                   <div className="relative">
                     <select 
                      required
                      value={formData.service}
                      onChange={(e) => setFormData({...formData, service: e.target.value})}
                      className="w-full border-b border-gray-300 focus:border-purple-600 outline-none py-2 pl-8 pr-8 transition-colors bg-transparent group-hover:border-gray-400 appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Select a service...</option>
                      <option value="Initial Consultation">Initial Consultation</option>
                      <option value="Routine Checkup">Routine Checkup</option>
                      <option value="Diagnostic Test">Diagnostic Test</option>
                    </select>
                    <ChevronDown className="absolute right-0 bottom-3 text-gray-400 pointer-events-none" size={16} />
                   </div>
                </div>
              </div>

              {/* Question 4: Intent */}
              <div className="space-y-4">
                <label className="block text-base font-medium">
                  Do you want to start a chat with the doctor? <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.intent === true ? 'border-purple-600' : 'border-gray-400'}`}>
                      {formData.intent === true && <div className="w-2.5 h-2.5 bg-purple-600 rounded-full" />}
                    </div>
                    <input 
                      type="radio" 
                      name="intent" 
                      className="hidden" 
                      onChange={() => setFormData({...formData, intent: true})}
                      checked={formData.intent === true}
                    />
                    <span className="text-sm">Yes</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.intent === false ? 'border-purple-600' : 'border-gray-400'}`}>
                      {formData.intent === false && <div className="w-2.5 h-2.5 bg-purple-600 rounded-full" />}
                    </div>
                    <input 
                      type="radio" 
                      name="intent" 
                      className="hidden" 
                      onChange={() => setFormData({...formData, intent: false})} 
                      checked={formData.intent === false}
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>

            </div>

            {/* Actions */}
            <div className="p-8 pt-0 flex justify-between items-center">
               <button 
                  type="submit" 
                  disabled={loading || formData.intent === null || !formData.service}
                  className="bg-purple-600 text-white px-6 py-2.5 rounded hover:bg-purple-700 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : 'Submit'}
                </button>

                <div className="text-xs text-green-700 flex items-center gap-1">
                   <div className="w-20 bg-gray-200 h-1 rounded-full overflow-hidden">
                     <div className="h-full bg-green-500 w-full" />
                   </div>
                   Page 1 of 1
                </div>
            </div>
          </form>
        )}
      </div>

      <div className="mt-6 text-center text-xs text-gray-500 max-w-lg">
        This content is created by the owner of the form. The data you submit will be sent to the form owner. Microsoft Forms / Google Forms Style Replica.
        <br/><span className="font-bold">Privacy and Cookies</span>
      </div>
    </div>
  );
}
