"use client";

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  AlertTriangle,
  User,
  Upload,
  X,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { subscribeToDashboardSummary, bulkUpdateInventory, updateInventoryItem } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { HeartbeatLoader } from '@/components/HeartbeatLoader';
import { motion, AnimatePresence } from 'framer-motion';

export default function InventoryPage() {
  const { user, role, businessId, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  
  // Add Item Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [newItemForm, setNewItemForm] = useState({ name: '', quantity: 0, threshold: 5, expiryDate: '' });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    let isMounted = true;
    if (authLoading || !user || !businessId) return;

    const timeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 5000);

    const unsubscribe = subscribeToDashboardSummary(businessId, (updatedData) => {
      if (isMounted) {
        setData(updatedData);
        setLoading(false);
        clearTimeout(timeout);
      }
    }, role || undefined, user?.uid);

    return () => {
      isMounted = false;
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [user, role, authLoading, businessId]);
  
  const rawInventory = data?.all_inventory || [];
  const inventory = rawInventory.filter((item: any) => 
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.lastPatient?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      // Check if item already exists by name
      const existing = rawInventory.find((i: any) => i.name.toLowerCase() === newItemForm.name.toLowerCase());
      
      await updateInventoryItem(businessId!, existing?.id || 'new_' + Date.now(), {
        name: newItemForm.name,
        quantity: newItemForm.quantity,
        threshold: newItemForm.threshold,
        expiryDate: newItemForm.expiryDate,
        category: 'Medical'
      });

      setSuccessMsg("Item synced to clinical stock.");
      setTimeout(() => {
        setSuccessMsg('');
        setShowAddModal(false);
        setNewItemForm({ name: '', quantity: 0, threshold: 5, expiryDate: '' });
      }, 2000);
    } catch (err) {
      alert("Failed to sync item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <HeartbeatLoader />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold mb-2">Inventory Control</h1>
            <p className="text-muted">Trace medical stock usage across all patients. Supports Bulk Upload (Name, Qty).</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input 
                type="text" 
                placeholder="Search inventory..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input pl-10 w-64 text-sm"
              />
            </div>
            
            {role === 'supplier' && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                  <Plus size={20} className="text-primary-400" />
                  <span className="text-sm">Add Item</span>
                </button>

                <div className="relative">
                  <input 
                    type="file" 
                    id="stock-upload"
                    className="hidden" 
                    accept=".csv,.txt" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !user) return;
                      
                      setUploading(true);
                      setUploadStatus("Parsing...");
                      
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        const text = event.target?.result as string;
                        const lines = text.split('\n');
                        const items: any[] = [];
                        
                        lines.forEach(line => {
                          const parts = line.split(',');
                          if (parts.length >= 2) {
                            items.push({
                              name: parts[0].trim(),
                              quantity: parseInt(parts[1].trim()) || 0,
                              threshold: parts[2] ? parseInt(parts[2].trim()) : 5
                            });
                          }
                        });

                        if (items.length > 0) {
                          await bulkUpdateInventory(businessId!, items);
                          setUploadStatus(`Successfully synced ${items.length} items to clinical stock.`);
                          setTimeout(() => setUploadStatus(''), 3000);
                        } else {
                          setUploadStatus("Error: Wrong format");
                        }
                        setUploading(false);
                      };
                      reader.readAsText(file);
                    }}
                  />
                  <label 
                    htmlFor="stock-upload"
                    className={`px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <Upload size={20} />
                    <span className="text-sm">{uploadStatus || "Upload Stock File"}</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Add Item Modal */}
        <AnimatePresence>
          {showAddModal && (
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
                className="w-full max-w-md glass-card relative overflow-hidden p-8"
              >
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>

                <h2 className="text-2xl font-bold mb-6">Register New Resource</h2>

                {successMsg ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-xl font-bold">{successMsg}</h3>
                  </div>
                ) : (
                  <form onSubmit={handleAddItem} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs text-white/50 uppercase font-bold px-1">Item Name</label>
                      <input 
                        required
                        value={newItemForm.name}
                        onChange={(e) => setNewItemForm({...newItemForm, name: e.target.value})}
                        className="glass-input" 
                        placeholder="e.g. Surgical Gloves (Box)" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-white/50 uppercase font-bold px-1">Initial Quantity</label>
                        <input 
                          required
                          type="number"
                          value={newItemForm.quantity || ''}
                          onChange={(e) => setNewItemForm({...newItemForm, quantity: parseInt(e.target.value)})}
                          className="glass-input" 
                          placeholder="0" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-white/50 uppercase font-bold px-1">Low Stock Alert</label>
                        <input 
                          required
                          type="number"
                          value={newItemForm.threshold || ''}
                          onChange={(e) => setNewItemForm({...newItemForm, threshold: parseInt(e.target.value)})}
                          className="glass-input" 
                          placeholder="5" 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs text-white/50 uppercase font-bold px-1">Expiry Date</label>
                      <input 
                        required
                        type="date"
                        value={newItemForm.expiryDate}
                        onChange={(e) => setNewItemForm({...newItemForm, expiryDate: e.target.value})}
                        className="glass-input" 
                      />
                    </div>
                    <button 
                      disabled={isSubmitting}
                      className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold transition-all mt-6 shadow-lg shadow-primary-900/40 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Syncing...' : 'Add to Inventory'}
                    </button>
                  </form>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-6">
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-theme bg-theme-muted">
                  <th className="p-4 font-semibold text-xs uppercase tracking-widest text-muted">Patient Name</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-widest text-muted">Item & Resource</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-widest text-muted">Quantity</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-widest text-muted">Exp Date</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-widest text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {inventory.length > 0 ? (
                  inventory.map((item: any) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        {item.lastPatient ? (
                          <div className="flex items-center gap-2 text-primary-400 font-bold text-sm">
                            <div className="w-7 h-7 bg-primary-600/20 rounded-full flex items-center justify-center text-[10px]">
                              <User size={12} />
                            </div>
                            {item.lastPatient}
                          </div>
                        ) : (
                          <span className="text-xs text-white/20 italic ml-1">General Stock</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 text-white/30 flex items-center justify-center group-hover:bg-primary-600/20 group-hover:text-primary-400 transition-colors">
                            <Package size={16} />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{item.name}</div>
                            <div className="text-[10px] text-white/30 uppercase tracking-tighter">SKU: {item.id.slice(0,8).toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-bold text-lg">{item.quantity}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {role === 'supplier' && (
                              <>
                                <button className="p-1.5 bg-white/5 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-all shadow-sm mx-1">
                                  <ArrowUp size={16} />
                                </button>
                                <button className="p-1.5 bg-white/5 hover:bg-pink-500/20 text-pink-400 rounded-lg transition-all shadow-sm mx-1">
                                  <ArrowDown size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {item.expiryDate ? (
                          <div className={`font-mono text-sm font-bold ${
                            new Date(item.expiryDate) < new Date() 
                              ? 'text-pink-400' 
                              : new Date(item.expiryDate).getTime() < (new Date().getTime() + 14 * 24 * 60 * 60 * 1000)
                              ? 'text-orange-400'
                              : 'text-white/60'
                          }`}>
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-white/10 text-xs">---</span>
                        )}
                      </td>
                      <td className="p-4">
                        {item.quantity <= (item.threshold || 5) ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-500 text-[10px] font-bold uppercase tracking-wider">
                            <AlertTriangle size={12} />
                            Low Stock
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                            Optimal
                          </div>
                        )}
                        
                        {item.expiryDate && (
                          <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            new Date(item.expiryDate) < new Date() 
                              ? 'bg-pink-500/10 text-pink-400' 
                              : new Date(item.expiryDate).getTime() < (new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
                              ? 'bg-orange-500/10 text-orange-400'
                              : 'bg-white/5 text-white/30'
                          }`}>
                            <Clock size={12} />
                            {new Date(item.expiryDate) < new Date() 
                              ? 'Expired' 
                              : new Date(item.expiryDate).getTime() < (new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
                              ? 'Expiring Soon'
                              : `Expires: ${new Date(item.expiryDate).toLocaleDateString()}`}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-white/30 italic text-sm">
                      No stock records found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Medical Usage Logs Section */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Clinical Usage Logs</h2>
              <p className="text-xs text-white/30 uppercase tracking-widest font-bold">Real-time prescription & stock history</p>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
             <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                   <thead className="sticky top-0 z-10 bg-theme">
                      <tr className="border-b border-theme bg-theme-muted">
                         <th className="p-4 font-semibold text-xs uppercase tracking-widest text-muted">Timestamp</th>
                         <th className="p-4 font-semibold text-xs uppercase tracking-widest text-muted">Patient</th>
                         <th className="p-4 font-semibold text-xs uppercase tracking-widest text-muted">Items Prescribed</th>
                         <th className="p-4 font-semibold text-xs uppercase tracking-widest text-muted">Clinical Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {data?.all_history && data.all_history.length > 0 ? (
                        [...data.all_history]
                          .filter((log: any) => role !== 'assistant' || log.status === 'completed' || !log.status)
                          .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map((log: any) => (
                          <tr key={log.id} className="hover:bg-white/5 transition-all group">
                            <td className="p-4 flex flex-col items-start gap-1">
                               <span className="text-xs font-mono font-bold">{log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'}</span>
                               <span className="text-[10px] text-white/30">{log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleTimeString() : 'Awaiting sync...'}</span>
                            </td>
                            <td className="p-4">
                               <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[10px] text-blue-400 font-bold">
                                     {log.patientName?.[0] || 'P'}
                                  </div>
                                  <span className="font-bold text-sm">{log.patientName}</span>
                               </div>
                            </td>
                            <td className="p-4">
                               <div className="flex flex-wrap gap-2">
                                  {log.items?.map((item: any, i: number) => (
                                    <div key={i} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] flex items-center gap-2">
                                       <span className="text-white/70 font-medium">{item.itemName}</span>
                                       <span className="text-primary-400 font-bold border-l border-white/10 pl-2">{item.amount} {item.duration ? `(${item.duration})` : ''}</span>
                                    </div>
                                  ))}
                               </div>
                            </td>
                            <td className="p-4">
                               {log.status === 'pending' ? (
                                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-widest border border-amber-500/20">
                                     <div className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" />
                                     Pending Supplier
                                  </div>
                               ) : (
                                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
                                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                     {log.supplierId ? 'Order Fulfilled' : 'Synced to Portal'}
                                  </div>
                               )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                           <td colSpan={4} className="p-12 text-center text-white/20 italic text-sm">
                              No clinical logs found for your assigned cases.
                           </td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
