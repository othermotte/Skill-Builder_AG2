import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = {
  apiKey: "dummy",
  projectId: "skill-builder-ag2",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const users = await getDocs(collection(db, "users"));
  users.forEach(u => console.log("User:", u.id, u.data().email));

  const attempts = await getDocs(collection(db, "practiceAttempts"));
  let garyAttempts = 0;
  let uniqueGaryAttempts = new Set();
  
  attempts.forEach(a => {
    const data = a.data();
    if (data.userId === 'user-1' || data.userId === 'gary@gardenersnotmechanics.com') { // assuming user-1 based on INITIAL_USERS
      garyAttempts++;
      if (data.completedAt) {
         uniqueGaryAttempts.add(data.microSkillId);
      }
    }
  });

  console.log("Total attempts:", garyAttempts);
  console.log("Unique completed attempts:", uniqueGaryAttempts.size);
  console.log("Unique completed attempt IDs:", Array.from(uniqueGaryAttempts));
  process.exit(0);
}
check();
