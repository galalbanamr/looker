'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// In production (Docker), NEXT_PUBLIC_API_URL is set to 'RELATIVE' for relative paths
// In development, fallback to localhost:4100
const API_URL = 'http://localhost:4100';

interface Profile {
    id: string;
    name: string;
    keywords: string[];
    location: string;
    frequencyPerDay: number;
    isActive: boolean;
    notificationMode: string;
    whatsappNumber: string;
    items: Array<{
        id: string;
        title: string;
        whatItIs: string;
        deadline: string | null;
        url: string;
        sourceDomain: string;
        notified: boolean;
        discoveredAt: string;
    }>;
    runs: Array<{
        id: string;
        status: string;
        query: string;
        newItemCount: number;
        startedAt: string;
    }>;
}

export default function ProfileDetailPage() {
    const router = useRouter();
    const params = useParams();
    const profileId = params.id as string;

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, [profileId]);

    const fetchProfile = async () => {
        try {
            const res = await fetch(`${API_URL}/profiles/get/${profileId}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            } else {
                router.push('/dashboard');
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async () => {
        try {
            await fetch(`${API_URL}/profiles/${profileId}/toggle`, {
                method: 'POST',
                credentials: 'include',
            });
            fetchProfile();
        } catch (error) {
            console.error('Failed to toggle profile:', error);
        }
    };

    const handleRunNow = async () => {
        setRunning(true);
        try {
            await fetch(`${API_URL}/profiles/${profileId}/run`, {
                method: 'POST',
                credentials: 'include',
            });
            fetchProfile();
        } catch (error) {
            console.error('Failed to run discovery:', error);
        } finally {
            setRunning(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this profile?')) return;

        try {
            await fetch(`${API_URL}/profiles/delete/${profileId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            router.push('/dashboard');
        } catch (error) {
            console.error('Failed to delete profile:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <div className="text-xl text-zinc-400">Loading...</div>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="min-h-screen bg-zinc-950">
            <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-zinc-400 hover:text-white">
                            ← Back
                        </Link>
                        <h1 className="text-xl font-bold">{profile.name}</h1>
                        <span className={`px-2 py-1 rounded-full text-xs ${profile.isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-zinc-700 text-zinc-400'
                            }`}>
                            {profile.isActive ? 'Active' : 'Paused'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRunNow}
                            disabled={running}
                            className="btn-primary text-sm px-4 py-2"
                        >
                            {running ? 'Running...' : '▶ Run Now'}
                        </button>
                        <button onClick={handleToggle} className="btn-secondary text-sm px-4 py-2">
                            {profile.isActive ? 'Pause' : 'Resume'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">
                {/* Profile Info */}
                <div className="card mb-6">
                    <div className="grid md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-zinc-400">Keywords:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {profile.keywords.map((kw, i) => (
                                    <span key={i} className="px-2 py-1 bg-zinc-800 rounded text-xs">{kw}</span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <span className="text-zinc-400">Location:</span>
                            <p>{profile.location}</p>
                        </div>
                        <div>
                            <span className="text-zinc-400">Frequency:</span>
                            <p>{profile.frequencyPerDay}x per day</p>
                        </div>
                        <div>
                            <span className="text-zinc-400">Notifications:</span>
                            <p>{profile.notificationMode} to {profile.whatsappNumber}</p>
                        </div>
                    </div>
                </div>

                {/* Discovered Items */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-4">Discovered Items ({profile.items.length})</h2>
                    {profile.items.length === 0 ? (
                        <div className="card text-center py-8 text-zinc-400">
                            No items discovered yet. Click "Run Now" to start searching.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {profile.items.map((item) => (
                                <div key={item.id} className="card hover:border-indigo-500/30 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold">{item.title}</h3>
                                                {item.notified && (
                                                    <span className="text-xs text-green-400">✓ Notified</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-zinc-400 mb-2">{item.whatItIs}</p>
                                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                                                <span>📅 {item.deadline || 'No deadline'}</span>
                                                <span>🌐 {item.sourceDomain}</span>
                                                <span>{new Date(item.discoveredAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-indigo-400 hover:text-indigo-300 text-sm"
                                        >
                                            View →
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Runs */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-4">Recent Runs</h2>
                    <div className="card overflow-hidden p-0">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-800/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-zinc-400">Query</th>
                                    <th className="px-4 py-3 text-left text-zinc-400">Status</th>
                                    <th className="px-4 py-3 text-left text-zinc-400">New Items</th>
                                    <th className="px-4 py-3 text-left text-zinc-400">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {profile.runs.map((run) => (
                                    <tr key={run.id}>
                                        <td className="px-4 py-3">{run.query}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs ${run.status === 'completed'
                                                ? 'bg-green-500/20 text-green-400'
                                                : run.status === 'failed'
                                                    ? 'bg-red-500/20 text-red-400'
                                                    : 'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {run.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-zinc-400">{run.newItemCount}</td>
                                        <td className="px-4 py-3 text-zinc-400">
                                            {new Date(run.startedAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="card border-red-500/30 bg-red-500/5">
                    <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
                    >
                        Delete This Profile
                    </button>
                </div>
            </main>
        </div>
    );
}
