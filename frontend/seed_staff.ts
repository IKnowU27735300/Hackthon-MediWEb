
import { db } from './src/lib/firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';

async function seedAssistants() {
  console.log("Seeding real clinical assistants...");
  
  const assistants = [
    {
      displayName: "Sarah Chen",
      email: "sarah.chen@mediweb.clinic",
      role: "assistant",
      lastActive: serverTimestamp(),
      profileCompleted: true
    },
    {
      displayName: "Dr. James Wilson (Lead Assistant)",
      email: "j.wilson@mediweb.clinic",
      role: "assistant",
      lastActive: serverTimestamp(),
      profileCompleted: true
    }
  ];

  for (const a of assistants) {
    // We'll use a dummy ID for testing visibility if needed, or just addDoc
    await addDoc(collection(db, 'businesses'), {
      ...a,
      createdAt: serverTimestamp()
    });
    console.log(`Added: ${a.displayName}`);
  }
}

seedAssistants();
