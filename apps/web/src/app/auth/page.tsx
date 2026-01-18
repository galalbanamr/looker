'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

export default function AuthPage() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });

            const data = await res.json();

            if (data.success) {
                setStep('otp');
            } else {
                setError(data.message || 'Failed to send OTP');
            }
        } catch (err: any) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ phone, code: otp }),
            });

            const data = await res.json();

            if (data.success) {
                router.push('/dashboard');
            } else {
                setError(data.message || 'Invalid OTP');
            }
        } catch (err: any) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-950">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-transparent to-purple-900/10" />

            <div className="relative w-full max-w-md">
                <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                    <span className="text-3xl">🏆</span>
                    <span className="text-2xl font-bold gradient-text">Competition Monitor</span>
                </Link>

                <div className="card">
                    <h1 className="text-2xl font-bold text-center mb-2">
                        {step === 'phone' ? 'Sign In' : 'Enter OTP'}
                    </h1>
                    <p className="text-zinc-400 text-center mb-6">
                        {step === 'phone'
                            ? 'We\'ll send you a verification code via WhatsApp'
                            : `Check your WhatsApp for the code sent to ${phone}`
                        }
                    </p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {step === 'phone' ? (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    WhatsApp Number
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+974 XXXX XXXX"
                                    className="input"
                                    required
                                />
                                <p className="mt-2 text-xs text-zinc-500">
                                    Include country code (e.g., +974 for Qatar)
                                </p>
                            </div>
                            <button
                                type="submit"
                                className="btn-primary w-full"
                                disabled={loading}
                            >
                                {loading ? 'Sending...' : 'Send Verification Code'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Verification Code
                                </label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="Enter 6-digit code"
                                    className="input text-center text-2xl tracking-widest"
                                    maxLength={6}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn-primary w-full"
                                disabled={loading}
                            >
                                {loading ? 'Verifying...' : 'Verify & Sign In'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep('phone')}
                                className="w-full text-zinc-400 text-sm hover:text-white transition-colors"
                            >
                                ← Use different number
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-center text-zinc-500 text-sm mt-6">
                    By signing in, you agree to receive WhatsApp notifications
                </p>
            </div>
        </div>
    );
}
