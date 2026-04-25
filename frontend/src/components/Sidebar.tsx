"use client";

import React from 'react';
import { 
  BarChart3, 
  Calendar, 
  Users, 
  ClipboardCheck, 
  Package, 
  MessageSquare,
  LogOut,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { MediWebLogo } from './MediWebLogo';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  active?: boolean;
  href: string;
}

function NavItem({ icon, label, badge, active = false, href }: NavItemProps) {
  return (
    <Link href={href} className="block group">
      <div className={`
        flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-300
        ${active ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20 shadow-lg' : 'hover:bg-theme-muted text-muted hover:text-primary-500 dark:hover:text-white dark:hover:bg-white/5'}
      `}>
        <div className="flex items-center gap-4">
          <div className={`${active ? 'text-primary-400' : 'text-dim group-hover:text-primary-500 dark:group-hover:text-white'} transition-colors`}>
            {icon}
          </div>
          <span className="font-semibold text-sm">{label}</span>
        </div>
        {badge ? (
          <span className="bg-primary-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
            {badge}
          </span>
        ) : (
          <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-all ${active ? '' : 'translate-x-1'}`} />
        )}
      </div>
    </Link>
  );
}

export function Sidebar() {
  const { user, role, displayName } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      if (confirm("Are you sure you want to log out?")) {
        if (user) {
          // Explicitly set offline status for the clinic network
          const { updateDoc, doc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'businesses', user.uid), {
            status: 'offline',
            lastActive: new Date() // Force timestamp update for immediate cache invalidation
          });
        }
        await signOut(auth);
        router.push('/login');
      }
    } catch (err) {
      console.error('Failed to log out', err);
    }
  };

  const menuItems = [
    { icon: <BarChart3 size={20} />, label: role === 'assistant' ? "Dashboard" : "Overview", href: "/dashboard", roles: ['doctor', 'supplier', 'assistant'] },
    { icon: <Calendar size={20} />, label: "Bookings", href: "/bookings", roles: ['doctor'] },
    { icon: <MessageSquare size={20} />, label: "Inbox", href: "/inbox", badge: "Live", roles: ['doctor'] },
    { icon: <Users size={20} />, label: role === 'assistant' ? "Patients & Forms" : "Patients", href: "/customers", roles: ['doctor', 'assistant'] },
    { icon: <ClipboardCheck size={20} />, label: "Intake Forms", href: "/forms", roles: ['doctor', 'assistant'] },
    { icon: <Package size={20} />, label: "Inventory", href: "/inventory", roles: ['doctor', 'supplier', 'assistant'] },
  ].filter(item => !role || item.roles.includes(role));

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <aside className="w-72 glass-card m-4 mr-0 p-6 flex flex-col h-[calc(100vh-2rem)] relative z-20 pointer-events-auto">
      <div className="flex items-center justify-between mb-8 pl-2">
        <div className="flex items-center gap-3">
          <MediWebLogo className="w-10 h-10 text-primary-500" />
          <div className="text-xl font-bold tracking-tight gradient-text">MediWeb</div>
        </div>
        
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-theme-muted hover:bg-primary-500/10 transition-all text-muted hover:text-primary-600"
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} className="text-primary-600" />}
        </button>
      </div>

      <nav className="flex flex-col gap-1.5 flex-1">
        {menuItems.map((item) => (
          <NavItem 
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            badge={item.badge}
            active={pathname === item.href}
          />
        ))}
      </nav>

      <div className="pt-6 border-t border-theme space-y-4">
        <div className="flex items-center gap-3 p-2">
          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center font-bold text-white shadow-lg border border-theme relative">
            {getInitials(displayName || user?.displayName || null)}
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#0f172a] ${role === 'doctor' ? 'bg-indigo-500' : role === 'assistant' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-bold truncate">{displayName || user?.displayName || 'Healthcare User'}</div>
            <div className="text-[10px] text-muted truncate uppercase tracking-widest flex items-center gap-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${role === 'doctor' ? 'bg-indigo-500' : role === 'assistant' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
              {{ doctor: 'Doctor', assistant: 'Clinical Assistant', supplier: 'Supplier' }[role!] || 'Staff'}
            </div>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-red-500/10 text-muted hover:text-red-500 transition-all group"
        >
          <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-semibold">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
