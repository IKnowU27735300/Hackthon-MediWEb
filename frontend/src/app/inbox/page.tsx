"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Send, 
  Phone, 
  MoreVertical,
  Pause, 
  Play, 
  Calendar,
  MessageSquare,
  User,
  Trash2
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { HeartbeatLoader } from '@/components/HeartbeatLoader';
import { 
  subscribeToActiveStaff,
  deleteChat,
  subscribeToPatientInbox,
  subscribeToPatientMessages,
  sendPatientMessage,
  subscribeToInternalMessages,
  sendInternalMessage
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Inbox() {
  const { user, role, businessId, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'patients' | 'staff'>('patients');
  const [automationActive, setAutomationActive] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [staffConversations, setStaffConversations] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showChatMenu, setShowChatMenu] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, role, authLoading, router]);

  // Subscribe to Inbox (Patients)
  useEffect(() => {
    let isMounted = true;
    if (authLoading || !user || !businessId || activeTab !== 'patients') return;

    const timeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 5000);

    const unsubscribe = subscribeToPatientInbox(businessId, (data) => {
      if (isMounted) {
        setConversations(data.sort((a, b) => (b.lastMsgTime?.seconds || 0) - (a.lastMsgTime?.seconds || 0)));
        setLoading(false);
        clearTimeout(timeout);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [user, authLoading, businessId, activeTab]);

  // Fetch Staff List (Live)
  useEffect(() => {
    let isMounted = true;
    if (authLoading || !user || activeTab !== 'staff') return;

    const unsubscribeStaff = subscribeToActiveStaff((list) => {
      if (!isMounted) return;
      // --- CLINICAL NETWORK RESOLUTION ---
      // Doctors see only their specific assistants (shared businessId)
      // Assistants see their specific lead doctor (matching businessId)
      let filteredStaff = list.filter(a => a.id !== user?.uid);
      
      if (role === 'doctor') {
        // Find assistants who belong to THIS doctor
        filteredStaff = filteredStaff.filter(a => 
          a.role === 'assistant' && (a.businessId === user?.uid || !a.businessId)
        );
      } else if (role === 'assistant') {
        // Find the specific doctor for this assistant
        filteredStaff = filteredStaff.filter(a => a.id === businessId);
      }
      
      setStaffConversations(filteredStaff);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      if (unsubscribeStaff) unsubscribeStaff();
    };
  }, [user, role, authLoading, activeTab, businessId]);

  // Subscribe to Messages
  useEffect(() => {
    let isMounted = true;
    if (!selectedChat || !user || !businessId) return;

    let unsubscribe: (() => void) | undefined;

    if (activeTab === 'patients') {
      unsubscribe = subscribeToPatientMessages(businessId, selectedChat.patientUid, (msgs) => {
        if (isMounted) setMessages(msgs);
      });
    } else {
      unsubscribe = subscribeToInternalMessages(businessId, selectedChat.id, (msgs) => {
        if (isMounted) setMessages(msgs);
      });
    }

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [selectedChat, user, businessId, activeTab]);

  const handleSend = async (e: any) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !user) return;

    const msg = newMessage;
    setNewMessage('');

    if (activeTab === 'patients') {
      await sendPatientMessage(businessId!, selectedChat.patientUid, {
        content: msg,
        sender: 'staff',
        customerName: selectedChat.patientName,
        customerEmail: selectedChat.patientEmail
      });
    } else {
      await sendInternalMessage(businessId!, selectedChat.id, {
        content: msg,
        sender: role || 'staff',
        displayName: user.displayName || 'Doctor'
      });
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedChat || !businessId) return;
    if (window.confirm(`Are you sure you want to delete this chat with ${selectedChat.customerName || selectedChat.businessName || 'this staff member'}?`)) {
      try {
        await deleteChat(businessId, selectedChat.id, activeTab);
        setSelectedChat(null);
        setShowChatMenu(false);
      } catch (err) {
        console.error("Failed to delete chat:", err);
        alert("Action restricted. Please contact support.");
      }
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return 'Now';
    const date = ts?.seconds ? new Date(ts.seconds * 1000) : (ts ? new Date(ts) : new Date());
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const MessageItem = ({ sender, content, time }: { sender: string, content: string, time: string }) => {
    const isMe = activeTab === 'staff' ? sender === 'doctor' || sender === 'staff' : (activeTab === 'patients' && (sender === 'doctor' || sender === 'staff'));
    
    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-lg ${
          isMe 
          ? 'bg-primary-600 text-white rounded-tr-none' 
          : 'bg-white/5 border border-white/10 text-white rounded-tl-none'
        }`}>
          <div className="text-sm leading-relaxed">{content}</div>
          <div className={`text-[9px] mt-1.5 font-bold uppercase tracking-widest ${isMe ? 'text-white/60' : 'text-white/30'}`}>
            {time}
          </div>
        </div>
      </div>
    );
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

      <div className="flex-1 flex overflow-hidden m-4 gap-4 pointer-events-auto relative z-10">
        {/* Contact List */}
        <div className="w-80 glass-card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="flex bg-theme-muted p-1 rounded-xl mb-4">
              <button 
                onClick={() => { setActiveTab('patients'); setSelectedChat(null); }}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === 'patients' ? 'bg-primary-600 text-white shadow-lg' : 'text-muted hover:text-primary-500 hover:dark:text-white'}`}
              >
                Patients
              </button>
              <button 
                onClick={() => { setActiveTab('staff'); setSelectedChat(null); }}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === 'staff' ? 'bg-primary-600 text-white shadow-lg' : 'text-muted hover:text-primary-500 hover:dark:text-white'}`}
              >
                Staff Chat
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <input type="text" placeholder={`Search ${activeTab}...`} className="w-full bg-theme-muted border border-theme rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'patients' ? (
              conversations.length > 0 ? (
                conversations.map(conv => (
                  <div 
                    key={conv.id}
                    onClick={() => setSelectedChat(conv)}
                    className={`p-4 cursor-pointer hover:bg-theme-muted transition-all border-b border-theme ${selectedChat?.id === conv.id ? 'bg-primary-600/10 border-l-2 border-l-primary-500' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-semibold text-sm">{conv.customerName || 'Anonymous'}</div>
                      <div className="text-[10px] text-white/30">{formatTime(conv.lastMsgTime)}</div>
                    </div>
                    <div className="text-xs text-white/50 truncate pr-4">{conv.lastMsg}</div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-white/20 italic text-sm">No patient chats yet.</div>
              )
            ) : (
              staffConversations.filter(s => s.id !== user?.uid).length > 0 ? (
                staffConversations.filter(s => s.id !== user?.uid).map(staff => (
                  <div 
                    key={staff.id}
                    onClick={() => setSelectedChat(staff)}
                    className={`p-4 cursor-pointer hover:bg-white/5 transition-all border-b border-white/5 ${selectedChat?.id === staff.id ? 'bg-primary-600/10 border-l-2 border-l-primary-500' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-semibold text-sm">{staff.businessName || staff.displayName || 'Assistant'}</div>
                      <div className={`w-2 h-2 rounded-full ${(() => {
                        if (!staff.lastActive) return 'bg-white/10';
                        const last = staff.lastActive.seconds ? staff.lastActive.seconds * 1000 : new Date(staff.lastActive).getTime();
                        const diff = new Date().getTime() - last;
                        if (diff < 120000) return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
                        if (diff < 600000) return 'bg-yellow-500';
                        return 'bg-white/10';
                      })()}`} />
                    </div>
                    <div className="text-[10px] text-white/30 uppercase tracking-widest">{staff.role || 'Staff'}</div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-white/20 italic text-sm">No clinical staff found.</div>
              )
            )}
          </div>

          {/* Global Automation Switch - Only for Patients */}
          {activeTab === 'patients' && (
            <div className="p-4 border-t border-white/10 bg-white/[0.02]">
              <div 
                onClick={() => setAutomationActive(!automationActive)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${automationActive ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${automationActive ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/40'}`}>
                    <Play size={14} className={automationActive ? '' : 'hidden'} />
                    <Pause size={14} className={automationActive ? 'hidden' : ''} />
                  </div>
                  <div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${automationActive ? 'text-emerald-400' : 'text-white/40'}`}>
                      Smart Bot AI
                    </div>
                    <div className="text-[9px] text-white/20 font-bold uppercase">
                      {automationActive ? 'Auto-Response: ON' : 'Human-Only Mode'}
                    </div>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full relative transition-all duration-300 ${automationActive ? 'bg-emerald-500' : 'bg-white/10'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-300 ${automationActive ? 'right-1' : 'left-1'}`} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 glass-card flex flex-col overflow-hidden">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-theme flex justify-between items-center bg-theme-muted">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                    {(selectedChat.customerName || selectedChat.businessName || 'S')[0]}
                  </div>
                  <div>
                    <div className="font-bold">{selectedChat.patientName || selectedChat.customerName || selectedChat.businessName || 'Staff Member'}</div>
                    <div className="text-xs text-muted">{selectedChat.patientEmail || selectedChat.customerEmail || selectedChat.role || 'Clinical Profile'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {automationActive && activeTab === 'patients' && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      Bot Active
                    </div>
                  )}
                  <div className="relative">
                    <button 
                      onClick={() => setShowChatMenu(!showChatMenu)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <MoreVertical size={18} className="text-white/40" />
                    </button>
                    {showChatMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setShowChatMenu(false)}
                        />
                        <div className="absolute right-0 top-12 w-48 glass-card border-white/10 py-2 z-20 shadow-2xl">
                          <button 
                            onClick={handleDeleteChat}
                            className="w-full text-left px-4 py-2 text-sm text-pink-400 hover:bg-white/5 flex items-center gap-2 group transition-colors"
                          >
                            <Trash2 size={14} className="group-hover:scale-110 transition-transform" /> 
                            Delete Diagnostic Thread
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((msg, idx) => (
                    <MessageItem 
                      key={msg.id || idx}
                      sender={msg.sender} 
                      content={msg.content} 
                      time={formatTime(msg.timestamp)} 
                    />
                  ))}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-4 border-t border-white/10">
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <textarea 
                        placeholder={activeTab === 'staff' ? "Reply to clinical staff..." : "Type a clinical reply..."}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend(e);
                          }
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500 focus:bg-white/10 transition-all resize-none max-h-32 text-sm"
                        rows={1}
                      ></textarea>
                    </div>
                    <button 
                      type="submit"
                      className="p-3 bg-primary-600 hover:bg-primary-500 rounded-xl transition-all shadow-lg shadow-primary-900/40 shrink-0"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                <MessageSquare size={64} className="mb-4 opacity-20" />
                <p className="font-bold">{activeTab === 'patients' ? 'Patient Communication Center' : 'Clinical Collaboration Hub'}</p>
                <p className="text-sm">{activeTab === 'patients' ? 'Select a diagnostic thread to continue.' : 'Coordinate tasks with your clinical team members.'}</p>
              </div>
            )}
          </div>
  
          {/* Info Panel */}
          {selectedChat && activeTab === 'patients' && (
            <div className="w-64 glass-card p-6 hidden xl:flex flex-col gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-600/20 text-primary-400 rounded-2xl mx-auto mb-4 flex items-center justify-center font-bold text-xl">
                  {(selectedChat.patientName || selectedChat.customerName)?.[0]}
                </div>
                <h3 className="font-bold">{selectedChat.patientName || selectedChat.customerName}</h3>
                <div className="text-[10px] text-white/20 uppercase font-mono mt-1">Patient History Secure</div>
              </div>
              
              <div className="space-y-4 border-t border-white/5 pt-6">
                <div className="flex items-center gap-3 text-xs text-white/60">
                  <Phone size={14} className="text-white/20" />
                  {selectedChat.patientEmail || selectedChat.customerEmail || 'Verified Contact'}
                </div>
                <div className="flex items-center gap-3 text-xs text-white/60">
                  <Calendar size={14} className="text-white/20" />
                  Active Participant
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  function MessageItem({ sender, content, time }: { sender: string, content: string, time: string }) {
    const isSelf = sender === 'staff' || sender === 'doctor' || sender === 'assistant' || sender === 'supplier';
    const isAgent = sender === 'agent';
    const isSystem = sender === 'system';
    const isOther = !isSelf && !isAgent && !isSystem;
  
    return (
      <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%]`}>
          <div className={`
            p-3.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap
            ${isOther ? 'bg-white/5 rounded-tl-none' : ''}
            ${isSelf ? 'bg-primary-600 rounded-tr-none text-white' : ''}
            ${isSystem ? 'bg-indigo-500/10 border border-indigo-500/20 rounded-tr-none text-indigo-200 italic' : ''}
            ${isAgent ? 'bg-emerald-500/10 border border-emerald-500/20 rounded-tl-none text-emerald-200 font-mono text-[11px]' : ''}
          `}>
            {content}
          </div>
          <div className={`text-[9px] text-white/30 mt-1.5 uppercase font-bold tracking-widest ${isSelf ? 'text-right' : ''}`}>
            {time} {isSystem ? '• SYSTEM' : isAgent ? '• CLINICAL AGENT' : `• ${sender.toUpperCase()}`}
          </div>
        </div>
      </div>
    );
  }
