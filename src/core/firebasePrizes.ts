import { db } from "../firebaseConfig";
import { collection, getDocs, doc, updateDoc, increment, addDoc, onSnapshot } from "firebase/firestore";

export type FirebasePrize = {
  id: string;
  label: string;
  color: string;
  prob: number;
  cantidad: number;
};

export function subscribePrizes(callback: (prizes: FirebasePrize[]) => void) {
  const prizesCol = collection(db, "prizes");
  return onSnapshot(prizesCol, (snapshot) => {
    const prizes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebasePrize));
    callback(prizes);
  });
}

export async function getPrizes(): Promise<FirebasePrize[]> {
  const prizesCol = collection(db, "prizes");
  const snapshot = await getDocs(prizesCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebasePrize));
}

export async function decrementPrize(prizeId: string) {
  const prizeRef = doc(db, "prizes", prizeId);
  await updateDoc(prizeRef, { cantidad: increment(-1) });
}

export async function updatePrize(prize: FirebasePrize) {
  const { id, label, color, prob, cantidad } = prize;
  const prizeRef = doc(db, "prizes", id);
  await updateDoc(prizeRef, { label, color, prob, cantidad });
}

export async function addPrize(prize: Omit<FirebasePrize, "id">) {
  await addDoc(collection(db, "prizes"), prize);
}