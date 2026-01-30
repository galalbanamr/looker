'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
    id: string;
    email: string;
    username: string;
    fullName?: string;
    createdAt: string;
    _count?: { teamMemberships: number };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL === 'RELATIVE' ? 'https://car-scan.qa/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchUsers();
    }, [search, page]);

    const fetchUsers = async () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        params.set('page', page.toString());
        params.set('limit', '20');

        try {
            const res = await fetch(`${API_URL}/admin/users?${params}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
                setTotalPages(data.pagination?.totalPages || 1);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
        setLoading(false);
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            await fetch(`${API_URL}/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            fetchUsers();
        } catch (err) {
            console.error('Failed to delete user:', err);
        }
    };

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <p className="text-zinc-400">{users.length} users total</p>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search by name, email, or username..."
                    className="w-80 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                />
            </div>

            {/* Table */}
            <div className="card overflow-hidden p-0">
                <table className="w-full">
                    <thead className="bg-zinc-800/50">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">User</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">Email</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">Joined</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">Teams</th>
                            <th className="text-right px-6 py-4 text-sm font-semibold text-zinc-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="border-t border-zinc-800">
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-40 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-48 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-24 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-10 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-20 animate-pulse" /></td>
                                </tr>
                            ))
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            users.map(user => (
                                <tr key={user.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center font-bold">
                                                {(user.fullName?.[0] || user.username[0]).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium">{user.fullName || user.username}</p>
                                                <p className="text-sm text-zinc-500">@{user.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-400">{user.email}</td>
                                    <td className="px-6 py-4 text-zinc-400 text-sm">{formatDate(user.createdAt)}</td>
                                    <td className="px-6 py-4 text-zinc-400">{user._count?.teamMemberships || 0}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                href={`/users/${user.username}`}
                                                className="px-3 py-1 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 text-sm"
                                            >
                                                View
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(user.id)}
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 p-4 border-t border-zinc-800">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 bg-zinc-800 rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-zinc-400">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1 bg-zinc-800 rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
