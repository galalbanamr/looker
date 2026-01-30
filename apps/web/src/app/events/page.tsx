'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
    imageUrl?: string;
    organizer?: string;
    _count?: { teams: number; savedBy: number };
}

const EVENT_TYPES = ['hackathon', 'conference', 'workshop', 'competition'];
const LOCATION_TYPES = ['virtual', 'in-person', 'hybrid'];

export default function EventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [eventType, setEventType] = useState('');
    const [locationType, setLocationType] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchEvents = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (eventType) params.set('type', eventType);
        if (locationType) params.set('location', locationType);
        params.set('page', page.toString());

        try {
            const res = await fetch(`${API_URL}/events?${params}`);
            const data = await res.json();
            setEvents(data.events || []);
            setTotalPages(data.pagination?.totalPages || 1);
        } catch (err) {
            console.error('Failed to fetch events:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchEvents();
    }, [search, eventType, locationType, page]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchEvents();
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getDeadlineDays = (deadline?: string) => {
        if (!deadline) return null;
        const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days > 0 ? days : null;
    };

    const [user, setUser] = useState<{ name: string } | null>(null);

    // API URL for local development
    const API_URL = 'http://localhost:4100';

    const fetchUser = async () => {
        try {
            const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setUser(data.user);
            }
        } catch (err) {
            console.error('Failed to fetch user:', err);
        }
    };

    useEffect(() => {
        fetchUser();
        fetchEvents();
    }, [search, eventType, locationType, page]);

    const handleLogout = async () => {
        await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-zinc-950" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/20 rounded-full blur-3xl" />

                <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl">🏆</span>
                        <span className="text-xl font-bold gradient-text">Hackathon Hub</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/browse" className="text-zinc-400 hover:text-white transition-colors">Find Teammates</Link>
                        {user ? (
                            <>
                                <Link href="/teams" className="text-zinc-400 hover:text-white transition-colors">My Teams</Link>
                                <div className="flex items-center gap-3 pl-4 border-l border-zinc-800">
                                    <span className="text-sm font-medium">{user.name}</span>
                                    <button onClick={handleLogout} className="text-xs text-zinc-400 hover:text-white">Logout</button>
                                </div>
                            </>
                        ) : (
                            <Link href="/auth" className="btn-primary">Sign In</Link>
                        )}
                    </div>
                </nav>

                <div className="relative z-10 max-w-4xl mx-auto px-8 pt-16 pb-24 text-center">
                    <h1 className="text-4xl md:text-6xl font-extrabold mb-6">
                        Discover <span className="gradient-text">Tech Events</span>
                    </h1>
                    <p className="text-xl text-zinc-400 mb-10">
                        Find hackathons, conferences, and competitions that match your interests
                    </p>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
                        <div className="flex items-center bg-zinc-800/80 rounded-2xl border border-zinc-700 focus-within:border-indigo-500 transition-colors">
                            <span className="pl-6 text-2xl">✨</span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search for hackathons, AI events, Web3 competitions..."
                                className="flex-1 bg-transparent px-4 py-5 text-lg outline-none placeholder:text-zinc-500"
                            />
                            <button type="submit" className="mr-3 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-colors">
                                Search
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-8 pb-20">
                <div className="flex gap-8">
                    {/* Filters Sidebar */}
                    <div className="w-64 flex-shrink-0 hidden lg:block">
                        <div className="sticky top-8 space-y-6">
                            <div className="card">
                                <h3 className="font-semibold mb-4">Event Type</h3>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setEventType('')}
                                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${!eventType ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                                    >
                                        All Types
                                    </button>
                                    {EVENT_TYPES.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setEventType(type)}
                                            className={`w-full text-left px-3 py-2 rounded-lg capitalize transition-colors ${eventType === type ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="card">
                                <h3 className="font-semibold mb-4">Location</h3>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setLocationType('')}
                                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${!locationType ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                                    >
                                        All Locations
                                    </button>
                                    {LOCATION_TYPES.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setLocationType(type)}
                                            className={`w-full text-left px-3 py-2 rounded-lg capitalize transition-colors ${locationType === type ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Events Grid */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">
                                {eventType ? `${eventType.charAt(0).toUpperCase() + eventType.slice(1)}s` : 'All Events'}
                            </h2>
                            <span className="text-zinc-400">{events.length} events found</span>
                        </div>

                        {loading ? (
                            <div className="grid md:grid-cols-2 gap-6">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="card animate-pulse">
                                        <div className="h-40 bg-zinc-800 rounded-lg mb-4" />
                                        <div className="h-6 bg-zinc-800 rounded w-3/4 mb-2" />
                                        <div className="h-4 bg-zinc-800 rounded w-1/2" />
                                    </div>
                                ))}
                            </div>
                        ) : events.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-xl font-semibold mb-2">No events found</h3>
                                <p className="text-zinc-400">Try adjusting your filters or search terms</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-6">
                                {events.map(event => {
                                    const deadlineDays = getDeadlineDays(event.registrationDeadline);
                                    return (
                                        <Link
                                            key={event.id}
                                            href={`/events/${event.id}`}
                                            className="card group hover:border-indigo-500/50 hover:-translate-y-1 transition-all"
                                        >
                                            {event.imageUrl && (
                                                <div className="h-40 bg-zinc-800 rounded-lg mb-4 overflow-hidden">
                                                    <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                                                </div>
                                            )}

                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold group-hover:text-indigo-400 transition-colors line-clamp-2">
                                                        {event.title}
                                                    </h3>
                                                    {event.organizer && (
                                                        <p className="text-zinc-500 text-sm mt-1">by {event.organizer}</p>
                                                    )}
                                                </div>
                                                {deadlineDays && deadlineDays <= 7 && (
                                                    <span className="flex-shrink-0 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                                                        {deadlineDays}d left
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full capitalize">
                                                    {event.eventType}
                                                </span>
                                                <span className="px-2 py-1 bg-zinc-700 text-zinc-300 text-xs rounded-full capitalize">
                                                    {event.locationType}
                                                </span>
                                                {event.tags.slice(0, 2).map(tag => (
                                                    <span key={tag} className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs rounded-full">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800 text-sm text-zinc-400">
                                                {event.startDate && (
                                                    <span className="flex items-center gap-1">
                                                        📅 {formatDate(event.startDate)}
                                                    </span>
                                                )}
                                                {event.city && (
                                                    <span className="flex items-center gap-1">
                                                        📍 {event.city}
                                                    </span>
                                                )}
                                                {event._count && (
                                                    <span className="flex items-center gap-1 ml-auto">
                                                        👥 {event._count.teams} teams
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination */}
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
