// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getApps } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore,doc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

// // // Firebase 설정 값
// const firebaseConfig = {
//   apiKey: "AIzaSyDFewDD1sGtsBJVLsjykPo0xvUdt303yaE",
//   authDomain: "v-chat-ade97.firebaseapp.com",
//   databaseURL: "https://v-chat-ade97-default-rtdb.asia-southeast1.firebasedatabase.app",
//   projectId: "v-chat-ade97",
//   storageBucket: "v-chat-ade97.firebasestorage.app",
//   messagingSenderId: "516860045570",
//   appId: "1:516860045570:web:41593b8fe20e801bdcba1b",
//   measurementId: "G-J2YPZM2LEG"
// };

// Firebase 설정 값2
const firebaseConfig = {
  apiKey: "AIzaSyASOjfYQ8sbbM3E8zzR7m35zpJvklQ8gB0",
  authDomain: "v-talk-1f552.firebaseapp.com",
  databaseURL: "https://v-talk-1f552-default-rtdb.firebaseio.com",
  projectId: "v-talk-1f552",
  storageBucket: "v-talk-1f552.firebasestorage.app",
  messagingSenderId: "563843573392",
  appId: "1:563843573392:web:d6c5473a3e00bc18d55a15"
};

// Firebase 설정 값3
// const firebaseConfig = {
//   apiKey: "AIzaSyBB35_xpk7nknpbpqEEgBwxb1hVFiEgtHE",
//   authDomain: "vchat-6bd14.firebaseapp.com",
//   databaseURL: "https://vchat-6bd14-default-rtdb.firebaseio.com",
//   projectId: "vchat-6bd14",
//   storageBucket: "vchat-6bd14.firebasestorage.app",
//   messagingSenderId: "217304490969",
//   appId: "1:217304490969:web:999dc75ced4ec368656fc8",
//   measurementId: "G-GBVS7XZ46Q"
// };

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app);
const storage = getStorage(app);
const myDoc = doc(db, "collection", "documentId");
const firestore = getFirestore(app);

console.log("✅ Firebase 초기화 완료:", app);

export { firestore, app, auth, db, database, storage, myDoc };