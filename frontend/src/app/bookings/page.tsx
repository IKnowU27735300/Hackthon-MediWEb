"use client";

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal,
  Clock,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  X,
  Mail,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { subscribeToDashboardSummary, updateBookingStatus, createBooking, parseDate } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { addDoc, collection, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { Suspense } from 'react';

function BookingsPageContent() {
  const { user, role, businessId, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState<string>('All Services');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    service: 'Initial Consultation',
    date: '',
    time: '09:00'
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    let isMounted = true;
    if (authLoading || !user || !businessId) return;

    const unsubscribe = subscribeToDashboardSummary(businessId, (updatedData) => {
      if (isMounted) {
        setData(updatedData);
        setLoading(false);
      }
    }, role || undefined, user?.uid);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user, authLoading, businessId]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      setShowModal(true);
      setFormData(prev => ({
        ...prev,
        id: searchParams.get('id') || '',
        name: searchParams.get('name') || '',
        email: searchParams.get('email') || '',
        phone: searchParams.get('phone') || '',
        service: searchParams.get('service') || 'Initial Consultation'
      }));
    }
  }, [searchParams]);

  const handleStatusUpdate = async (bookingId: string, status: any) => {
    if (!businessId) return;
    try {
      await updateBookingStatus(businessId, bookingId, status);
      if (status === 'scheduled') {
        const booking = data?.all_bookings?.find((b: any) => b.id === bookingId);
        const term = booking?.customerEmail || booking?.customerName || '';
        router.push(`/customers?search=${encodeURIComponent(term)}`);
      }
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Error updating booking status");
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!businessId) {
      alert("Clinical session not ready. Please refresh.");
      setIsSubmitting(false);
      return;
    }

    try {
      const [year, month, day] = formData.date.split('-').map(Number);
      const [hours, mins] = formData.time.split(':').map(Number);
      const start = new Date(year, month - 1, day, hours, mins);
      
      if (isNaN(start.getTime())) {
        throw new Error("Invalid date selected");
      }
      
      const end = new Date(start.getTime() + 45 * 60000); // Default 45 mins

      if (formData.id) {
          // Update existing booking (Request -> Scheduled)
          const bookingRef = doc(db, 'businesses', businessId, 'bookings', formData.id);
          await setDoc(bookingRef, {
             customerName: formData.name,
             customerEmail: formData.email,
             customerPhone: formData.phone,
             service: formData.service,
             startTime: start.toISOString(),
             endTime: end.toISOString(),
             status: 'scheduled',
             updatedAt: serverTimestamp()
          }, { merge: true });
      } else {
          await createBooking(businessId, {
            customerName: formData.name,
            customerEmail: formData.email,
            customerPhone: formData.phone,
            service: formData.service,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            status: 'upcoming'
          });
      }

      // Send Inbox Message Logic (Auto-notification)
      if (formData.email) {
        try {
           await addDoc(collection(db, 'businesses', businessId, 'messages'), {
              recipientEmail: formData.email,
              recipientName: formData.name,
              subject: 'Appointment Confirmed',
              content: `Your appointment for ${formData.service} has been scheduled on ${start.toLocaleDateString()} at ${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`,
              createdAt: serverTimestamp(),
              read: false,
              type: 'system_notification',
              from: 'Doctor Office'
           });
        } catch (msgErr) {
           console.error("Failed to send inbox message", msgErr);
        }
      }
      
      setShowModal(false);
      setFormData({ id: '', name: '', email: '', phone: '', service: 'Initial Consultation', date: '', time: '09:00' });
      // Refresh logic via subscription automatically handles update
    } catch (err) {
      console.error(err);
      alert("Failed to create appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const rawBookings = data?.all_bookings || [];
  
  // Apply filters
  const bookings = rawBookings.filter((booking: any) => {
    const matchesService = serviceFilter === 'All Services' || booking.service === serviceFilter;
    const matchesSearch = booking.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         booking.customerPhone?.includes(searchQuery);
    return matchesService && matchesSearch;
  });

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold mb-2">Bookings</h1>
            <p className="text-muted">Manage your practice schedule and appointments.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input 
                type="text" 
                placeholder="Search patient..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input pl-10 w-64 text-sm"
              />
            </div>
            
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 z-10">
                <Filter size={18} />
              </div>
              <select 
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="glass-input pl-10 pr-10 appearance-none cursor-pointer bg-transparent relative z-0 min-w-[180px]"
              >
                <option value="All Services" className="bg-theme text-foreground">All Services</option>
                <option value="Initial Consultation" className="bg-theme text-foreground">Initial Consultation</option>
                <option value="Routine Checkup" className="bg-theme text-foreground">Routine Checkup</option>
                <option value="Diagnostic Test" className="bg-theme text-foreground">Diagnostic Test</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                <ChevronDown size={16} />
              </div>
            </div>

            {role === 'doctor' && (
              <button 
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
              >
                <Plus size={20} />
                Add Appointment
              </button>
            )}
          </div>
        </header>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-theme bg-theme-muted">
                  <th className="p-4 font-semibold text-xs uppercase tracking-widest text-muted">Patient</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-widest text-muted">Service</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-widest text-muted">Date & Time</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-widest text-muted">Status</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-widest text-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bookings.length > 0 ? (
                  bookings.sort((a: any, b: any) => {
                    const dateA = parseDate(a.startTime).getTime();
                    const dateB = parseDate(b.startTime).getTime();
                    return dateB - dateA;
                  }).map((booking: any) => (
                    <tr key={booking.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-600/20 text-primary-400 flex items-center justify-center">
                            <UserIcon size={16} />
                          </div>
                          <div>
                            <div className="font-medium">{booking.customerName}</div>
                            <div className="text-xs text-white/40">{booking.customerPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">{booking.service}</div>
                        <div className="text-xs text-white/40">45 mins</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock size={14} className="text-white/30" />
                          {parseDate(booking.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          booking.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                          booking.status === 'scheduled' ? 'bg-indigo-500/10 text-indigo-400' :
                          booking.status === 'no-show' || booking.status === 'rejected' ? 'bg-pink-500/10 text-pink-400' :
                          'bg-primary-500/10 text-primary-400'
                        }`}>
                          {booking.status === 'completed' && <CheckCircle2 size={10} />}
                          {booking.status === 'scheduled' && <Calendar size={10} />}
                          {(booking.status === 'no-show' || booking.status === 'rejected') && <XCircle size={10} />}
                          {(booking.status === 'upcoming' || !booking.status) && <AlertCircle size={10} />}
                          {booking.status}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          {booking.status === 'upcoming' && role === 'doctor' && (
                            <button 
                              onClick={() => handleStatusUpdate(booking.id, 'scheduled')}
                              className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                            >
                              Confirm
                            </button>
                          )}
                          {booking.status === 'scheduled' && (
                            <button 
                              onClick={() => handleStatusUpdate(booking.id, 'completed')}
                              className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                            >
                              Complete
                            </button>
                          )}
                          {booking.status !== 'completed' && booking.status !== 'rejected' && booking.status !== 'no-show' && role === 'doctor' && (
                            <button 
                              onClick={() => handleStatusUpdate(booking.id, 'rejected')}
                              className="px-3 py-1.5 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-white/30 italic">
                      {serviceFilter !== 'All Services' || searchQuery !== '' 
                        ? "No bookings match your current filters." 
                        : "No bookings found. Use the dashboard to create samples or wait for patient arrivals."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Appointment Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-lg glass-card relative"
              >
                <button 
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="p-8">
                  <h2 className="text-2xl font-bold mb-6">Schedule New Appointment</h2>
                  
                  <form onSubmit={handleCreateAppointment} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-white/50 uppercase font-bold px-1">Patient Name</label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                          <input 
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="glass-input pl-11" 
                            placeholder="Full name" 
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-white/50 uppercase font-bold px-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                          <input 
                            required
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="glass-input pl-11" 
                            placeholder="email@example.com" 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-white/50 uppercase font-bold px-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                        <input 
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="glass-input pl-11" 
                          placeholder="+1 (555) 000-0000" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-white/50 uppercase font-bold px-1">Medical Service</label>
                      <select 
                        className="glass-input bg-[#0f172a]"
                        value={formData.service}
                        onChange={(e) => setFormData({...formData, service: e.target.value})}
                      >
                        <option>Initial Consultation</option>
                        <option>Routine Checkup</option>
                        <option>Diagnostic Test</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-white/50 uppercase font-bold px-1">Date</label>
                        <input 
                          required
                          type="date"
                          className="glass-input"
                          value={formData.date}
                          onChange={(e) => setFormData({...formData, date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-white/50 uppercase font-bold px-1">Time</label>
                        <input 
                          required
                          type="time"
                          className="glass-input"
                          value={formData.time}
                          onChange={(e) => setFormData({...formData, time: e.target.value})}
                        />
                      </div>
                    </div>

                    <button 
                      disabled={isSubmitting}
                      className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold transition-all mt-6 shadow-lg shadow-primary-900/40 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Scheduling...' : 'Confirm Appointment'}
                    </button>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    }>
      <BookingsPageContent />
    </Suspense>
  );
}
