// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDnEXcGs2Kg4n_d894V_McpBdOo_pzj2aA",
    authDomain: "christmas-soliton.firebaseapp.com",
    projectId: "christmas-soliton",
    storageBucket: "christmas-soliton.firebasestorage.app",
    messagingSenderId: "311624610114",
    appId: "1:311624610114:web:966cebd79cde1993e498db",
    measurementId: "G-M5XS02H5RG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const firestore = getFirestore(app);
