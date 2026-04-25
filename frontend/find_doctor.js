
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC54guTb0WrnofHywIsh5GTWee0tmfDEGA",
  authDomain: "aiattendance-9ca58.firebaseapp.com",
  projectId: "aiattendance-9ca58",
  storageBucket: "aiattendance-9ca58.firebasestorage.app",
  messagingSenderId: "609262233779",
  appId: "1:609262233779:web:37c775542953637075a8c6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findDoctor() {
  const q = query(collection(db, 'businesses'), where('email', '==', 'testdoctor@example.com'));
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((doc) => {
    console.log('Doctor UID:', doc.id);
    console.log('Data:', doc.data());
  });
  process.exit(0);
}

findDoctor().catch(err => {
  console.error(err);
  process.exit(1);
});
