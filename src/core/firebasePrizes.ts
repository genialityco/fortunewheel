// src/core/firebasePrizes.ts
import { db } from "../firebaseConfig";
import { collection, getDocs, doc, updateDoc, increment } from "firebase/firestore";

export type FirebasePrize = {
  id: string;
  label: string;
  color: string;
  prob: number;
  cantidad: number;
};

export async function getPrizes(): Promise<FirebasePrize[]> {
  const prizesCol = collection(db, "prizes");
  const snapshot = await getDocs(prizesCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebasePrize));
}

export async function decrementPrize(prizeId: string) {
  const prizeRef = doc(db, "prizes", prizeId);
  await updateDoc(prizeRef, { cantidad: increment(-1) });
}
