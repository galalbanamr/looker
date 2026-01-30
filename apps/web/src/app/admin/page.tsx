'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStats {
    totalUsers: number;
    totalEvents: number;
    totalTeams: number;
    pendingEvents: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    activeTeams: number;
}

interface Activity {
    type: string;
    message: string;
    createdAt: string;
}

interface ChartData {
    date: string;
    count: number;
}

interface WhatsAppStatus {
    connected: boolean;
    phoneNumber?: string;
    pairingCode?: string;
    message?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL === 'RELATIVE' ? 'https://car-scan.qa/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [userGrowth, setUserGrowth] = useState<ChartData[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [eventsByType, setEventsByType] = useState<Array<{ type: string; count: number }>>([]);
    const [loading, setLoading] = useState(true);

    // WhatsApp state
    const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null);
    const [whatsappLoading, setWhatsappLoading] = useState(false);
    const [pairingPhone, setPairingPhone] = useState('');
    const [pairingCode, setPairingCode] = useState('');
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('');
    const [whatsappMessage, setWhatsappMessage] = useState('');

    useEffect(() => {
        fetchDashboard();
        fetchWhatsAppStatus();
    }, []);

    const fetchWhatsAppStatus = async () => {
        try {
            const res = await fetch(`${API_URL}/whatsapp/status`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setWhatsappStatus(data);
            }
        } catch (err) {
            console.error('Failed to fetch WhatsApp status:', err);
        }
    };

    const handleRequestPairing = async () => {
        if (!pairingPhone) return;
        setWhatsappLoading(true);
        setWhatsappMessage('');
        try {
            const res = await fetch(`${API_URL}/whatsapp/pair`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ phone: pairingPhone }),
            });
            const data = await res.json();
            if (data.pairingCode) {
                setPairingCode(data.pairingCode);
                setWhatsappMessage(`Pairing code: ${data.pairingCode}. Enter this in WhatsApp → Linked Devices → Link with phone number`);
            } else {
                setWhatsappMessage(data.message || 'Pairing request sent');
            }
            // Refresh status after a delay
            setTimeout(fetchWhatsAppStatus, 5000);
        } catch (err) {
            setWhatsappMessage('Failed to request pairing code');
        }
        setWhatsappLoading(false);
    };

    const handleDisconnect = async () => {
        setWhatsappLoading(true);
        try {
            await fetch(`${API_URL}/whatsapp/disconnect`, {
                method: 'POST',
                credentials: 'include',
            });
            setWhatsappMessage('WhatsApp disconnected');
            setPairingCode('');
            fetchWhatsAppStatus();
        } catch (err) {
            setWhatsappMessage('Failed to disconnect');
        }
        setWhatsappLoading(false);
    };

    const handleSendTestMessage = async () => {
        if (!testPhone || !testMessage) return;
        setWhatsappLoading(true);
        try {
            const res = await fetch(`${API_URL}/whatsapp/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ phone: testPhone, message: testMessage }),
            });
            const data = await res.json();
            setWhatsappMessage(data.success ? 'Test message sent!' : 'Failed to send test message');
        } catch (err) {
            setWhatsappMessage('Failed to send test message');
        }
        setWhatsappLoading(false);
    };

    const fetchDashboard = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/dashboard`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setUserGrowth(data.userGrowth || []);
                setEventsByType(data.eventsByType || []);
                setActivities(data.recentActivity || []);
            }
        } catch (err) {
            console.error('Failed to fetch dashboard:', err);
        }
        setLoading(false);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const statCards = stats ? [
        { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'indigo' },
        { label: 'Total Events', value: stats.totalEvents, icon: '🎯', color: 'purple' },
        { label: 'Active Teams', value: stats.activeTeams, icon: '🤝', color: 'green' },
        { label: 'Pending Events', value: stats.pendingEvents, icon: '⏳', color: 'yellow', alert: stats.pendingEvents > 0 },
    ] : [];

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="card animate-pulse">
                            <div className="h-4 bg-zinc-800 rounded w-1/2 mb-4" />
                            <div className="h-8 bg-zinc-800 rounded w-3/4" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Welcome */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Welcome back, Admin</h2>
                    <p className="text-zinc-400">Here's what's happening with your platform</p>
                </div>
                <Link href="/admin/events" className="btn-primary">
                    + Add Event
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, i) => (
                    <div key={i} className={`card ${stat.alert ? 'border-yellow-500/50' : ''}`}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-3xl">{stat.icon}</span>
                            {stat.alert && (
                                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                                    Needs Review
                                </span>
                            )}
                        </div>
                        <p className="text-zinc-400 text-sm mb-1">{stat.label}</p>
                        <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* User Growth */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">User Growth (Last 30 Days)</h3>
                    {userGrowth.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-zinc-500">
                            No data available
                        </div>
                    ) : (
                        <div className="h-40 flex items-end gap-1">
                            {userGrowth.slice(-14).map((d, i) => {
                                const maxCount = Math.max(...userGrowth.map(x => x.count), 1);
                                const height = (d.count / maxCount) * 100;
                                return (
                                    <div key={i} className="flex-1 group relative">
                                        <div
                                            className="bg-indigo-500/50 hover:bg-indigo-500 rounded-t transition-colors"
                                            style={{ height: `${Math.max(height, 5)}%` }}
                                        />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
                                            <div className="bg-zinc-800 px-2 py-1 rounded text-xs whitespace-nowrap">
                                                {d.count} users on {d.date}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {stats && (
                        <div className="flex gap-6 mt-4 pt-4 border-t border-zinc-800 text-sm">
                            <div>
                                <span className="text-zinc-400">This Week:</span>
                                <span className="ml-2 font-semibold text-green-400">+{stats.newUsersThisWeek}</span>
                            </div>
                            <div>
                                <span className="text-zinc-400">This Month:</span>
                                <span className="ml-2 font-semibold">+{stats.newUsersThisMonth}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Events by Type */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Events by Type</h3>
                    {eventsByType.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-zinc-500">
                            No events yet
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {eventsByType.map((e, i) => {
                                const total = eventsByType.reduce((a, b) => a + b.count, 0);
                                const percentage = Math.round((e.count / total) * 100);
                                const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];
                                return (
                                    <div key={i}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="capitalize">{e.type}</span>
                                            <span className="text-zinc-400">{e.count} ({percentage}%)</span>
                                        </div>
                                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${colors[i % colors.length]} rounded-full`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Recent Activity</h3>
                    <Link href="/admin/logs" className="text-indigo-400 hover:underline text-sm">
                        View All →
                    </Link>
                </div>
                {activities.length === 0 ? (
                    <div className="py-8 text-center text-zinc-500">
                        No recent activity
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activities.slice(0, 8).map((activity, i) => (
                            <div key={i} className="flex items-center gap-4 py-2">
                                <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
                                    {activity.type === 'user_joined' && '👤'}
                                    {activity.type === 'event_created' && '🎯'}
                                    {activity.type === 'team_formed' && '🤝'}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm">{activity.message}</p>
                                    <p className="text-xs text-zinc-500">{formatDate(activity.createdAt)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-4">
                <Link href="/admin/events" className="card hover:border-indigo-500/50 transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                            🎯
                        </div>
                        <div>
                            <h4 className="font-semibold">Manage Events</h4>
                            <p className="text-sm text-zinc-400">Add, edit, or verify events</p>
                        </div>
                    </div>
                </Link>
                <Link href="/admin/users" className="card hover:border-indigo-500/50 transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                            👥
                        </div>
                        <div>
                            <h4 className="font-semibold">Manage Users</h4>
                            <p className="text-sm text-zinc-400">View and manage users</p>
                        </div>
                    </div>
                </Link>
                <Link href="/admin/teams" className="card hover:border-indigo-500/50 transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                            🤝
                        </div>
                        <div>
                            <h4 className="font-semibold">Manage Teams</h4>
                            <p className="text-sm text-zinc-400">View all teams</p>
                        </div>
                    </div>
                </Link>
            </div>

            {/* WhatsApp Setup */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-2xl">
                            📱
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">WhatsApp Setup</h3>
                            <p className="text-sm text-zinc-400">Configure WhatsApp notifications</p>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${whatsappStatus?.connected
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                        {whatsappStatus?.connected ? '✓ Connected' : '○ Not Connected'}
                    </div>
                </div>

                {whatsappMessage && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${whatsappMessage.includes('Failed') || whatsappMessage.includes('Error')
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-green-500/20 text-green-400'
                        }`}>
                        {whatsappMessage}
                    </div>
                )}

                {pairingCode && !whatsappStatus?.connected && (
                    <div className="mb-4 p-4 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                        <p className="text-sm text-zinc-300 mb-2">Enter this code in WhatsApp → Linked Devices → Link with phone number:</p>
                        <p className="text-3xl font-mono font-bold text-indigo-400 tracking-widest">{pairingCode}</p>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Pairing Section */}
                    <div className="space-y-4">
                        <h4 className="font-medium text-zinc-300">Connect WhatsApp</h4>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Phone number (e.g., +1234567890)"
                                value={pairingPhone}
                                onChange={(e) => setPairingPhone(e.target.value)}
                                className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                                disabled={whatsappLoading}
                            />
                            <button
                                onClick={handleRequestPairing}
                                disabled={whatsappLoading || !pairingPhone}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                            >
                                {whatsappLoading ? 'Loading...' : 'Pair'}
                            </button>
                        </div>
                        {whatsappStatus?.connected && (
                            <button
                                onClick={handleDisconnect}
                                disabled={whatsappLoading}
                                className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-lg font-medium transition-colors"
                            >
                                Disconnect WhatsApp
                            </button>
                        )}
                    </div>

                    {/* Test Message Section */}
                    {whatsappStatus?.connected && (
                        <div className="space-y-4">
                            <h4 className="font-medium text-zinc-300">Send Test Message</h4>
                            <input
                                type="text"
                                placeholder="Phone number"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                                disabled={whatsappLoading}
                            />
                            <input
                                type="text"
                                placeholder="Test message"
                                value={testMessage}
                                onChange={(e) => setTestMessage(e.target.value)}
                                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-indigo-500"
                                disabled={whatsappLoading}
                            />
                            <button
                                onClick={handleSendTestMessage}
                                disabled={whatsappLoading || !testPhone || !testMessage}
                                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                            >
                                Send Test Message
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800">
                    <button
                        onClick={fetchWhatsAppStatus}
                        className="text-sm text-indigo-400 hover:text-indigo-300"
                    >
                        ↻ Refresh Status
                    </button>
                </div>
            </div>
        </div>
    );
}
