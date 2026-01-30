'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// In production (Docker), NEXT_PUBLIC_API_URL is set to 'RELATIVE' for relative paths
// In development, fallback to localhost:4100
const API_URL = 'http://localhost:4100';

export default function NewProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        name: '',
        description: '',
        keywords: [''],
        location: 'Qatar, Doha',
        frequencyPerDay: 3,
        maxResultsPerRun: 10,
        notificationMode: 'immediate' as 'immediate' | 'digest',
        digestTime: '09:00',
        whatsappNumber: '',
        quietHoursStart: null as number | null,
        quietHoursEnd: null as number | null,
    });

    const addKeyword = () => {
        setForm({ ...form, keywords: [...form.keywords, ''] });
    };

    const updateKeyword = (index: number, value: string) => {
        const newKeywords = [...form.keywords];
        newKeywords[index] = value;
        setForm({ ...form, keywords: newKeywords });
    };

    const removeKeyword = (index: number) => {
        if (form.keywords.length > 1) {
            setForm({ ...form, keywords: form.keywords.filter((_, i) => i !== index) });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const keywords = form.keywords.filter(k => k.trim());
        if (keywords.length === 0) {
            setError('Please add at least one keyword');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/profiles/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...form,
                    keywords,
                }),
            });

            if (res.ok) {
                router.push('/dashboard');
            } else {
                const data = await res.json();
                setError(data.message || 'Failed to create profile');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950">
            <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link href="/dashboard" className="text-zinc-400 hover:text-white">
                        ← Back
                    </Link>
                    <h1 className="text-xl font-bold">Create Search Profile</h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-8">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Profile Name */}
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4">Basic Info</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Profile Name
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g., Tech Hackathons"
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Description <span className="text-zinc-500">(optional)</span>
                                </label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Describe what you're looking for to improve search relevance. e.g., 'Looking for AI and machine learning hackathons for university students'"
                                    className="input min-h-[80px]"
                                    rows={3}
                                />
                                <p className="mt-1 text-xs text-zinc-500">
                                    This helps find more relevant results and only shows active/upcoming events
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Keywords */}
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4">What to Search For</h2>
                        <div className="space-y-3">
                            {form.keywords.map((keyword, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={keyword}
                                        onChange={(e) => updateKeyword(index, e.target.value)}
                                        placeholder="e.g., hackathon, startup competition, AI grant"
                                        className="input flex-1"
                                    />
                                    {form.keywords.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeKeyword(index)}
                                            className="px-4 py-2 bg-zinc-800 rounded-xl text-zinc-400 hover:text-red-400"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addKeyword}
                                className="text-indigo-400 text-sm hover:text-indigo-300"
                            >
                                + Add another keyword
                            </button>
                        </div>
                    </div>

                    {/* Location & Frequency */}
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4">Search Settings</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Location Focus
                                </label>
                                <input
                                    type="text"
                                    value={form.location}
                                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                                    placeholder="Qatar, Doha"
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Searches per Day
                                </label>
                                <select
                                    value={form.frequencyPerDay}
                                    onChange={(e) => setForm({ ...form, frequencyPerDay: parseInt(e.target.value) })}
                                    className="input"
                                >
                                    <option value={1}>1 time</option>
                                    <option value={2}>2 times</option>
                                    <option value={3}>3 times</option>
                                    <option value={4}>4 times</option>
                                    <option value={6}>6 times</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Max Results per Run
                                </label>
                                <select
                                    value={form.maxResultsPerRun}
                                    onChange={(e) => setForm({ ...form, maxResultsPerRun: parseInt(e.target.value) })}
                                    className="input"
                                >
                                    <option value={5}>5 results</option>
                                    <option value={10}>10 results</option>
                                    <option value={15}>15 results</option>
                                    <option value={20}>20 results</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4">Notifications</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    WhatsApp Number
                                </label>
                                <input
                                    type="tel"
                                    value={form.whatsappNumber}
                                    onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                                    placeholder="+974 XXXX XXXX"
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-3">
                                    Notification Mode
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="notificationMode"
                                            checked={form.notificationMode === 'immediate'}
                                            onChange={() => setForm({ ...form, notificationMode: 'immediate' })}
                                            className="w-4 h-4 text-indigo-600"
                                        />
                                        <span>Immediate</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="notificationMode"
                                            checked={form.notificationMode === 'digest'}
                                            onChange={() => setForm({ ...form, notificationMode: 'digest' })}
                                            className="w-4 h-4 text-indigo-600"
                                        />
                                        <span>Daily Digest</span>
                                    </label>
                                </div>
                            </div>
                            {form.notificationMode === 'digest' && (
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                                        Digest Time
                                    </label>
                                    <input
                                        type="time"
                                        value={form.digestTime}
                                        onChange={(e) => setForm({ ...form, digestTime: e.target.value })}
                                        className="input w-40"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-4">
                        <button type="submit" className="btn-primary flex-1" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Profile'}
                        </button>
                        <Link href="/dashboard" className="btn-secondary">
                            Cancel
                        </Link>
                    </div>
                </form>
            </main>
        </div>
    );
}
