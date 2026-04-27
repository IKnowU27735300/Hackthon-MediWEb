"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart,
  Building,
  Lock, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck,
  Package,
  User,
  Stethoscope,
  MapPin,
  Mail,
  Loader2,
  CheckCircle,
  Clock,
  Users,
  Truck,
  FileBadge,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type UserRole = 'doctor' | 'assistant' | 'supplier';

export default function SignupPage() {
  const [role, setRole] = useState<UserRole>('doctor');
  const [name, setName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [location, setLocation] = useState('');
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  
  const [clinics, setClinics] = useState<any[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();


  // Fetch clinics based on location
  useEffect(() => {
    const fetchClinics = async () => {
      if ((role === 'assistant' || role === 'supplier') && location.length > 2) {
        setLoadingClinics(true);
        try {
          const clinicsRef = collection(db, 'businesses');
          const q = query(
            clinicsRef, 
            where('role', '==', 'doctor')
          );
          const snap = await getDocs(q);
          const list = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((c: any) => !location || c.location?.toLowerCase().includes(location.toLowerCase()));
          setClinics(list);
        } catch (err) {
          console.error("Failed to fetch clinics:", err);
        } finally {
          setLoadingClinics(false);
        }
      } else {
        setClinics([]);
      }
    };

    const timer = setTimeout(fetchClinics, 500);
    return () => clearTimeout(timer);
  }, [location, role]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validation
    if ((role === 'assistant' || role === 'supplier') && !selectedClinic) {
      setError(`Please select a clinic to join as a ${role}`);
      setLoading(false);
      return;
    }

    try {
      // Validation
      if ((role === 'assistant' || role === 'supplier') && !selectedClinic) {
        throw new Error("Please select a clinic to join.");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update Firebase Profile
      const displayName = role === 'doctor' ? clinicName : name;
      await updateProfile(user, { displayName });

      const profileData: any = {
        displayName: displayName,
        fullName: name,
        email: email,
        role: role,
        location: location,
        createdAt: serverTimestamp(),
        profileCompleted: true, 
      };

      if (role === 'doctor') {
        profileData.doctorName = name;
        profileData.licenseNumber = licenseNumber;
        profileData.clinicName = clinicName;
      } else {
        profileData.businessId = selectedClinic.id;
        profileData.clinicName = selectedClinic.clinicName || selectedClinic.displayName;
      }

      await setDoc(doc(db, "businesses", user.uid), profileData);
      
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <Link 
          href="/" 
          className="absolute -top-16 left-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-[10px] uppercase font-bold tracking-widest backdrop-blur-sm group"
        >
          <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={14} /> 
          Back to Home
        </Link>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl mx-auto mb-6 flex items-center justify-center font-bold text-2xl shadow-lg shadow-primary-900/40 text-white">
            <Heart />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 text-theme">Create Account</h1>
          <p className="text-muted">Select your role and join the MediWeb ecosystem</p>
        </div>

        {/* Role Selection Tabs */}
        <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl mb-8">
          {(['doctor', 'assistant', 'supplier'] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRole(r);
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all capitalize font-bold text-sm ${
                role === r 
                ? 'bg-primary-600 text-white shadow-lg' 
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {r === 'doctor' && <Stethoscope size={16} />}
              {r === 'assistant' && <Users size={16} />}
              {r === 'supplier' && <Truck size={16} />}
              {r}
            </button>
          ))}
        </div>

        <div className="glass-card p-8">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm overflow-hidden"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">
                  {role === 'doctor' ? "Doctor's Name" : "Full Name"}
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500/30" size={18} />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={role === 'doctor' ? "Dr. John Doe" : "Full Name"} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary-500 focus:bg-white/10 transition-all text-theme" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">
                  {role === 'doctor' ? 'Clinic City/Location' : 'Your City/Location'}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                  <input 
                    type="text" 
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, State" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary-500 focus:bg-white/10 transition-all text-theme" 
                  />
                </div>
              </div>
                {/* Clinic Name (Doctor only) */}
            {role === 'doctor' && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Clinic Name</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500/30" size={18} />
                  <input 
                    type="text" 
                    required
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="City Care Clinic" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary-500 focus:bg-white/10 transition-all text-theme" 
                  />
                </div>
              </div>
            )}

            {/* License Number (Doctor only) */}
            {role === 'doctor' && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">License Number</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500/30" size={18} />
                  <input 
                    type="text" 
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="REG-12345" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary-500 focus:bg-white/10 transition-all text-theme" 
                  />
                </div>
              </div>
            )}
            </div>

            {role !== 'doctor' && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">
                  Select Associated Clinic
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                  <div className="relative">
                    <select
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary-500 focus:bg-white/10 transition-all text-theme appearance-none"
                      onChange={(e) => {
                        const clinic = clinics.find(c => c.id === e.target.value);
                        setSelectedClinic(clinic);
                      }}
                      value={selectedClinic?.id || ""}
                    >
                      <option value="" disabled className="bg-gray-900 text-white">
                        {loadingClinics ? "Searching clinics..." : clinics.length > 0 ? "Select a clinic..." : "Enter location to find clinics"}
                      </option>
                      {clinics.map((clinic) => (
                        <option key={clinic.id} value={clinic.id} className="bg-gray-900 text-white">
                          {clinic.displayName || clinic.businessName || "Medical Practice"}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                      {loadingClinics ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} className="rotate-90" />}
                    </div>
                  </div>
                </div>
                {selectedClinic && (
                  <motion.p 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="text-[10px] text-primary-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1"
                  >
                    <CheckCircle2 size={12} /> Joined Clinic: {selectedClinic.displayName || selectedClinic.businessName}
                  </motion.p>
                )}
              </div>
            )}

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@clinical.com" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary-500 focus:bg-white/10 transition-all text-theme" 
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary-500 focus:bg-white/10 transition-all text-theme" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input 
                      type="password" 
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary-500 focus:bg-white/10 transition-all text-theme" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full p-4 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all font-bold shadow-lg shadow-primary-900/40 flex items-center justify-center gap-2 group text-white mt-4"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : (
                <>
                  Create {role} Account
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-white/40">
          Already have an account? {' '}
          <Link href="/login" className="text-primary-400 font-bold hover:underline transition-colors">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}

