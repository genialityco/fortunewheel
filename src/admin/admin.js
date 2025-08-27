import { db } from '../firebaseConfig.js';
import {
  collection, getDocs, addDoc, updateDoc, doc, deleteDoc
} from 'firebase/firestore';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('prize-form');
  const tableBody = document.querySelector('#prizes-table tbody');
  const loadingDiv = document.getElementById('loading');

  async function fetchPrizes() {
    loadingDiv.style.display = 'block';
    const snapshot = await getDocs(collection(db, 'prizes'));
    tableBody.innerHTML = '';
    snapshot.docs.forEach(docSnap => {
      const prize = docSnap.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${prize.label}</td>
        <td><span style="background:${prize.color};padding:0 12px;border-radius:4px;">${prize.color}</span></td>
        <td><input type="number" min="0" step="0.01" value="${prize.prob}" data-id="${docSnap.id}" data-field="prob"></td>
        <td><input type="number" min="0" value="${prize.cantidad}" data-id="${docSnap.id}" data-field="cantidad"></td>
        <td><button data-id="${docSnap.id}" class="delete-btn">Eliminar</button></td>
      `;
      tableBody.appendChild(tr);
    });
    loadingDiv.style.display = 'none';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const label = document.getElementById('label').value;
    const color = document.getElementById('color').value;
    const prob = parseFloat(document.getElementById('prob').value);
    const cantidad = parseInt(document.getElementById('cantidad').value);
    await addDoc(collection(db, 'prizes'), { label, color, prob, cantidad });
    form.reset();
    fetchPrizes();
  });

  tableBody.addEventListener('change', async (e) => {
    const target = e.target;
    if (target.tagName === 'INPUT') {
      const id = target.getAttribute('data-id');
      const field = target.getAttribute('data-field');
      const value = field === 'prob' ? parseFloat(target.value) : parseInt(target.value);
      await updateDoc(doc(db, 'prizes', id), { [field]: value });
      fetchPrizes();
    }
  });

  tableBody.addEventListener('click', async (e) => {
    const target = e.target;
    if (target.classList.contains('delete-btn')) {
      const id = target.getAttribute('data-id');
      await deleteDoc(doc(db, 'prizes', id));
      fetchPrizes();
    }
  });

  fetchPrizes();
});
