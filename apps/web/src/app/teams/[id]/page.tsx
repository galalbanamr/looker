'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Message {
    id: string;
    content: string;
    messageType: string;
    createdAt: string;
    editedAt?: string;
    user: { id: string; username: string; fullName?: string; profile?: { avatarUrl?: string } };
}

interface Team {
    id: string;
    name: string;
    description?: string;
    maxMembers: number;
    lookingForSkills: string[];
    isOpen: boolean;
    event?: { id: string; title: string };
    members: Array<{
        role: string;
        user: { id: string; username: string; fullName?: string; profile?: { avatarUrl?: string } };
    }>;
}

export default function TeamDetailPage() {
    const params = useParams();
    // API URL for local development
    const API_URL = 'http://localhost:4100';

    const [team, setTeam] = useState<Team | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchTeam = async () => {
        try {
            const res = await fetch(`${API_URL}/teams/${params.id}`, { credentials: 'include' });
            if (res.ok) setTeam(await res.json());
        } catch (err) {
            console.error('Failed to fetch team:', err);
        }
        setLoading(false);
    };

    const fetchMessages = async () => {
        try {
            const res = await fetch(`${API_URL}/teams/${params.id}/messages`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sendingMessage) return;

        setSendingMessage(true);
        // In production this would use WebSocket, for now just show optimistic update
        const tempMessage: Message = {
            id: `temp-${Date.now()}`,
            content: newMessage,
            messageType: 'text',
            createdAt: new Date().toISOString(),
            user: { id: 'me', username: 'You', fullName: 'You' },
        };
        setMessages(prev => [...prev, tempMessage]);
        setNewMessage('');
        setSendingMessage(false);
    };

    useEffect(() => {
        fetchTeam();
        fetchMessages();
    }, [params.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
                <div className="text-6xl mb-4">🔍</div>
                <h1 className="text-2xl font-bold mb-2">Team Not Found</h1>
                <Link href="/teams" className="text-indigo-400 hover:underline">Back to Teams</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex">
            {/* Sidebar */}
            <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col">
                <div className="p-6 border-b border-zinc-800">
                    <Link href="/teams" className="text-zinc-400 hover:text-white text-sm mb-4 inline-block">← Back</Link>
                    <h1 className="text-xl font-bold">{team.name}</h1>
                    {team.event && (
                        <Link href={`/events/${team.event.id}`} className="text-indigo-400 text-sm hover:underline">
                            {team.event.title}
                        </Link>
                    )}
                </div>

                {team.description && (
                    <div className="p-6 border-b border-zinc-800">
                        <h3 className="text-sm text-zinc-400 mb-2">About</h3>
                        <p className="text-sm text-zinc-300">{team.description}</p>
                    </div>
                )}

                <div className="p-6 flex-1 overflow-auto">
                    <h3 className="text-sm text-zinc-400 mb-4">
                        Members ({team.members.length}/{team.maxMembers})
                    </h3>
                    <div className="space-y-3">
                        {team.members.map(member => (
                            <Link
                                key={member.user.id}
                                href={`/users/${member.user.username}`}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center font-bold">
                                    {member.user.fullName?.[0] || member.user.username[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">
                                        {member.user.fullName || member.user.username}
                                    </p>
                                    <p className="text-xs text-zinc-500 capitalize">{member.role}</p>
                                </div>
                                {member.role === 'leader' && (
                                    <span className="text-yellow-400 text-sm">👑</span>
                                )}
                            </Link>
                        ))}
                    </div>

                    {team.lookingForSkills.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-sm text-zinc-400 mb-2">Looking for</h3>
                            <div className="flex flex-wrap gap-2">
                                {team.lookingForSkills.map(skill => (
                                    <span key={skill} className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold">Team Chat</h2>
                        <p className="text-sm text-zinc-400">{team.members.length} members</p>
                    </div>
                    <button className="btn-secondary text-sm">⚙️ Settings</button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-auto p-6 space-y-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                            <div className="text-5xl mb-4">💬</div>
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className="flex gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                                    {msg.user.fullName?.[0] || msg.user.username[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="font-semibold">{msg.user.fullName || msg.user.username}</span>
                                        <span className="text-xs text-zinc-500">{formatTime(msg.createdAt)}</span>
                                        {msg.editedAt && <span className="text-xs text-zinc-600">(edited)</span>}
                                    </div>
                                    <p className="text-zinc-300 break-words">{msg.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={sendMessage} className="p-4 border-t border-zinc-800">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:border-indigo-500 outline-none transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || sendingMessage}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl font-semibold transition-colors"
                        >
                            Send
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
