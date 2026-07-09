import React, { useEffect, useRef, useState } from 'react';
import { FaEye, FaEyeSlash } from "react-icons/fa";

const ENCRYPTION_KEY = 'SDLC-AUTH-KEY-2026-SECURE-V1';

const encryptPassword = (password) => {
  let xored = '';
  for (let i = 0; i < password.length; i += 1) {
    const charCode = password.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    xored += String.fromCharCode(charCode);
  }
  return btoa(xored);
};

function LoginScreen({ users, onLoginSuccess, onAddAuditLog }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [auditMessage, setAuditMessage] = useState('awaiting credentials...');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const auditLineRef = useRef(null);
  
  const cycleAuditLine = (msg) => {
    if (auditLineRef.current) {
      auditLineRef.current.style.opacity = '0';
      setTimeout(() => {
        setAuditMessage(msg);
        if (auditLineRef.current) auditLineRef.current.style.opacity = '1';
      }, 150);
    } else {
      setAuditMessage(msg);
    }
  };

  useEffect(() => {
    if (isVerifying) return;
    if (userId.trim().length > 0) {
      cycleAuditLine(password.length > 0 ? 'verifying signature...' : 'checking directory...');
    } else {
      cycleAuditLine('awaiting credentials...');
    }
  }, [userId, password, isVerifying]);

  const tryLocalDemoLogin = (trimmedUid) => {
    const localUser = users.find((user) => user.uid === trimmedUid && user.pw === password);
    if (!localUser) return false;

    if (localUser.status === 'revoked') {
      setError('Your account has been revoked. Please contact your administrator.');
      cycleAuditLine('rejected - account revoked');
      onAddAuditLog('access_denied', `${trimmedUid} - account revoked`, 'rejected');
      setIsVerifying(false);
      return true;
    }

    if (localUser.status === 'suspended') {
      setError('Your account has been suspended. Please contact your administrator.');
      cycleAuditLine('rejected - account suspended');
      onAddAuditLog('access_denied', `${trimmedUid} - account suspended`, 'rejected');
      setIsVerifying(false);
      return true;
    }

    // Feature 5: Expired account check
    if (localUser.expiryDate) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const exp = new Date(localUser.expiryDate);
      exp.setHours(0, 0, 0, 0);
      if (exp < now) {
        setError('Your account has expired. Please contact your administrator to renew your access.');
        cycleAuditLine('rejected - account expired');
        onAddAuditLog('access_denied', `${trimmedUid} - account expired`, 'rejected');
        setIsVerifying(false);
        return true;
      }
    }

    localStorage.setItem('att_access_token', 'local-demo-token');
    cycleAuditLine('access granted - local demo mode');
    onAddAuditLog('access_granted', `${trimmedUid} - local demo login`, 'granted');
    setTimeout(() => onLoginSuccess(localUser), 350);
    return true;
  };

  const handleLogin = async () => {
    if (isVerifying) return;

    const trimmedUid = userId.trim();
    if (!trimmedUid || !password) return;

    setError('');
    setIsVerifying(true);
    cycleAuditLine('checking directory...');

    try {
      const encryptedPassword = encryptPassword(password);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedUid,
          password: encryptedPassword
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (tryLocalDemoLogin(trimmedUid)) return;
        setError(responseData.message || 'Invalid user ID or password.');
        cycleAuditLine('rejected - invalid credentials');
        onAddAuditLog('invalid_or_expired_token', `${trimmedUid} - login rejected`, 'rejected');
        setIsVerifying(false);
        return;
      }

      // Feature 7: Revoked user check
      const localUser = users.find((user) => user.uid === trimmedUid);
      if (localUser?.status === 'revoked') {
        setError('Your account has been revoked. Please contact your administrator.');
        cycleAuditLine('rejected - account revoked');
        onAddAuditLog('access_denied', `${trimmedUid} - account revoked`, 'rejected');
        setIsVerifying(false);
        return;
      }

      // Feature 8: Suspended user check
      if (localUser?.status === 'suspended') {
        setError('Your account has been suspended. Please contact your administrator.');
        cycleAuditLine('rejected - account suspended');
        onAddAuditLog('access_denied', `${trimmedUid} - account suspended`, 'rejected');
        setIsVerifying(false);
        return;
      }

      // Feature 5: Expired account check
      if (localUser?.expiryDate) {
        const now = new Date(); now.setHours(0, 0, 0, 0);
        const exp = new Date(localUser.expiryDate); exp.setHours(0, 0, 0, 0);
        if (exp < now) {
          setError('Your account has expired. Please contact your administrator to renew your access.');
          cycleAuditLine('rejected - account expired');
          onAddAuditLog('access_denied', `${trimmedUid} - account expired`, 'rejected');
          setIsVerifying(false);
          return;
        }
      }

      const sequences = [
        'resolving scopes...',
        'verifying project assignments...',
        'access granted - redirecting...'
      ];

      let delay = 0;
      sequences.forEach((msg, index) => {
        delay += 350;
        setTimeout(() => {
          cycleAuditLine(msg);
          if (index === sequences.length - 1) {
            setTimeout(() => {
              onAddAuditLog('access_granted', `${trimmedUid} - login successful`, 'granted');
              localStorage.setItem('att_access_token', responseData.access_token);
              onLoginSuccess(responseData.metadata);
            }, 250);
          }
        }, delay);
      });
    } catch (err) {
      console.error('API Error:', err);
      if (tryLocalDemoLogin(trimmedUid)) return;
      setError('Authentication service unavailable.');
      cycleAuditLine('rejected - service offline');
      onAddAuditLog('service_error', `${trimmedUid} - server unreachable`, 'rejected');
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') handleLogin();
  };

  return (
    <div id="login-screen" onKeyDown={handleKeyDown}>
      <div className="login-card animate-fade-in">
        <h2>Sign in to ATT</h2>
        <p className="sub">Use the user ID and password provided by your administrator.</p>

        {error && (
          <div className="login-error">
            <i className="ti ti-alert-circle"></i>
            <span>{error}</span>
          </div>
        )}

        <div className="field">
          <label htmlFor="userid">User ID</label>
          <input
            type="text"
            id="userid"
            placeholder="your.user@att.com"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            disabled={isVerifying}
            autoComplete="username"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="login-password-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isVerifying}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              title={showPassword ? 'Hide password' : 'Show password'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <button
          className="login-btn"
          onClick={handleLogin}
          disabled={isVerifying || !userId || !password}
        >
          <i className="ti ti-lock"></i>
          {isVerifying ? 'Verifying session...' : 'Verify and sign in'}
        </button>

        <p className="helper-note">
          Don&apos;t have credentials? Contact your ATT administrator.
          Accounts cannot be self-created.
        </p>

        <div className="audit-strip" id="auditStrip">
          <div className="line active" ref={auditLineRef}>
            <span className="blip"></span>
            {auditMessage}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
