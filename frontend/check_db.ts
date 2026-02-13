
import { db } from './src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function checkDatabase() {
  console.log("Checking businesses collection...");
  const snap = await getDocs(collection(db, 'businesses'));
  snap.forEach(doc => {
    console.log(`ID: ${doc.id} | Data:`, doc.data());
  });
}

checkDatabase();
