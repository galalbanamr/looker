'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Event {
    id: string;
    title: string;
    url: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    registrationDeadline?: string;
    locationType: string;
    city?: string;
    country?: string;
    eventType: string;
    tags: string[];
    prizes?: Array<{ amount: number; currency: string; position: string }>;
    requirements?: string[];
    imageUrl?: string;
    organizer?: string;
    teams?: Array<{
        id: string;
        name: string;
        members: Array<{
            user: { id: string; username: string; fullName?: string; profile?: { avatarUrl?: string } };
            role: string;
        }>;
    }>;
    _count?: { teams: number; savedBy: number };
}

export default function EventDetailPage() {
    const params = useParams();
    // API URL for local development
    const API_URL = 'http://localhost:4100';

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState<{ days: number; hours: number; mins: number } | null>(null);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await fetch(`${API_URL}/events/${params.id}`);
                const data = await res.json();
                setEvent(data);
            } catch (err) {
                console.error('Failed to fetch event:', err);
            }
            setLoading(false);
        };
        fetchEvent();
    }, [params.id]);

    useEffect(() => {
        if (!event?.registrationDeadline) return;

        const updateCountdown = () => {
            const diff = new Date(event.registrationDeadline!).getTime() - Date.now();
            if (diff <= 0) {
                setCountdown(null);
                return;
            }
            setCountdown({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            });
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 60000);
        return () => clearInterval(interval);
    }, [event?.registrationDeadline]);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
                <div className="text-6xl mb-4">🔍</div>
                <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
                <Link href="/events" className="text-indigo-400 hover:underline">Back to Events</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Navigation */}
            <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
                <Link href="/events" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                    <span>←</span> Back to Events
                </Link>
                <button className="text-zinc-400 hover:text-white transition-colors">
                    🔖 Save Event
                </button>
            </nav>

            <div className="max-w-7xl mx-auto px-8 pb-20">
                {/* Header */}
                {event.imageUrl && (
                    <div className="h-64 md:h-80 rounded-2xl overflow-hidden mb-8">
                        <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                    </div>
                )}

                <div className="flex flex-wrap gap-3 mb-4">
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full capitalize">
                        {event.eventType}
                    </span>
                    <span className="px-3 py-1 bg-zinc-700 text-zinc-300 rounded-full capitalize">
                        {event.locationType}
                    </span>
                    {event.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-full">
                            {tag}
                        </span>
                    ))}
                </div>

                <h1 className="text-3xl md:text-5xl font-extrabold mb-4">{event.title}</h1>
                {event.organizer && <p className="text-xl text-zinc-400 mb-8">Organized by {event.organizer}</p>}

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Description */}
                        <div className="card">
                            <h2 className="text-xl font-bold mb-4">About This Event</h2>
                            <p className="text-zinc-300 whitespace-pre-wrap">{event.description || 'No description available.'}</p>
                        </div>

                        {/* Requirements */}
                        {event.requirements && event.requirements.length > 0 && (
                            <div className="card">
                                <h2 className="text-xl font-bold mb-4">Requirements</h2>
                                <ul className="space-y-2">
                                    {event.requirements.map((req, i) => (
                                        <li key={i} className="flex items-start gap-3 text-zinc-300">
                                            <span className="text-indigo-400">•</span>
                                            {req}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Prizes */}
                        {event.prizes && event.prizes.length > 0 && (
                            <div className="card">
                                <h2 className="text-xl font-bold mb-4">💰 Prizes</h2>
                                <div className="grid sm:grid-cols-3 gap-4">
                                    {event.prizes.map((prize, i) => (
                                        <div key={i} className="text-center p-4 bg-zinc-800/50 rounded-xl">
                                            <div className="text-3xl mb-2">
                                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'}
                                            </div>
                                            <div className="text-sm text-zinc-400">{prize.position}</div>
                                            <div className="text-2xl font-bold text-indigo-400">
                                                {prize.currency === 'USD' ? '$' : prize.currency}{prize.amount.toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Teams */}
                        {event.teams && event.teams.length > 0 && (
                            <div className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold">👥 Teams ({event._count?.teams || 0})</h2>
                                    <Link href={`/teams?event=${event.id}`} className="text-indigo-400 hover:underline text-sm">
                                        View All →
                                    </Link>
                                </div>
                                <div className="space-y-4">
                                    {event.teams.slice(0, 3).map(team => (
                                        <Link key={team.id} href={`/teams/${team.id}`} className="block p-4 bg-zinc-800/50 rounded-xl hover:bg-zinc-800 transition-colors">
                                            <div className="font-semibold">{team.name}</div>
                                            <div className="flex items-center gap-2 mt-2">
                                                {team.members.slice(0, 4).map(member => (
                                                    <div key={member.user.id} className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-semibold">
                                                        {member.user.fullName?.[0] || member.user.username[0].toUpperCase()}
                                                    </div>
                                                ))}
                                                {team.members.length > 4 && (
                                                    <span className="text-zinc-400 text-sm">+{team.members.length - 4}</span>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Countdown */}
                        {countdown && (
                            <div className="card bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/30">
                                <h3 className="text-sm text-zinc-400 mb-2">Registration Deadline</h3>
                                <div className="flex gap-4 text-center">
                                    <div>
                                        <div className="text-3xl font-bold text-red-400">{countdown.days}</div>
                                        <div className="text-xs text-zinc-500">days</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-red-400">{countdown.hours}</div>
                                        <div className="text-xs text-zinc-500">hours</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-red-400">{countdown.mins}</div>
                                        <div className="text-xs text-zinc-500">mins</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Event Details */}
                        <div className="card space-y-4">
                            {event.startDate && (
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📅</span>
                                    <div>
                                        <div className="text-sm text-zinc-400">Date</div>
                                        <div className="font-semibold">{formatDate(event.startDate)}</div>
                                        {event.endDate && <div className="text-sm text-zinc-400">to {formatDate(event.endDate)}</div>}
                                    </div>
                                </div>
                            )}

                            {event.registrationDeadline && (
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">⏰</span>
                                    <div>
                                        <div className="text-sm text-zinc-400">Deadline</div>
                                        <div className="font-semibold">{formatDate(event.registrationDeadline)}</div>
                                    </div>
                                </div>
                            )}

                            {(event.city || event.locationType) && (
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📍</span>
                                    <div>
                                        <div className="text-sm text-zinc-400">Location</div>
                                        <div className="font-semibold capitalize">
                                            {event.city ? `${event.city}${event.country ? `, ${event.country}` : ''}` : event.locationType}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <a
                                href={event.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary w-full text-center block"
                            >
                                Register Now →
                            </a>
                            <button className="btn-secondary w-full">
                                🤝 Find Teammates
                            </button>
                        </div>

                        {/* Share */}
                        <div className="card">
                            <h3 className="font-semibold mb-3">Share Event</h3>
                            <div className="flex gap-2">
                                <button className="flex-1 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-sm">
                                    🐦 Twitter
                                </button>
                                <button className="flex-1 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-sm">
                                    💼 LinkedIn
                                </button>
                                <button className="flex-1 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-sm">
                                    🔗 Copy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
