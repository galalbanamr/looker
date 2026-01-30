'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Team {
    id: string;
    name: string;
    description?: string;
    maxMembers: number;
    lookingForSkills: string[];
    isOpen: boolean;
    event?: { id: string; title: string; startDate?: string };
    members: Array<{
        role: string;
        user: { id: string; username: string; fullName?: string; profile?: { avatarUrl?: string } };
    }>;
    _count: { messages: number };
}

interface Invitation {
    id: string;
    message?: string;
    team: {
        name: string;
        event?: { id: string; title: string };
        members: Array<{ user: { username: string; fullName?: string; profile?: { avatarUrl?: string } } }>;
    };
    inviter: { username: string; fullName?: string };
}

export default function TeamsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);

    // API URL for local development
    const API_URL = 'http://localhost:4100';

    const fetchData = async () => {
        try {
            const [teamsRes, invitesRes] = await Promise.all([
                fetch(`${API_URL}/teams/user/my-teams`, { credentials: 'include' }),
                fetch(`${API_URL}/teams/user/invitations`, { credentials: 'include' }),
            ]);

            if (teamsRes.ok) setTeams(await teamsRes.json());
            if (invitesRes.ok) setInvitations(await invitesRes.json());
        } catch (err) {
            console.error('Failed to fetch teams:', err);
        }
        setLoading(false);
    };

    const handleInvitation = async (invitationId: string, accept: boolean) => {
        try {
            await fetch(`${API_URL}/teams/invitations/${invitationId}/${accept ? 'accept' : 'reject'}`, {
                method: 'POST',
                credentials: 'include'
            });
            fetchData();
        } catch (err) {
            console.error('Failed to respond to invitation:', err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950">
            <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
                    <span className="text-xl font-bold gradient-text">Hackathon Hub</span>
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="/events" className="text-zinc-400 hover:text-white transition-colors">Events</Link>
                    <Link href="/browse" className="text-zinc-400 hover:text-white transition-colors">Find Teammates</Link>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-8 pb-20">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl font-extrabold">My <span className="gradient-text">Teams</span></h1>
                    <Link href="/teams/create" className="btn-primary">+ Create Team</Link>
                </div>

                {/* Pending Invitations */}
                {invitations.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                            Pending Invitations ({invitations.length})
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            {invitations.map(inv => (
                                <div key={inv.id} className="card border-indigo-500/30 bg-indigo-900/10">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="font-semibold">{inv.team.name}</h3>
                                            {inv.team.event && (
                                                <p className="text-sm text-zinc-400">for {inv.team.event.title}</p>
                                            )}
                                            <p className="text-sm text-zinc-500 mt-1">
                                                Invited by @{inv.inviter.username}
                                            </p>
                                            {inv.message && (
                                                <p className="text-sm text-zinc-400 mt-2 italic">"{inv.message}"</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleInvitation(inv.id, true)}
                                                className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded-lg text-sm transition-colors"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleInvitation(inv.id, false)}
                                                className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm transition-colors"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* My Teams */}
                {loading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="card animate-pulse">
                                <div className="h-6 bg-zinc-800 rounded w-3/4 mb-4" />
                                <div className="h-4 bg-zinc-800 rounded w-1/2 mb-4" />
                                <div className="flex gap-2">
                                    <div className="w-10 h-10 bg-zinc-800 rounded-full" />
                                    <div className="w-10 h-10 bg-zinc-800 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : teams.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">👥</div>
                        <h3 className="text-xl font-semibold mb-2">No teams yet</h3>
                        <p className="text-zinc-400 mb-6">Join an existing team or create your own</p>
                        <div className="flex justify-center gap-4">
                            <Link href="/events" className="btn-secondary">Browse Events</Link>
                            <Link href="/teams/create" className="btn-primary">Create Team</Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teams.map(team => (
                            <Link
                                key={team.id}
                                href={`/teams/${team.id}`}
                                className="card group hover:border-indigo-500/50 hover:-translate-y-1 transition-all"
                            >
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                        <h3 className="font-semibold text-lg group-hover:text-indigo-400 transition-colors">
                                            {team.name}
                                        </h3>
                                        {team.event && (
                                            <p className="text-sm text-zinc-400">{team.event.title}</p>
                                        )}
                                    </div>
                                    {team._count.messages > 0 && (
                                        <span className="px-2 py-1 bg-indigo-600 text-xs rounded-full">
                                            💬 {team._count.messages}
                                        </span>
                                    )}
                                </div>

                                {team.description && (
                                    <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{team.description}</p>
                                )}

                                <div className="flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        {team.members.slice(0, 4).map(member => (
                                            <div
                                                key={member.user.id}
                                                className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold border-2 border-zinc-900"
                                            >
                                                {member.user.fullName?.[0] || member.user.username[0].toUpperCase()}
                                            </div>
                                        ))}
                                        {team.members.length > 4 && (
                                            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-sm font-bold border-2 border-zinc-900">
                                                +{team.members.length - 4}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-zinc-500 text-sm">
                                        {team.members.length}/{team.maxMembers}
                                    </span>
                                </div>

                                {team.lookingForSkills.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-zinc-800">
                                        <p className="text-xs text-zinc-500 mb-2">Looking for:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {team.lookingForSkills.slice(0, 3).map(skill => (
                                                <span key={skill} className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
