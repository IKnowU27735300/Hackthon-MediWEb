"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, User, Mail, Phone, CheckCircle2 } from 'lucide-react';

import { createBooking } from '@/services/api';

export default function PublicBooking({ params }: { params: { businessId: string } }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('2026-02-12');
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const services = [
    { id: 1, name: 'Initial Consultation', duration: 45, price: '$80', desc: 'Comprehensive intake and evaluation of your needs.' },
    { id: 2, name: 'Standard Session', duration: 60, price: '$120', desc: 'Regular follow-up or maintenance service.' },
  ];

  const timeSlots = ['09:00 AM', '10:15 AM', '11:30 AM', '02:00 PM', '03:15 PM'];

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const [time, period] = selectedTime.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      const startDate = new Date(selectedDate);
      startDate.setHours(hours, minutes, 0);
      
      const endDate = new Date(startDate);
      endDate.setMinutes(startDate.getMinutes() + selectedService.duration);

      await createBooking(params.businessId, {
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        service: selectedService.name,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        price: selectedService.price
      });

      setStep(4);
    } catch (err) {
      console.error(err);
      alert("Failed to confirm booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 4) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full glass-card p-10 text-center"
        >
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-3xl font-bold mb-4">Booking Confirmed!</h1>
          <p className="text-white/60 mb-8">
            Thank you. We've sent a confirmation to your email. 
            You will receive any required forms shortly via email/SMS.
          </p>
          <div className="bg-white/5 p-4 rounded-xl text-left space-y-2 mb-8 border border-white/5">
            <div className="text-sm flex justify-between">
              <span className="text-white/40">Service:</span>
              <span>{selectedService.name}</span>
            </div>
            <div className="text-sm flex justify-between">
              <span className="text-white/40">Date:</span>
              <span>{selectedDate || 'Feb 12, 2026'}</span>
            </div>
            <div className="text-sm flex justify-between">
              <span className="text-white/40">Time:</span>
              <span>{selectedTime}</span>
            </div>
          </div>
          <button className="w-full glass-button">Add to Calendar</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-6 max-w-2xl mx-auto">
      <div className="mb-10 text-center">
        <div className="w-16 h-16 bg-primary-600 rounded-2xl mx-auto mb-4 flex items-center justify-center font-bold text-2xl">A</div>
        <h1 className="text-2xl font-bold">Acme Medical Services</h1>
        <p className="text-white/50 flex items-center justify-center gap-2 mt-1">
          <MapPin size={14} /> 123 Health Ave, New York, NY
        </p>
      </div>

      <div className="glass-card overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-white/5 w-full">
          <motion.div 
            className="h-full bg-primary-500" 
            animate={{ width: `${(step/3)*100}%` }}
          />
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Select a Service</h2>
              <div className="grid gap-4">
                {services.map(s => (
                  <div 
                    key={s.id}
                    onClick={() => { setSelectedService(s); setStep(2); }}
                    className="p-5 glass-card hover:bg-white/10 transition-all cursor-pointer group flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <div className="font-bold text-lg mb-1 group-hover:text-primary-400 transition-colors">{s.name}</div>
                      <div className="text-xs text-white/50 flex gap-4 uppercase font-mono tracking-wider">
                        <span className="flex items-center gap-1"><Clock size={12} /> {s.duration}</span>
                        <span>{s.price}</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary-600 transition-all">
                      <Calendar size={18} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Choose Date & Time</h2>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-6">
                <div className="flex items-center gap-2 text-primary-400 mb-4">
                  <Calendar size={18} />
                  <span className="font-semibold">February 2026</span>
                </div>
                {/* Simplified Calendar Placeholder */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {['S','M','T','W','T','F','S'].map(d => <div key={d} className="p-2 text-white/30">{d}</div>)}
                  {Array.from({length: 28}, (_, i) => (
                    <div 
                      key={i} 
                      className={`p-2 rounded-lg cursor-pointer hover:bg-white/10 ${(i+1)%7==0 ? 'opacity-20 pointer-events-none' : ''} ${i === 11 ? 'bg-primary-600 text-white' : ''}`}
                    >
                      {i+1}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="text-xs text-white/40 uppercase font-bold tracking-widest">Available Slots</div>
                <div className="grid grid-cols-3 gap-3">
                  {timeSlots.map(t => (
                    <button 
                      key={t}
                      onClick={() => { setSelectedTime(t); setStep(3); }}
                      className="p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-primary-600/20 hover:border-primary-600/50 transition-all text-sm font-medium"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => setStep(1)}
                className="text-white/40 text-sm hover:underline"
              >
                &larr; Back to services
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Your Information</h2>
              <p className="text-sm text-white/50">Please provide your details to confirm the booking.</p>
              
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                  <input 
                    type="text" 
                    required
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    placeholder="Full Name" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary-500" 
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                  <input 
                    type="email" 
                    required
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    placeholder="Email Address" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary-500" 
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm font-mono">+91</span>
                  <input 
                    type="tel" 
                    maxLength={10}
                    value={customerInfo.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setCustomerInfo({...customerInfo, phone: val});
                    }}
                    placeholder="00000 00000" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary-500 font-mono transition-all" 
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="flex-1 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  Back
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-[2] p-4 bg-primary-600 hover:bg-primary-500 rounded-xl transition-all font-bold shadow-lg shadow-primary-900/40 disabled:opacity-50"
                >
                  {loading ? 'Confirming...' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 text-center text-xs text-white/20">
        Powered by MediWeb
      </div>
    </div>
  );
}
