import { getApp, getApps, initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyD7yMBj2pf0MBkEYgynNMgBKM3JFwbE5Rs',
  authDomain: 'iot-smart-tree-system.firebaseapp.com',
  databaseURL: 'https://iot-smart-tree-system-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'iot-smart-tree-system',
  storageBucket: 'iot-smart-tree-system.firebasestorage.app',
  messagingSenderId: '586563514220',
  appId: '1:586563514220:web:72536902732012feb40d49',
  measurementId: 'G-K6VQX6NJND',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const database = getDatabase(app);
