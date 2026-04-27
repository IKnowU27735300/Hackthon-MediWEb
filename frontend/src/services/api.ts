import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  onSnapshot,
  deleteDoc,
  updateDoc,
  collectionGroup,
  orderBy,
  limit,
  or,
  and,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const parseDate = (val: any) => {
  if (!val) return new Date();
  if (val instanceof Timestamp) return val.toDate();
  if (val?.seconds) return new Date(val.seconds * 1000);
  if (val instanceof Date) return val;
  return new Date(val);
};

export function subscribeToDashboardSummary(businessId: string, callback: (data: any) => void, role?: string, userId?: string) {
  if (!businessId) return () => {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const state = {
    bookings: [],
    contacts: [],
    inventory: [],
    history: []
  };

  const emit = () => {
    callback({
      bookings: {
        today: state.bookings.filter((b: any) => {
          const d = parseDate(b.startTime);
          return d >= today && d < tomorrow;
        }).length,
        upcoming: state.bookings.filter((b: any) => parseDate(b.startTime) >= today).length,
        completed: state.bookings.filter((b: any) => b.status === "completed").length,
        no_show: state.bookings.filter((b: any) => b.status === "no-show").length,
      },
      leads: {
        total: state.contacts.length,
        new: state.contacts.filter((c: any) => {
          const d = parseDate(c.createdAt);
          return (new Date().getTime() - d.getTime()) < 86400000;
        }).length
      },
      inventory_alerts: state.inventory.filter((i: any) => i.quantity <= i.threshold),
      all_bookings: state.bookings,
      all_contacts: state.contacts,
      all_inventory: state.inventory,
      all_history: state.history
    });
  };

  const handleError = (collectionName: string, err: any) => {
    console.error(`Firestore subscription error (${collectionName}):`, err);
  };

  // Base Collections
  const bookingsRef = collection(db, 'businesses', businessId, 'bookings');
  const contactsRef = collection(db, 'businesses', businessId, 'contacts');
  const inventoryRef = collection(db, 'businesses', businessId, 'inventory');
  const historyRef = collection(db, 'businesses', businessId, 'stock_history');

  // Subscription Handles
  let unsubBookings = () => {};
  let unsubContacts = () => {};
  let unsubInventory = () => {};
  let unsubHistory = () => {};

  // 1. INVENTORY (Visible to everyone)
  const inventoryQuery = inventoryRef;
  unsubInventory = onSnapshot(inventoryQuery, (snap) => {
    state.inventory = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
    emit();
  }, (err) => handleError('inventory', err));

  // 2. BOOKINGS & CONTACTS (Restricted for Suppliers who are not owners)
  // Check if user is allowed to view clinical data
  const isClinicalStaff = role === 'doctor' || role === 'assistant' || userId === businessId;

  if (isClinicalStaff && role !== 'supplier') {
    const bookingsQuery = bookingsRef;
    const contactsQuery = contactsRef;

    unsubBookings = onSnapshot(bookingsQuery, (snap) => {
      state.bookings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
      emit();
    }, (err) => handleError('bookings', err));

    unsubContacts = onSnapshot(contactsQuery, (snap) => {
      state.contacts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
      emit();
    }, (err) => handleError('contacts', err));
  }

  // 3. HISTORY / REQUESTS (Clinical staff see their clinic; Suppliers see assigned/pending)
  if (role === 'supplier') {
    // Suppliers see prescriptions across all clinics
    // We use collectionGroup but simplify the query to avoid complex index requirements
    const historyQuery = query(
      collectionGroup(db, 'stock_history'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    unsubHistory = onSnapshot(historyQuery, (snap) => {
      state.history = snap.docs.map(doc => ({ 
        id: doc.id, 
        businessId: doc.ref.parent.parent?.id, 
        ...doc.data() 
      })).filter((doc: any) => 
        // Filter in-memory for security/relevance if needed, 
        // but here we show all pending requests in the network
        !doc.supplierId || doc.supplierId === userId
      ) as any;
      emit();
    }, (err) => {
      handleError('history_group', err);
    });
  } else if (isClinicalStaff) {
    // Clinical staff see history for their specific clinic
    const historyQuery = query(historyRef, orderBy('createdAt', 'desc'), limit(50));
    unsubHistory = onSnapshot(historyQuery, (snap) => {
      state.history = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
      emit();
    }, (err) => handleError('history', err));
  }

  return () => {
    unsubBookings();
    unsubContacts();
    unsubInventory();
    unsubHistory();
  };
}

export async function fetchDashboardSummary(businessId: string) {
  if (!businessId) return null;

  try {
    // 0. Check if business exists
    const businessRef = doc(db, 'businesses', businessId);
    const businessSnap = await getDoc(businessRef);
    
    if (!businessSnap.exists()) {
      return null; // Return null if onboarding isn't complete
    }

    // Still useful for a quick check or SSR
    const [bookingsSnap, contactsSnap, inventorySnap] = await Promise.all([
      getDocs(collection(db, 'businesses', businessId, 'bookings')),
      getDocs(collection(db, 'businesses', businessId, 'contacts')),
      getDocs(collection(db, 'businesses', businessId, 'inventory'))
    ]);

    const bookings = bookingsSnap.docs.map(doc => doc.data());
    const contacts = contactsSnap.docs.map(doc => doc.data());
    const inventory = inventorySnap.docs.map(doc => doc.data());

    // Process data logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      bookings: {
        today: bookings.filter((b: any) => {
          const d = parseDate(b.startTime);
          return d >= today && d < tomorrow;
        }).length,
        upcoming: bookings.filter((b: any) => parseDate(b.startTime) >= today).length,
        completed: bookings.filter((b: any) => b.status === "completed").length,
        no_show: bookings.filter((b: any) => b.status === "no-show").length,
      },
      leads: {
        total: contacts.length,
        new: contacts.filter((c: any) => {
          const d = parseDate(c.createdAt);
          return (new Date().getTime() - d.getTime()) < 86400000;
        }).length
      },
      inventory_alerts: inventory.filter((i: any) => i.quantity <= i.threshold)
    };
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    throw error;
  }
}

export async function createWorkspace(businessId: string, data: any) {
  const businessRef = doc(db, 'businesses', businessId);
  await setDoc(businessRef, {
    ...data,
    onboarding_step: 1,
    is_active: false,
    createdAt: serverTimestamp()
  }, { merge: true });
  return { status: 'success', businessId };
}

export async function submitContactForm(businessId: string, contactData: any) {
  const contactsRef = collection(db, 'businesses', businessId, 'contacts');
  await addDoc(contactsRef, {
    ...contactData,
    createdAt: serverTimestamp()
  });
  return { status: 'success' };
}

export async function createBooking(businessId: string, bookingData: any) {
  try {
    // 1. Get the business details to retrieve Google Token
    const businessRef = doc(db, 'businesses', businessId);
    const businessSnap = await getDoc(businessRef);
    const businessData = businessSnap.data();

    // 2. Save booking to Firestore
    const bookingsRef = collection(db, 'businesses', businessId, 'bookings');
    const docRef = await addDoc(bookingsRef, {
      ...bookingData,
      status: 'upcoming',
      createdAt: serverTimestamp()
    });

    // 2b. Automatically create/update Contact (Patient) record
    const contactsRef = collection(db, 'businesses', businessId, 'contacts');
    // We'll use email as a simple unique identifier for this demo
    const q = query(contactsRef, where("email", "==", bookingData.customerEmail));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      await addDoc(contactsRef, {
        name: bookingData.customerName,
        email: bookingData.customerEmail,
        phone: bookingData.customerPhone,
        createdAt: serverTimestamp()
      });
    }

    // 3. Optional: Sync with Google Calendar if token exists
    if (businessData?.googleAccessToken) {
      try {
        const event = {
          'summary': `Appointment: ${bookingData.customerName}`,
          'description': `Service: ${bookingData.service}\nPhone: ${bookingData.customerPhone}`,
          'start': {
            'dateTime': bookingData.startTime, // Assuming ISO string from UI
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          'end': {
            'dateTime': bookingData.endTime, // Assuming ISO string from UI
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        };

        await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${businessData.googleAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        });
      } catch (gErr) {
        console.error("Google Calendar Sync failed:", gErr);
        // We don't fail the whole booking if calendar sync fails
      }
    }

    // 4. Create Inbox Thread with Automated Message
    await sendMessage(businessId, bookingData.customerEmail, {
      content: `[Automated] Welcome ${bookingData.customerName}! We have received your booking request for ${bookingData.service}. Our team will review it shortly.`,
      sender: 'system',
      customerName: bookingData.customerName
    });

    return { status: 'success', bookingId: docRef.id };
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
}

export async function assignFormToAssistant(businessId: string, bookingId: string, assistantId: string) {
  const bookingRef = doc(db, 'businesses', businessId, 'bookings', bookingId);
  const bookingSnap = await getDoc(bookingRef);
  
  if (bookingSnap.exists()) {
    const bookingData = bookingSnap.data();
    await setDoc(bookingRef, {
      status: 'pending_review', // Workflow transition: Shared with assistant = Handover Pending Review
      assignedToAssistant: true, 
      assignedAssistantId: assistantId,
      assignedAt: serverTimestamp()
    }, { merge: true });

    // Propagate sharing to the Contact (Medical Record)
    const contactsRef = collection(db, 'businesses', businessId, 'contacts');
    const q = query(contactsRef, where("email", "==", bookingData.customerEmail));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const contactId = querySnapshot.docs[0].id;
      await setDoc(doc(db, 'businesses', businessId, 'contacts', contactId), {
        sharedWithAssistant: true,
        assignedAssistantId: assistantId,
        lastSharedAt: serverTimestamp()
      }, { merge: true });

      const historyRef = collection(db, 'businesses', businessId, 'stock_history');
      const histQ = query(historyRef, where("patientEmail", "==", bookingData.customerEmail));
      const histSnap = await getDocs(histQ);
      for (const histDoc of histSnap.docs) {
        await setDoc(doc(db, 'businesses', businessId, 'stock_history', histDoc.id), {
          assignedAssistantId: assistantId,
          sharedWithAssistant: true
        }, { merge: true });
      }
    }

    // --- AGENTIC PIPELINE TRIGGER ---
    // Generate an automated clinical briefing for the assistant
    const briefingContent = `[CLINICAL AGENT BRIEF] 
A new medical record review has been delegated to you.
PATIENT: ${bookingData.customerName}
SERVICE: ${bookingData.service}
URGENCY: Standard Clinical Review
INSTRUCTIONS: Please analyze the digital intake submission for any pre-existing conditions or allergy flags before the doctor's final assessment.`;

    await sendInternalMessage(businessId, assistantId, {
      content: briefingContent,
      sender: 'agent',
      status: 'briefing',
      patientName: bookingData.customerName
    });
  }

  // --- AUTO-CONNECT: Ensure assistant is linked to this clinic ---
  // If this is a freelance assistant (no businessId), link them to this doctor so they can access the dashboard.
  try {
    const assistantRef = doc(db, 'businesses', assistantId);
    const assistantSnap = await getDoc(assistantRef);
    if (assistantSnap.exists()) {
      const asstData = assistantSnap.data();
      if (!asstData.businessId) {
        await setDoc(assistantRef, { businessId: businessId }, { merge: true });
        console.log(`Auto-linked assistant ${assistantId} to clinic ${businessId}`);
      }
    }
  } catch (err) {
    console.warn("Assistant linking failed:", err);
  }

  return { status: 'success' };
}

export async function acceptForm(businessId: string, bookingId: string, patientEmail: string, patientName: string) {
  const bookingRef = doc(db, 'businesses', businessId, 'bookings', bookingId);
  
  // 1. Update clinical status
  await setDoc(bookingRef, {
    status: 'scheduled',
    acceptedAt: serverTimestamp()
  }, { merge: true });

  // 2. Automated Response to Patient requesting medical history
  await sendMessage(businessId, patientEmail, {
    content: `[CLINICAL UPDATE] Your intake form has been reviewed and accepted by the doctor. 

To finalize your clinical profile and ensure an accurate assessment during our meeting, please reply to this message with any previous medical reports, laboratory results, or prescriptions you may have. 

Once received, we will move forward with scheduling your appointment according to the doctor's current availability.`,
    sender: 'doctor',
    customerName: patientName,
    type: 'request_reports'
  });

  return { status: 'success' };
}

export async function sendInternalMessage(businessId: string, assistantId: string, messageData: any) {
  const messagesRef = collection(db, 'businesses', businessId, 'internal_chats', assistantId, 'messages');
  await addDoc(messagesRef, {
    ...messageData,
    timestamp: serverTimestamp()
  });

  const chatRef = doc(db, 'businesses', businessId, 'internal_chats', assistantId);
  await setDoc(chatRef, {
    lastMsg: messageData.content,
    lastMsgTime: serverTimestamp(),
    assistantId: assistantId,
    lastSender: messageData.sender
  }, { merge: true });
}

export function subscribeToInternalMessages(businessId: string, assistantId: string, callback: (messages: any[]) => void) {
  if (!businessId || !assistantId || businessId === 'undefined' || assistantId === 'undefined') return () => {};
  
  const q = query(collection(db, 'businesses', businessId, 'internal_chats', assistantId, 'messages'));
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(msgs.sort((a: any, b: any) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)));
  }, (err) => {
    console.warn(`Internal Chat Error (${assistantId}):`, err);
    callback([]);
  });
}

export async function updateUserActivity(uid: string) {
  if (!uid) return;
  const userRef = doc(db, 'businesses', uid);
  await setDoc(userRef, { lastActive: serverTimestamp() }, { merge: true });
}

export async function fetchActiveAssistants() {
  try {
    const q = query(collection(db, 'businesses'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.warn("Clinical network restricted by Firebase Security Rules. Using local discovery.");
    return [];
  }
}

export function subscribeToActiveStaff(callback: (staff: any[]) => void) {
  const q = query(collection(db, 'businesses'));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(list);
  }, (err) => {
    console.error("Staff subscription failed:", err);
  });
}

export async function updateBookingStatus(businessId: string, bookingId: string, status: 'upcoming' | 'scheduled' | 'completed' | 'no-show' | 'rejected') {
  try {
    const businessRef = doc(db, 'businesses', businessId);
    const bookingRef = doc(db, 'businesses', businessId, 'bookings', bookingId);
    
    const [bizSnap, bookingSnap] = await Promise.all([
      getDoc(businessRef),
      getDoc(bookingRef)
    ]);

    if (!bizSnap.exists() || !bookingSnap.exists()) {
      // If the booking was deleted or doesn't exist, we still want to try to update if possible 
      // but we can't trigger emails with missing data.
      await setDoc(bookingRef, { status, updatedAt: serverTimestamp() }, { merge: true });
      return { status: 'success' };
    }

    const bizData = bizSnap.data();
    const bookingData = bookingSnap.data();
    const customerName = bookingData?.customerName || bookingData?.name || 'Patient';
    const customerEmail = bookingData?.customerEmail || bookingData?.email;

    // 1. Update Firestore
    await setDoc(bookingRef, { status, updatedAt: serverTimestamp() }, { merge: true });

    // 2. Trigger Professional Email (Simulated for Hackathon)
    if (customerEmail) {
      const isAccepted = status === 'completed';
      const subject = isAccepted 
        ? `Confirmed: Your appointment with ${bizData?.businessName || 'MediWeb'}`
        : `Update: Your appointment request at ${bizData?.businessName || 'MediWeb'}`;

      const bookingDate = parseDate(bookingData?.startTime);
      const professionalEmailLink = `mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
        isAccepted 
        ? `Dear ${customerName},\n\nThis is a professional confirmation that your appointment for ${bookingData?.service} has been ACCEPTED.\n\nDate: ${bookingDate.toLocaleDateString()}\nTime: ${bookingDate.toLocaleTimeString()}\n\nWe look forward to seeing you.\n\nBest regards,\n${bizData?.businessName || 'The Medical Team'}`
        : `Dear ${customerName},\n\nThank you for reaching out to us. Regarding your appointment request for ${bookingData?.service}, we unfortunately cannot accommodate this specific slot at this time.\n\nWe invite you to book an alternative time via our portal. We apologize for any inconvenience.\n\nBest regards,\n${bizData?.businessName || 'The Medical Team'}`
      )}`;
      
      console.log(`%c EMAIL DISPATCHED TO: ${customerEmail}`, "color: #10b981; font-weight: bold; font-size: 12px;");
    }

    // 3. Send Message to Inbox
    if (customerEmail) {
      if (status === 'completed') {
        await sendMessage(businessId, customerEmail, {
          content: `Dear ${customerName}, your appointment has been accepted. Please share your previous medical history certificates and any relevant radiology reports for review before your visit.`,
          sender: 'staff',
          customerName: customerName
        });
      } else {
        await sendMessage(businessId, customerEmail, {
          content: `Update: Your appointment request for ${bookingData?.service} status has been updated to: ${status.toUpperCase()}.`,
          sender: 'system',
          customerName: customerName
        });
      }
    }

    return { status: 'success' };
  } catch (err) {
    console.error("Status update + Email failed:", err);
    throw err;
  }
}

export async function seedFakeBooking(businessId: string) {
  const startTime = new Date();
  startTime.setHours(startTime.getHours() + 2);
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + 45);

  return createBooking(businessId, {
    customerName: "Alex Rivera",
    customerEmail: "alex@example.com",
    customerPhone: "+1 (555) 012-3456",
    service: "Initial Consultation",
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    status: "upcoming"
  });
}

export async function seedStaff(businessId: string) {
  const assistants = [
    {
      displayName: "Sarah Chen",
      email: "sarah.chen@mediweb.clinic",
      role: "assistant",
      lastActive: serverTimestamp(),
      profileCompleted: true,
      businessId: businessId // Link to this doctor
    },
    {
      displayName: "James Wilson",
      email: "j.wilson@mediweb.clinic",
      role: "assistant",
      lastActive: serverTimestamp(),
      profileCompleted: true,
      businessId: businessId // Link to this doctor
    }
  ];

  for (const a of assistants) {
    await addDoc(collection(db, 'businesses'), {
      ...a,
      createdAt: serverTimestamp()
    });
  }
}

export async function seedFakeData(businessId: string) {
  try {
    // 1. Seed a patient
    const contactsRef = collection(db, 'businesses', businessId, 'contacts');
    await addDoc(contactsRef, {
      name: "Marcus Aurelius",
      email: "marcus@rome.gov",
      phone: "+1 (999) 001-0002",
      createdAt: serverTimestamp()
    });

    // 2. Seed inventory items
    const inventoryRef = collection(db, 'businesses', businessId, 'inventory');
    await addDoc(inventoryRef, {
      name: "Surgical Masks (Box)",
      quantity: 3,
      threshold: 10,
      updatedAt: serverTimestamp()
    });
    await addDoc(inventoryRef, {
      name: "Saline Solution 500ml",
      quantity: 45,
      threshold: 15,
      updatedAt: serverTimestamp()
    });

    // 3. Seed a booking
    await seedFakeBooking(businessId);
    
    // 4. Seed staff
    await seedStaff(businessId);
    
    return { status: 'success' };
  } catch (error) {
    console.error("Seeding failed:", error);
    throw error;
  }
}

export async function updateInventoryItem(businessId: string, itemId: string, data: any) {
  const itemRef = doc(db, 'businesses', businessId, 'inventory', itemId);
  await setDoc(itemRef, {
    ...data,
    updatedAt: serverTimestamp()
  }, { merge: true });
  return { status: 'success' };
}
export async function logStockActions(businessId: string, data: any) {
  try {
    const { patientName, patientEmail, actions, prescriptionNotes, supplierId, doctorId } = data;
    
    // 1. Resolve Assistant Visibility
    let finalAssistantId = data.assignedAssistantId;
    let sharedWithAssistant = data.sharedWithAssistant ?? (!!finalAssistantId);

    if (!finalAssistantId && patientEmail) {
      // If not passed explicitly, try to fetch from existing patient record
      const pRef = collection(db, 'businesses', businessId, 'contacts');
      const q = query(pRef, where("email", "==", patientEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const pData = snap.docs[0].data();
        finalAssistantId = pData.assignedAssistantId || null;
        sharedWithAssistant = pData.sharedWithAssistant || false;
      }
    }

    const isRequest = !!supplierId || !!finalAssistantId || actions.some((a: any) => a.action === 'Stock In');

    for (const action of actions) {
      if (!action.itemName) continue;

      const itemNameTrimmed = action.itemName.trim();
      const q = query(collection(db, 'businesses', businessId, 'inventory'), where("name", "==", itemNameTrimmed));
      const querySnapshot = await getDocs(q);
      
      let itemRef;
      let currentQty = 0;

      if (!querySnapshot.empty) {
        const itemDoc = querySnapshot.docs[0];
        itemRef = doc(db, 'businesses', businessId, 'inventory', itemDoc.id);
        currentQty = itemDoc.data().quantity || 0;
      } else {
        const inventoryRef = collection(db, 'businesses', businessId, 'inventory');
        const newDoc = await addDoc(inventoryRef, {
          name: action.itemName,
          quantity: 0,
          threshold: 5,
          category: 'Medical',
          updatedAt: serverTimestamp()
        });
        itemRef = newDoc;
      }

      const amount = Number(action.amount) || 0;
      const adjustment = action.action === 'Stock In' ? amount : -amount;

      // Only update inventory immediately if NOT a supplier request
      if (!supplierId) {
        await updateDoc(itemRef, {
          quantity: increment(adjustment),
          lastPatient: patientName,
          updatedAt: serverTimestamp()
        });
      }
    }

    // 2. Save a permanent record of this "order" session
    const historyRef = collection(db, 'businesses', businessId, 'stock_history');
    
    // Fetch clinic info to enrich the history record
    const clinicDoc = await getDoc(doc(db, 'businesses', businessId));
    const clinicData = clinicDoc.exists() ? clinicDoc.data() : {};

    await addDoc(historyRef, {
      patientName,
      patientEmail: patientEmail || null,
      assignedAssistantId: finalAssistantId,
      sharedWithAssistant: sharedWithAssistant,
      supplierId: supplierId || null,
      doctorId: doctorId || null,
      clinicName: clinicData.clinicName || clinicData.displayName || 'Clinic',
      clinicLocation: clinicData.location || '',
      status: isRequest ? 'pending' : 'accepted',
      items: actions,
      prescriptionNotes: prescriptionNotes || '',
      createdAt: serverTimestamp()
    });

    return { status: 'success' };
  } catch (error: any) {
    console.error("Clinical Stock Log Failed:", error.message || error);
    throw new Error(`Critical: ${error.message || 'Database connection lost'}`);
  }
}

export async function rejectStockRequest(businessId: string, requestId: string) {
  const requestRef = doc(db, 'businesses', businessId, 'stock_history', requestId);
  await updateDoc(requestRef, {
    status: 'rejected',
    updatedAt: serverTimestamp()
  });
}

export async function acceptStockRequest(businessId: string, requestId: string) {
  const { auth } = await import('@/lib/firebase');
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Authentication required to accept requests");

  const requestRef = doc(db, 'businesses', businessId, 'stock_history', requestId);
  const snap = await getDoc(requestRef);
  
  if (snap.exists()) {
    const data = snap.data();
    const actions = data.items || [];
    
    // Process the inventory updates for BOTH the clinic AND the supplier
    for (const action of actions) {
      if (!action.itemName) continue;
      
      const itemNameNormalized = action.itemName.trim();
      const amount = Number(action.amount) || 0;
      const adjustment = action.action === 'Stock In' ? amount : -amount;

      // 1. Update CLINIC Inventory
      const clinicQ = query(collection(db, 'businesses', businessId, 'inventory'), where("name", "==", itemNameNormalized));
      const clinicSnap = await getDocs(clinicQ);
      
      if (!clinicSnap.empty) {
        await updateDoc(doc(db, 'businesses', businessId, 'inventory', clinicSnap.docs[0].id), {
          quantity: increment(adjustment),
          lastPatient: data.patientName,
          updatedAt: serverTimestamp()
        });
      }

      // 2. Update SUPPLIER Inventory (The one fulfilling the request)
      // For a supplier, fulfillment means their stock goes DOWN
      const supplierId = currentUser.uid;
      const supplierInvRef = collection(db, 'businesses', supplierId, 'inventory');
      
      // Try to find the item with a case-insensitive match (manual check for better reliability)
      const supplierSnap = await getDocs(supplierInvRef);
      const existingItem = supplierSnap.docs.find(doc => 
        doc.data().name?.toLowerCase().trim() === itemNameNormalized.toLowerCase().trim()
      );
      
      if (existingItem) {
        // Supplier's stock always goes DOWN by the amount requested
        const currentQty = existingItem.data().quantity || 0;
        const newQty = Number(currentQty) - amount;
        
        await updateDoc(doc(db, 'businesses', supplierId, 'inventory', existingItem.id), {
          quantity: newQty, 
          updatedAt: serverTimestamp()
        });
        console.log(`Inventory: Supplier ${supplierId} stock for ${itemNameNormalized} reduced: ${currentQty} -> ${newQty}`);
      } else {
        // Create the item for the supplier if it doesn't exist, starting at negative (dispatched)
        await addDoc(supplierInvRef, {
          name: itemNameNormalized,
          quantity: -amount,
          threshold: 5,
          category: 'Medical',
          updatedAt: serverTimestamp()
        });
        console.log(`Created new item for supplier ${supplierId}: ${itemNameNormalized} (Qty: -${amount})`);
      }
    }

    await setDoc(requestRef, {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      supplierId: currentUser.uid,
      supplierName: currentUser.displayName || currentUser.email || 'Supplier'
    }, { merge: true });

    // 3. Push a structured Clinical Usage Log entry
    // This records dispensation in a dedicated audit trail collection
    const clinicalUsageLogsRef = collection(db, 'businesses', businessId, 'clinical_usage_logs');
    await addDoc(clinicalUsageLogsRef, {
      source: 'supplier_fulfillment',
      requestId: requestId,
      patientName: data.patientName || 'Unknown',
      patientEmail: data.patientEmail || null,
      doctorId: data.doctorId || null,
      supplierId: currentUser.uid,
      supplierName: currentUser.displayName || currentUser.email || 'Supplier',
      prescriptionNotes: data.prescriptionNotes || '',
      assignedAssistantId: data.assignedAssistantId || null,
      clinicName: data.clinicName || '',
      clinicLocation: data.clinicLocation || '',
      itemsDispensed: actions.map((a: any) => ({
        itemName: a.itemName,
        amount: Number(a.amount) || 0,
        action: a.action || 'Stock Out',
        duration: a.duration || ''
      })),
      fulfilledAt: serverTimestamp(),
      createdAt: serverTimestamp()
    });
    console.log(
      `%c CLINICAL USAGE LOG: Recorded dispensation for ${data.patientName} (${actions.length} item(s))`,
      'color: #10b981; font-weight: bold; font-size: 11px;'
    );
  }
  
  return { status: 'success' };
}

// Subscribe to clinical usage logs for a given clinic (real-time)
export function subscribeToClinicalUsageLogs(
  businessId: string,
  callback: (logs: any[]) => void
) {
  if (!businessId) return () => {};
  const q = query(
    collection(db, 'businesses', businessId, 'clinical_usage_logs'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => {
    console.warn('Clinical usage logs subscription error:', err);
    callback([]);
  });
}

export function subscribeToPatientHistory(businessId: string, patientName: string, callback: (logs: any[]) => void) {
  const q = query(
    collection(db, 'businesses', businessId, 'stock_history'),
    where("patientName", "==", patientName)
  );

  return onSnapshot(q, (snap) => {
    const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(logs);
  });
}

// --- MESSAGING SYSTEM ---

export async function sendMessage(businessId: string, customerEmail: string, messageData: any) {
  const messagesRef = collection(db, 'businesses', businessId, 'customer_chats', customerEmail, 'messages');
  await addDoc(messagesRef, {
    ...messageData,
    timestamp: serverTimestamp()
  });

  // Update conversation metadata
  const inboxRef = doc(db, 'businesses', businessId, 'customer_chats', customerEmail);
  const metadata: any = {
    lastMsg: messageData.content,
    lastMsgTime: serverTimestamp(),
    customerEmail: customerEmail,
    unread: messageData.sender !== 'staff'
  };

  if (messageData.customerName) {
    metadata.customerName = messageData.customerName;
  }

  await setDoc(inboxRef, metadata, { merge: true });
}

export function subscribeToInbox(businessId: string, callback: (conversations: any[]) => void) {
  if (!businessId || businessId === 'undefined') return () => {};
  
  return onSnapshot(collection(db, 'businesses', businessId, 'customer_chats'), (snap) => {
    const conversations = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(conversations);
  }, (err) => {
    console.warn("Inbox subscription failed:", err);
    callback([]);
  });
}

export function subscribeToMessages(businessId: string, customerEmail: string, callback: (messages: any[]) => void) {
  if (!businessId || !customerEmail || businessId === 'undefined' || customerEmail === 'undefined') return () => {};
  
  const q = query(collection(db, 'businesses', businessId, 'customer_chats', customerEmail, 'messages'));
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(msgs.sort((a: any, b: any) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)));
  }, (err) => {
    console.warn("Message thread failed:", err);
    callback([]);
  });
}

export async function bulkUpdateInventory(businessId: string, items: any[]) {
  const inventoryRef = collection(db, 'businesses', businessId, 'inventory');
  for (const item of items) {
    if (!item.name) continue;
    
    const q = query(inventoryRef, where("name", "==", item.name));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      await setDoc(doc(inventoryRef, snap.docs[0].id), {
        quantity: Number(item.quantity) || 0,
        threshold: Number(item.threshold) || 5,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } else {
      await addDoc(inventoryRef, {
        name: item.name,
        quantity: Number(item.quantity) || 0,
        threshold: Number(item.threshold) || 5,
        updatedAt: serverTimestamp(),
        category: 'Medical'
      });
    }
  }
  return { status: 'success' };
}

export async function fetchPatientContext(businessId: string, patientEmail: string, patientName: string) {
  try {
    const contactsRef = collection(db, 'businesses', businessId, 'contacts');
    const q = query(contactsRef, where("email", "==", patientEmail));
    const snap = await getDocs(q);
    
    let report = "";
    let medicalLogs: any[] = [];
    let personalInfo: any = {};

    if (!snap.empty) {
      const contactDoc = snap.docs[0];
      const contactId = contactDoc.id;
      personalInfo = { id: contactId, ...contactDoc.data() };

      const reportRef = doc(db, 'businesses', businessId, 'contacts', contactId, 'private', 'report');
      const reportSnap = await getDoc(reportRef);
      if (reportSnap.exists()) {
        report = reportSnap.data().content || "";
      }
    }

    const historyRef = collection(db, 'businesses', businessId, 'stock_history');
    const hQ = query(historyRef, where("patientName", "==", patientName));
    const hSnap = await getDocs(hQ);
    medicalLogs = hSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    return { personalInfo, report, medicalLogs };
  } catch (err) {
    console.error("Patient context fetch failed:", err);
    return null;
  }
}

export async function deleteChat(businessId: string, chatId: string, type: 'patients' | 'staff') {
  const path = type === 'patients' ? 'customer_chats' : 'internal_chats';
  const chatRef = doc(db, 'businesses', businessId, path, chatId);
  await deleteDoc(chatRef);
}

// --- NEW PATIENT-CENTRIC SYSTEM (SEPARATE STORAGE) ---

export async function savePatientProfile(uid: string, profileData: any) {
  const patientRef = doc(db, 'patients', uid);
  await setDoc(patientRef, {
    ...profileData,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function sendPatientMessage(businessId: string, patientUid: string, messageData: any) {
  const chatId = `${businessId}_${patientUid}`;
  const messagesRef = collection(db, 'patient_chats', chatId, 'messages');
  
  await addDoc(messagesRef, {
    ...messageData,
    timestamp: serverTimestamp()
  });

  // Update conversation metadata in the separate patient_chats collection
  const chatRef = doc(db, 'patient_chats', chatId);
  await setDoc(chatRef, {
    businessId,
    patientUid,
    patientName: messageData.customerName || 'Patient',
    patientEmail: messageData.customerEmail,
    lastMsg: messageData.content,
    lastMsgTime: serverTimestamp(),
    unread: messageData.sender !== 'staff' && messageData.sender !== 'doctor',
    type: 'patient_chat'
  }, { merge: true });
}

export function subscribeToPatientInbox(businessId: string, callback: (conversations: any[]) => void) {
  if (!businessId || businessId === 'undefined') return () => {};
  
  const q = query(
    collection(db, 'patient_chats'), 
    where('businessId', '==', businessId)
  );

  return onSnapshot(q, (snap) => {
    const conversations = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(conversations);
  }, (err) => {
    console.warn("Patient Inbox subscription failed:", err);
    callback([]);
  });
}

export function subscribeToPatientMessages(businessId: string, patientUid: string, callback: (messages: any[]) => void) {
  const chatId = `${businessId}_${patientUid}`;
  const q = query(collection(db, 'patient_chats', chatId, 'messages'));
  
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(msgs.sort((a: any, b: any) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)));
  }, (err) => {
    console.error("Patient messages subscription failed:", err);
    callback([]);
  });
}

export async function savePatientForm(businessId: string, uid: string, data: any) {
  // 1. Update/Save Patient Global Profile
  const patientRef = doc(db, 'patients', uid);
  await setDoc(patientRef, {
    name: data.name,
    email: data.email,
    phone: data.phone,
    age: data.age || null,
    gender: data.gender || null,
    updatedAt: serverTimestamp()
  }, { merge: true });

  // 2. Save Medical Entry to Patient's History (Separate)
  const historyRef = collection(db, 'patients', uid, 'medical_history');
  await addDoc(historyRef, {
    businessId,
    service: data.service,
    details: data.details || "Initial Inquiry",
    timestamp: serverTimestamp()
  });

  // 3. Initialize Chat in the separate patient_chats collection
  const chatId = `${businessId}_${uid}`;
  const chatRef = doc(db, 'patient_chats', chatId);
  await setDoc(chatRef, {
    businessId,
    patientUid: uid,
    patientName: data.name,
    patientEmail: data.email,
    lastMsg: `Form Submitted: ${data.service}`,
    lastMsgTime: serverTimestamp(),
    unread: true,
    type: 'patient_chat'
  }, { merge: true });

  // 4. Create traditional booking for the clinic dashboard
  const bookingsRef = collection(db, 'businesses', businessId, 'bookings');
  await addDoc(bookingsRef, {
    customerName: data.name,
    customerEmail: data.email,
    customerPhone: data.phone,
    patientUid: uid, // Link to separate data
    service: data.service,
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 1800000).toISOString(),
    status: 'upcoming',
    note: "Submitted via online form"
  });
}
