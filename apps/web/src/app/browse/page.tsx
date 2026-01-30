'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
    id: string;
    username: string;
    fullName?: string;
    profile?: { avatarUrl?: string; location?: string; bio?: string };
    skills: Array<{ skill: string; proficiency: number }>;
    interests: Array<{ interest: string }>;
    _count: { hackathonHistory: number; teamMemberships: number };
}

export default function BrowseProfiles() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [skillFilter, setSkillFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [popularSkills, setPopularSkills] = useState<Array<{ skill: string; count: number }>>([]);

    // API URL for local development
    const API_URL = 'http://localhost:4100';

    const fetchUsers = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('q', search);
        if (skillFilter) params.set('skills', skillFilter);
        params.set('page', page.toString());

        try {
            const res = await fetch(`${API_URL}/users/search?${params}`);
            const data = await res.json();
            setUsers(data.users || []);
            setTotalPages(data.pagination?.totalPages || 1);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
        setLoading(false);
    };

    const fetchPopularSkills = async () => {
        try {
            const res = await fetch(`${API_URL}/users/skills/popular?limit=15`);
            const data = await res.json();
            setPopularSkills(data || []);
        } catch (err) {
            console.error('Failed to fetch skills:', err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [search, skillFilter, page]);

    useEffect(() => {
        fetchPopularSkills();
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Header */}
            <div className="bg-gradient-to-b from-indigo-900/20 to-zinc-950 pb-12">
                <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl">🏆</span>
                        <span className="text-xl font-bold gradient-text">Hackathon Hub</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/events" className="text-zinc-400 hover:text-white transition-colors">Events</Link>
                        <Link href="/teams" className="text-zinc-400 hover:text-white transition-colors">My Teams</Link>
                        <Link href="/auth" className="btn-primary">Sign In</Link>
                    </div>
                </nav>

                <div className="max-w-7xl mx-auto px-8 pt-8">
                    <h1 className="text-4xl font-extrabold mb-4">Find <span className="gradient-text">Teammates</span></h1>
                    <p className="text-xl text-zinc-400 mb-8">
                        Connect with developers, designers, and makers for your next hackathon
                    </p>

                    <div className="flex gap-4 max-w-2xl">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or username..."
                            className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:border-indigo-500 outline-none transition-colors"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 pb-20">
                <div className="flex gap-8">
                    {/* Filters */}
                    <div className="w-64 flex-shrink-0 hidden lg:block">
                        <div className="sticky top-8">
                            <div className="card">
                                <h3 className="font-semibold mb-4">Popular Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                    {skillFilter && (
                                        <button
                                            onClick={() => setSkillFilter('')}
                                            className="px-3 py-1 bg-indigo-600 text-white rounded-full text-sm flex items-center gap-1"
                                        >
                                            {skillFilter} ×
                                        </button>
                                    )}
                                    {popularSkills
                                        .filter(s => s.skill !== skillFilter)
                                        .slice(0, 12)
                                        .map(({ skill, count }) => (
                                            <button
                                                key={skill}
                                                onClick={() => setSkillFilter(skill)}
                                                className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-sm hover:bg-zinc-700 transition-colors"
                                            >
                                                {skill}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Users Grid */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Developers</h2>
                            <span className="text-zinc-400">{users.length} members</span>
                        </div>

                        {loading ? (
                            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="card animate-pulse">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-16 h-16 bg-zinc-800 rounded-full" />
                                            <div className="flex-1">
                                                <div className="h-5 bg-zinc-800 rounded w-3/4 mb-2" />
                                                <div className="h-4 bg-zinc-800 rounded w-1/2" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-xl font-semibold mb-2">No users found</h3>
                                <p className="text-zinc-400">Try adjusting your search or filters</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {users.map(user => (
                                    <Link
                                        key={user.id}
                                        href={`/users/${user.username}`}
                                        className="card group hover:border-indigo-500/50 hover:-translate-y-1 transition-all"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0">
                                                {user.profile?.avatarUrl ? (
                                                    <img src={user.profile.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" />
                                                ) : (
                                                    (user.fullName?.[0] || user.username[0]).toUpperCase()
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold group-hover:text-indigo-400 transition-colors truncate">
                                                    {user.fullName || user.username}
                                                </h3>
                                                <p className="text-zinc-500 text-sm">@{user.username}</p>
                                                {user.profile?.location && (
                                                    <p className="text-zinc-500 text-sm flex items-center gap-1 mt-1">
                                                        📍 {user.profile.location}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {user.profile?.bio && (
                                            <p className="text-zinc-400 text-sm mt-4 line-clamp-2">{user.profile.bio}</p>
                                        )}

                                        {user.skills.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-4">
                                                {user.skills.slice(0, 4).map(({ skill, proficiency }) => (
                                                    <span
                                                        key={skill}
                                                        className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full"
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                                {user.skills.length > 4 && (
                                                    <span className="px-2 py-1 text-zinc-500 text-xs">
                                                        +{user.skills.length - 4}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800 text-sm text-zinc-400">
                                            <span>🏆 {user._count.hackathonHistory} hackathons</span>
                                            <span>👥 {user._count.teamMemberships} teams</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {totalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-10">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 bg-zinc-800 rounded-lg disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="px-4 py-2 text-zinc-400">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 bg-zinc-800 rounded-lg disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
