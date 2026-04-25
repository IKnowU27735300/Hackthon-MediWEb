"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot, Loader2, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function PatientPortal({ params }: { params: { businessId: string, email: string } }) {
  const decodedEmail = decodeURIComponent(params.email);
  const router = useRouter();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [assignedAssistant, setAssignedAssistant] = useState<any>(null); // Simplified: Just store name/ID?

  useEffect(() => {
    if (!decodedEmail || !params.businessId) return;

    // 1. Subscribe to Chat Metadata (for assignment status)
    const chatDocRef = doc(db, 'businesses', params.businessId, 'customer_chats', decodedEmail);
    const unsubChat = onSnapshot(chatDocRef, (docSnap) => {
       if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.assignedAssistantId) {
             setAssignedAssistant(data.assignedAssistantName || "Medical Assistant");
          }
       }
    }, (err) => {
       console.warn("Chat Metadata restricted or missing:", err);
    });

    // 2. Subscribe to Messages
    const messagesRef = collection(db, 'businesses', params.businessId, 'customer_chats', decodedEmail, 'messages');
    const q = query(messagesRef);
    const unsubMsg = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs.sort((a: any, b: any) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)));
      setLoading(false);
    }, (err) => {
      console.error("Messages subscription failed:", err);
      setLoading(false);
    });

    return () => {
      unsubChat();
      unsubMsg();
    }
  }, [decodedEmail, params.businessId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      const messagesRef = collection(db, 'businesses', params.businessId, 'customer_chats', decodedEmail, 'messages');
      await addDoc(messagesRef, {
        content: inputText,
        sender: 'patient',
        timestamp: serverTimestamp()
      });
      setInputText('');
      
      // Update last message metadata - use setDoc with merge for reliability
      const chatDocRef = doc(db, 'businesses', params.businessId, 'customer_chats', decodedEmail);
      await setDoc(chatDocRef, {
        lastMsg: inputText,
        lastMsgTime: serverTimestamp(),
        customerEmail: decodedEmail,
        unread: true // Flag for doctor
      }, { merge: true });

    } catch (err) {
      console.error("Failed to send", err);
      alert("Error sending message. Please refresh.");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shadow-sm z-10">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
             <Bot size={20} />
           </div>
           <div>
             <h1 className="font-bold text-gray-800 text-sm">Medical Support Chat</h1>
             <p className="text-xs text-green-500 flex items-center gap-1 font-medium">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
               Live Connection
             </p>
           </div>
        </div>
        
        {assignedAssistant && (
           <div className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-bold border border-purple-100 flex items-center gap-2">
              <CheckCircle2 size={12} />
              Assigned to {assignedAssistant}
           </div>
        )}
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-purple-600" />
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                  msg.sender === 'patient' 
                    ? 'bg-purple-600 text-white rounded-br-none' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className={`text-[10px] mt-1 text-right ${msg.sender === 'patient' ? 'text-purple-200' : 'text-gray-400'}`}>
                   {msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                </div>
              </div>
            </motion.div>
          ))
        )}
        
        {messages.length === 0 && !loading && (
          <div className="text-center text-gray-400 text-sm py-10">
            Type a message to start chatting with the doctor.
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3">
          <input 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-gray-100 border-0 rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder:text-gray-400"
            placeholder="Type your medical query..." 
          />
          <button 
            type="submit" 
            disabled={!inputText.trim()}
            className="w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center transition-all shadow-lg shadow-purple-200 disabled:opacity-50 disabled:shadow-none"
          >
            <Send size={18} />
          </button>
        </form>
        <div className="text-center mt-2">
           <p className="text-[10px] text-gray-400">
             Your messages are secure and visible only to the assigned medical staff.
           </p>
        </div>
      </div>
    </div>
  );
}
