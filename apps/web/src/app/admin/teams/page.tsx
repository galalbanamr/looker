'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Team {
    id: string;
    name: string;
    description?: string;
    maxMembers: number;
    isOpen: boolean;
    createdAt: string;
    event?: { id: string; title: string };
    _count?: { members: number; messages: number };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL === 'RELATIVE' ? 'https://car-scan.qa/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

export default function AdminTeamsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchTeams();
    }, [search]);

    const fetchTeams = async () => {
        try {
            // Using generic events endpoint with teams - in production would have dedicated admin teams endpoint
            const res = await fetch(`${API_URL}/events?limit=10`, { credentials: 'include' });
            if (res.ok) {
                // Mock data for now - replace with actual teams API
                setTeams([]);
            }
        } catch (err) {
            console.error('Failed to fetch teams:', err);
        }
        setLoading(false);
    };

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <p className="text-zinc-400">{teams.length} teams</p>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search teams..."
                    className="w-64 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                />
            </div>

            {/* Table */}
            <div className="card overflow-hidden p-0">
                <table className="w-full">
                    <thead className="bg-zinc-800/50">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">Team</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">Event</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">Members</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">Status</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">Created</th>
                            <th className="text-right px-6 py-4 text-sm font-semibold text-zinc-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="border-t border-zinc-800">
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-40 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-48 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-16 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-16 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-24 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-20 animate-pulse" /></td>
                                </tr>
                            ))
                        ) : teams.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                                    <div className="text-4xl mb-4">🤝</div>
                                    <p>No teams found</p>
                                    <p className="text-sm mt-2">Teams will appear here when users create them</p>
                                </td>
                            </tr>
                        ) : (
                            teams.map(team => (
                                <tr key={team.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                                    <td className="px-6 py-4">
                                        <Link href={`/teams/${team.id}`} className="font-medium hover:text-indigo-400">
                                            {team.name}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-400">
                                        {team.event ? (
                                            <Link href={`/events/${team.event.id}`} className="hover:text-indigo-400">
                                                {team.event.title}
                                            </Link>
                                        ) : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-400">
                                        {team._count?.members || 0}/{team.maxMembers}
                                    </td>
                                    <td className="px-6 py-4">
                                        {team.isOpen ? (
                                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Open</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-zinc-700 text-zinc-400 text-xs rounded-full">Closed</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-400 text-sm">{formatDate(team.createdAt)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/teams/${team.id}`}
                                            className="px-3 py-1 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 text-sm"
                                        >
                                            View
                                        </Link>
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
