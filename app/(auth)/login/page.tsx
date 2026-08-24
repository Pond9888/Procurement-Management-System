'use client'

import { useState } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const ERROR_MESSAGES: Record<string, string> = {
  zoho_denied: 'คุณยกเลิกการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง',
  missing_code: 'ไม่ได้รับ authorization code จาก Zoho',
  invalid_state: 'Session หมดอายุ กรุณาลองใหม่อีกครั้ง',
  not_found: 'ไม่พบบัญชีของคุณในระบบ กรุณาติดต่อ Admin',
  inactive: 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อ Admin',
  server_error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง',
}

const s = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#111111',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  } as React.CSSProperties,

  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#1c1c1e',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
    padding: '44px 40px 40px',
  } as React.CSSProperties,

  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '28px',
  } as React.CSSProperties,

  logoCircle: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    boxShadow: '0 0 0 3px #2c2c2e, 0 0 0 5px rgba(255,255,255,0.08)',
    overflow: 'hidden',
    flexShrink: 0,
  } as React.CSSProperties,

  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block',
  } as React.CSSProperties,

  titleBlock: {
    textAlign: 'center' as const,
    marginBottom: '28px',
  },

  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#f2f2f7',
    margin: '0 0 6px',
    letterSpacing: '-0.02em',
    lineHeight: 1.25,
  } as React.CSSProperties,

  subtitle: {
    fontSize: '14px',
    color: '#636366',
    margin: 0,
  } as React.CSSProperties,

  divider: {
    borderTop: '1px solid rgba(255,255,255,0.07)',
    marginBottom: '28px',
  } as React.CSSProperties,

  input: {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '14px 18px',
    fontSize: '14px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    outline: 'none',
    color: '#e5e5ea',
    backgroundColor: '#2c2c2e',
    caretColor: '#ffffff',
  } as React.CSSProperties,

  eyeBtn: {
    position: 'absolute' as const,
    right: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: '#636366',
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  loginBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '14px 16px',
    backgroundColor: '#f2f2f7',
    color: '#111111',
    borderRadius: '9999px',
    fontSize: '15px',
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
    letterSpacing: '0.01em',
    transition: 'background-color 0.15s',
    marginBottom: '18px',
  } as React.CSSProperties,

  forgotLink: {
    fontSize: '13px',
    color: '#636366',
    textDecoration: 'none',
    borderBottom: '1px solid rgba(99,99,102,0.4)',
    paddingBottom: '1px',
  } as React.CSSProperties,

  footer: {
    textAlign: 'center' as const,
    fontSize: '12px',
    color: '#3a3a3c',
    margin: '0',
  } as React.CSSProperties,

  devBox: {
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px dashed rgba(255,214,10,0.25)',
  } as React.CSSProperties,

  devLabel: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#ffd60a',
    textAlign: 'center' as const,
    margin: '0 0 12px',
  } as React.CSSProperties,

  devGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  } as React.CSSProperties,

  devBtn: {
    display: 'block',
    padding: '9px 10px',
    backgroundColor: '#2c2c2e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#e5e5ea',
    fontSize: '12px',
    fontWeight: 600,
    textAlign: 'center' as const,
    textDecoration: 'none',
  } as React.CSSProperties,
}

const DEV_ROLES: { role: string; label: string }[] = [
  { role: 'admin', label: 'ผู้ดูแลระบบ' },
  { role: 'finance', label: 'Finance' },
  { role: 'manager', label: 'Manager' },
  { role: 'team_lead', label: 'Team Lead' },
  { role: 'staff', label: 'Staff' },
  { role: 'excom', label: 'ExCom' },
]

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const errorMsg = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.server_error) : null

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoCircle}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/company-logo.jpg" alt="ProcureFlow Corp." style={s.logoImg} />
          </div>
        </div>

        {/* Title */}
        <div style={s.titleBlock}>
          <h1 style={s.title}>Procurement Management System</h1>
          <p style={s.subtitle}>ProcureFlow Corp.</p>
        </div>

        {/* Divider */}
        <div style={s.divider} />

        {/* Error */}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              backgroundColor: 'rgba(255,59,48,0.12)',
              border: '1px solid rgba(255,59,48,0.25)',
              borderRadius: '10px',
              padding: '11px 14px',
              marginBottom: '18px',
              fontSize: '13px',
              color: '#ff6b6b',
            }}
          >
            <AlertCircle size={15} style={{ marginTop: '1px', flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: '12px' }}>
          <input
            type="email"
            placeholder="Email"
            style={s.input}
            onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.25)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: '24px', position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            style={{ ...s.input, paddingRight: '44px' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.25)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            style={s.eyeBtn}
            aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Login → Zoho OAuth */}
        <a
          href="/api/auth/login"
          style={s.loginBtn}
          onMouseOver={e => ((e.currentTarget as HTMLElement).style.backgroundColor = '#d8d8de')}
          onMouseOut={e => ((e.currentTarget as HTMLElement).style.backgroundColor = '#f2f2f7')}
        >
          เข้าสู่ระบบ
        </a>

        {/* Forgot password */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <a
            href="https://accounts.zoho.com/signin/forgot-password"
            target="_blank"
            rel="noopener noreferrer"
            style={s.forgotLink}
          >
            Forgot password?
          </a>
        </div>

        {/* Footer */}
        <p style={s.footer}>เฉพาะพนักงาน ProcureFlow Corp. เท่านั้น</p>

        {/* Dev bypass — stripped from production builds */}
        {process.env.NEXT_PUBLIC_DEV_MOCK_LOGIN === 'true' && (
          <div style={s.devBox}>
            <p style={s.devLabel}>Dev login — ข้าม Zoho SSO</p>
            <div style={s.devGrid}>
              {DEV_ROLES.map(({ role, label }) => (
                <a key={role} href={`/api/auth/dev-login?role=${role}`} style={s.devBtn}>
                  {label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
