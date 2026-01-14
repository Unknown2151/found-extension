// src/utils/toast.js
import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';

export function toast(msg, variant = 'info') {
  const colors = { info: '#6ea8fe', success: '#48c78e', danger: '#f14668' };
  Toastify({
    text: msg,
    duration: 2200,
    gravity: 'top',
    position: 'right',
    style: { background: colors[variant] },
  }).showToast();
}
