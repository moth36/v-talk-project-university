// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getApps } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore,doc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";


// Firebase settings
// Replace with your own Firebase project configuration
const firebaseConfig = {
<<<<<<< HEAD
  apiKey: "AIzaSyASOjfYQ8sbbM3E8zzR7m35zpJvklQ8gB0",
  authDomain: "v-talk-1f552.firebaseapp.com",
  databaseURL: "https://v-talk-1f552-default-rtdb.firebaseio.com",
  projectId: "v-talk-1f552",
  storageBucket: "v-talk-1f552.firebasestorage.app",
  messagingSenderId: "563843573392",
  appId: "1:563843573392:web:4c3ce74bfe62ffded55a15"
=======
  apiKey: "your-api-key-here",
  authDomain: "your-auth-domain-here",
  databaseURL: "your-database-url-here",
  projectId: "your-project-id-here",
  storageBucket: "your-storage-bucket-here",
  messagingSenderId: "your-messaging-sender-id-here",
  appId: "your-app-id-here",
>>>>>>> 332968d355b441d804bc0156b4bd9e4204cc41b4
};


const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app);
const storage = getStorage(app);
const myDoc = doc(db, "collection", "documentId");
const firestore = getFirestore(app);

console.log("✅ Firebase 초기화 완료:", app);

export { firestore, app, auth, db, database, storage, myDoc };