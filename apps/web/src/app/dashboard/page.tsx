'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

interface User {
    id: string;
    phone: string;
    name: string | null;
}

interface Profile {
    id: string;
    name: string;
    keywords: string[];
    isActive: boolean;
    _count: { items: number; runs: number };
}

interface Stats {
    profiles: number;
    activeProfiles: number;
    totalItems: number;
    notifiedItems: number;
    recentRuns: Array<{
        id: string;
        status: string;
        newItemCount: number;
        startedAt: string;
        profile: { name: string };
    }>;
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch user
            const userRes = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
            const userData = await userRes.json();

            if (!userData.success) {
                router.push('/auth');
                return;
            }
            setUser(userData.user);

            // Fetch profiles
            const profilesRes = await fetch(`${API_URL}/profiles`, { credentials: 'include' });
            const profilesData = await profilesRes.json();
            setProfiles(profilesData);

            // Fetch stats
            const statsRes = await fetch(`${API_URL}/profiles/stats`, { credentials: 'include' });
            const statsData = await statsRes.json();
            setStats(statsData);

        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <div className="text-xl text-zinc-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Header */}
            <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🏆</span>
                        <span className="text-xl font-bold gradient-text">Competition Monitor</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/settings" className="text-zinc-400 hover:text-white transition-colors">
                            Settings
                        </Link>
                        <button onClick={handleLogout} className="text-zinc-400 hover:text-white transition-colors">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Welcome */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">
                        Welcome back{user?.name ? `, ${user.name}` : ''}! 👋
                    </h1>
                    <p className="text-zinc-400">Here's what's happening with your competition monitoring</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard label="Active Profiles" value={stats?.activeProfiles || 0} icon="📋" />
                    <StatCard label="Items Found" value={stats?.totalItems || 0} icon="🔍" />
                    <StatCard label="Notifications Sent" value={stats?.notifiedItems || 0} icon="📱" />
                    <StatCard label="Total Profiles" value={stats?.profiles || 0} icon="📊" />
                </div>

                {/* Profiles Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Your Search Profiles</h2>
                        <Link href="/profiles/new" className="btn-primary">
                            + New Profile
                        </Link>
                    </div>

                    {profiles.length === 0 ? (
                        <div className="card text-center py-12">
                            <p className="text-zinc-400 mb-4">You haven't created any search profiles yet</p>
                            <Link href="/profiles/new" className="btn-primary inline-block">
                                Create Your First Profile
                            </Link>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {profiles.map((profile) => (
                                <Link
                                    key={profile.id}
                                    href={`/profiles/${profile.id}`}
                                    className="card hover:border-indigo-500/50 transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-semibold text-lg group-hover:text-indigo-400 transition-colors">
                                            {profile.name}
                                        </h3>
                                        <span className={`px-2 py-1 rounded-full text-xs ${profile.isActive
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-zinc-700 text-zinc-400'
                                            }`}>
                                            {profile.isActive ? 'Active' : 'Paused'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {profile.keywords.slice(0, 3).map((kw, i) => (
                                            <span key={i} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">
                                                {kw}
                                            </span>
                                        ))}
                                        {profile.keywords.length > 3 && (
                                            <span className="px-2 py-1 text-xs text-zinc-500">
                                                +{profile.keywords.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-zinc-500">
                                        {profile._count.items} items found • {profile._count.runs} runs
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                {stats?.recentRuns && stats.recentRuns.length > 0 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                        <div className="card overflow-hidden p-0">
                            <table className="w-full">
                                <thead className="bg-zinc-800/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Profile</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Status</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">New Items</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {stats.recentRuns.map((run) => (
                                        <tr key={run.id} className="hover:bg-zinc-800/30">
                                            <td className="px-4 py-3">{run.profile.name}</td>
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
                )}
            </main>
        </div>
    );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
    return (
        <div className="card">
            <div className="text-2xl mb-2">{icon}</div>
            <div className="text-3xl font-bold mb-1">{value}</div>
            <div className="text-sm text-zinc-400">{label}</div>
        </div>
    );
}
