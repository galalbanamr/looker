'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// In production (Docker), NEXT_PUBLIC_API_URL is set to 'RELATIVE' for relative paths
// In development, fallback to localhost:4100
const API_URL = process.env.NEXT_PUBLIC_API_URL === 'RELATIVE' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100');
const ADMIN_PASSWORD = 'admin123'; // In production, use env variable

interface WhatsAppStatus {
    connected?: boolean;
    isReady?: boolean;
    phoneNumber?: string;
    name?: string;
    hasPairingCode?: boolean;
    pairingCode?: string | null;
    hasQR?: boolean;
    qrCode?: string | null;
    lastError?: string | null;
}

export default function AdminPage() {
    const [authenticated, setAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // WhatsApp state
    const [status, setStatus] = useState<WhatsAppStatus | null>(null);
    const [pairingPhone, setPairingPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (authenticated) {
            fetchStatus();
            const interval = setInterval(fetchStatus, 3000);
            return () => clearInterval(interval);
        }
    }, [authenticated]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setAuthenticated(true);
            setError('');
        } else {
            setError('Invalid password');
        }
    };

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${API_URL}/whatsapp/status`);
            const data = await res.json();
            setStatus(data);
        } catch (err) {
            console.error('Failed to fetch status:', err);
        }
    };

    const handlePair = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pairingPhone) return;
        setLoading(true);
        setMessage('');

        try {
            const res = await fetch(`${API_URL}/whatsapp/pair`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: pairingPhone.replace(/\D/g, '') }),
            });

            const data = await res.json();

            if (data.success && data.code) {
                setStatus({ ...status, hasPairingCode: true, pairingCode: data.code });
            } else {
                setMessage(data.message || 'Failed to get pairing code');
            }
        } catch (err: any) {
            setMessage('Failed to request pairing code');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect WhatsApp?')) return;

        setLoading(true);
        try {
            await fetch(`${API_URL}/whatsapp/disconnect`, { method: 'POST' });
            setStatus({ isReady: false, hasPairingCode: false, pairingCode: null });
            setMessage('WhatsApp disconnected');
        } catch (err) {
            setMessage('Failed to disconnect');
        } finally {
            setLoading(false);
        }
    };

    const handleTestMessage = async () => {
        if (!pairingPhone) {
            setMessage('Enter a phone number first');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/whatsapp/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: pairingPhone, message: 'Test message from Looker' }),
            });
            const data = await res.json();
            setMessage(data.success ? '✅ Test message sent!' : '❌ Failed to send test message');
        } catch (err) {
            setMessage('Failed to send test message');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        setLoading(true);
        setMessage('');
        try {
            await fetch(`${API_URL}/whatsapp/disconnect`, { method: 'POST' });
            setStatus({ isReady: false, hasPairingCode: false, pairingCode: null, hasQR: false, qrCode: null, lastError: null });
        } catch (err) {
            console.error('Failed to reset:', err);
        } finally {
            setLoading(false);
        }
    };

    // Login screen
    if (!authenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <span className="text-4xl">🔐</span>
                        <h1 className="text-2xl font-bold mt-4">Admin Panel</h1>
                        <p className="text-zinc-400 mt-2">Looker</p>
                    </div>

                    <form onSubmit={handleLogin} className="card">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter admin password"
                                className="input"
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="btn-primary w-full">
                            Login
                        </button>
                    </form>

                    <p className="text-center text-zinc-500 text-sm mt-6">
                        <Link href="/" className="hover:text-white">← Back to home</Link>
                    </p>
                </div>
            </div>
        );
    }

    const isConnected = status?.isReady || status?.connected;
    const hasPairingCode = status?.hasPairingCode && status?.pairingCode;

    // Admin dashboard
    return (
        <div className="min-h-screen bg-zinc-950">
            <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚙️</span>
                        <h1 className="text-xl font-bold">Admin Panel</h1>
                    </div>
                    <button
                        onClick={() => setAuthenticated(false)}
                        className="text-zinc-400 hover:text-white text-sm"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* WhatsApp Status Card */}
                <div className="card mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <span className="text-2xl">📱</span>
                            WhatsApp Connection
                        </h2>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${isConnected
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'
                                }`} />
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </div>
                    </div>

                    {isConnected ? (
                        /* Connected State */
                        <div className="text-center">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-4xl">✅</span>
                            </div>
                            <h3 className="text-2xl font-bold text-green-400 mb-2">Connected!</h3>
                            <p className="text-zinc-400 mb-6">WhatsApp is ready to send OTPs and notifications</p>
                            <button
                                onClick={handleDisconnect}
                                disabled={loading}
                                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    ) : hasPairingCode ? (
                        /* Pairing Code + QR Code Display */
                        <div className="text-center">
                            <h3 className="text-xl font-bold mb-4">Connect WhatsApp</h3>

                            {/* Option 1: Pairing Code */}
                            <div className="mb-8">
                                <p className="text-zinc-400 mb-4">
                                    <strong className="text-white">Option 1:</strong> Enter this code in WhatsApp → Linked Devices → Link with phone number
                                </p>
                                <div className="bg-indigo-500/10 border-2 border-indigo-500/30 rounded-xl p-6 inline-block">
                                    <p className="text-5xl font-mono font-bold text-indigo-400 tracking-[0.3em]">
                                        {status.pairingCode}
                                    </p>
                                </div>
                                <p className="text-xs text-zinc-500 mt-2">If code doesn't work, use QR code below</p>
                            </div>

                            {/* Option 2: QR Code Fallback */}
                            {status?.hasQR && status?.qrCode && (
                                <div className="border-t border-zinc-800 pt-8">
                                    <p className="text-zinc-400 mb-4">
                                        <strong className="text-white">Option 2:</strong> Scan this QR code instead
                                    </p>
                                    <div className="bg-white p-4 rounded-lg inline-block shadow-md">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(status.qrCode)}`}
                                            alt="WhatsApp QR Code"
                                            className="w-48 h-48"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Error Display */}
                            {status?.lastError && (
                                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                    <strong>Error:</strong> {status.lastError}
                                </div>
                            )}

                            <button
                                onClick={handleReset}
                                disabled={loading}
                                className="mt-6 px-6 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-colors"
                            >
                                {loading ? '⏳ Resetting...' : '← Try Different Number'}
                            </button>
                        </div>
                    ) : (
                        /* Phone Input Form */
                        <div className="text-center">
                            <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-4xl">💬</span>
                            </div>
                            <h3 className="text-xl font-bold mb-2">Connect WhatsApp</h3>
                            <p className="text-zinc-400 mb-6">Enter your WhatsApp phone number to get a pairing code</p>

                            <form onSubmit={handlePair} className="max-w-sm mx-auto space-y-4">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 font-medium">
                                        +
                                    </div>
                                    <input
                                        type="tel"
                                        value={pairingPhone}
                                        onChange={(e) => setPairingPhone(e.target.value)}
                                        placeholder="974 3300 0000"
                                        className="pl-8 w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-lg"
                                    />
                                </div>

                                {message && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                        {message}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !pairingPhone || pairingPhone.replace(/\D/g, '').length < 10}
                                    className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>⏳ Getting Code...</>
                                    ) : (
                                        <>🔑 Get Pairing Code</>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Test Message Card */}
                {isConnected && (
                    <div className="card mb-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="text-2xl">🧪</span>
                            Test Message
                        </h2>
                        <div className="flex gap-4">
                            <input
                                type="tel"
                                value={pairingPhone}
                                onChange={(e) => setPairingPhone(e.target.value)}
                                placeholder="+974 XXXX XXXX"
                                className="input flex-1"
                            />
                            <button
                                onClick={handleTestMessage}
                                disabled={loading}
                                className="btn-secondary"
                            >
                                Send Test
                            </button>
                        </div>
                        {message && (
                            <p className="mt-3 text-sm text-zinc-400">{message}</p>
                        )}
                    </div>
                )}

                {/* How to Link Instructions */}
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
                    <div className="flex gap-3">
                        <span className="text-xl">ℹ️</span>
                        <div>
                            <h4 className="font-semibold text-indigo-300">How to Link</h4>
                            <ol className="text-sm text-indigo-200/70 list-decimal list-inside mt-2 space-y-1">
                                <li>Enter your WhatsApp number above (with country code)</li>
                                <li>Click "Get Pairing Code" to generate a code</li>
                                <li>Open WhatsApp → Settings → Linked Devices</li>
                                <li>Tap "Link a Device"</li>
                                <li>Tap "Link with phone number instead"</li>
                                <li>Enter the 8-digit code shown here</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mt-4">
                    <div className="flex gap-3">
                        <span className="text-xl">⚠️</span>
                        <div>
                            <h4 className="font-semibold text-yellow-300">Important</h4>
                            <p className="text-sm text-yellow-200/70">
                                Use a secondary WhatsApp number. Unofficial automation may result in account restrictions.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="mt-8 text-center">
                    <Link href="/" className="text-zinc-400 hover:text-white text-sm">
                        ← Back to Landing Page
                    </Link>
                </div>
            </main>
        </div>
    );
}
