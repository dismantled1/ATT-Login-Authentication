import React from 'react';

function Toast({ show, message }) {
  return (
    <div className={`toast ${show ? 'show' : ''}`} id="toast">
      <span className="dot"></span>
      <span id="toastText">{message}</span>
    </div>
  );
}

export default Toast;
