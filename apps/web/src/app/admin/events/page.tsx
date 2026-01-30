'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Event {
    id: string;
    title: string;
    eventType: string;
    locationType: string;
    startDate?: string;
    isVerified: boolean;
    createdAt: string;
    _count?: { teams: number; savedBy: number };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL === 'RELATIVE' ? 'https://car-scan.qa/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

export default function AdminEventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchEvents();
    }, [filter, search]);

    const fetchEvents = async () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (filter === 'pending') params.set('verified', 'false');
        if (filter === 'verified') params.set('verified', 'true');
        params.set('limit', '50');

        try {
            const res = await fetch(`${API_URL}/events?${params}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setEvents(data.events || []);
            }
        } catch (err) {
            console.error('Failed to fetch events:', err);
        }
        setLoading(false);
    };

    const handleVerify = async (eventId: string) => {
        try {
            await fetch(`${API_URL}/admin/events/${eventId}/verify`, {
                method: 'POST',
                credentials: 'include',
            });
            fetchEvents();
        } catch (err) {
            console.error('Failed to verify event:', err);
        }
    };

    const handleDelete = async (eventId: string) => {
        if (!confirm('Are you sure you want to delete this event?')) return;
        try {
            await fetch(`${API_URL}/admin/events/${eventId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            fetchEvents();
        } catch (err) {
            console.error('Failed to delete event:', err);
        }
    };

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-2">
                    {(['all', 'pending', 'verified'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg capitalize transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search events..."
                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                    />
                    <button className="btn-primary">+ Add Event</button>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden p-0">
                <table className="w-full">
                    <thead className="bg-zinc-800/50">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">Event</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">Type</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">Date</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">Status</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">Teams</th>
                            <th className="text-right px-6 py-4 text-sm font-semibold text-zinc-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="border-t border-zinc-800">
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-48 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-20 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-24 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-16 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-10 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-20 animate-pulse" /></td>
                                </tr>
                            ))
                        ) : events.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                                    No events found
                                </td>
                            </tr>
                        ) : (
                            events.map(event => (
                                <tr key={event.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                                    <td className="px-6 py-4">
                                        <Link href={`/events/${event.id}`} className="font-medium hover:text-indigo-400">
                                            {event.title}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full capitalize">
                                            {event.eventType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-400 text-sm">
                                        {event.startDate ? formatDate(event.startDate) : '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {event.isVerified ? (
                                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Verified</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Pending</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-400 text-sm">{event._count?.teams || 0}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {!event.isVerified && (
                                                <button
                                                    onClick={() => handleVerify(event.id)}
                                                    className="px-3 py-1 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 text-sm"
                                                >
                                                    Verify
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(event.id)}
                                                className="px-3 py-1 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-sm"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
