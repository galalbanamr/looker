'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminLayoutProps {
    children: ReactNode;
}

const ADMIN_PASSWORD = 'admin123';

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/events', label: 'Events', icon: '🎯' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/teams', label: 'Teams', icon: '🤝' },
    { href: '/admin/logs', label: 'Audit Logs', icon: '📋' },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
    const [authenticated, setAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        const saved = sessionStorage.getItem('admin_auth');
        if (saved === 'true') setAuthenticated(true);
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setAuthenticated(true);
            sessionStorage.setItem('admin_auth', 'true');
            setError('');
        } else {
            setError('Invalid password');
        }
    };

    const handleLogout = () => {
        setAuthenticated(false);
        sessionStorage.removeItem('admin_auth');
    };

    if (!authenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <span className="text-4xl">🔐</span>
                        <h1 className="text-2xl font-bold mt-4">Admin Panel</h1>
                        <p className="text-zinc-400 mt-2">Hackathon Hub</p>
                    </div>

                    <form onSubmit={handleLogin} className="card">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter admin password"
                                className="input"
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="btn-primary w-full">
                            Login
                        </button>
                    </form>

                    <p className="text-center text-zinc-500 text-sm mt-6">
                        <Link href="/" className="hover:text-white">← Back to home</Link>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-300`}>
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    {sidebarOpen && (
                        <div className="flex items-center gap-2">
                            <span className="text-xl">⚙️</span>
                            <span className="font-bold">Admin</span>
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        {sidebarOpen ? '◀' : '▶'}
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map(item => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                    }`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                {sidebarOpen && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-800">
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors w-full`}
                    >
                        <span className="text-lg">🚪</span>
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 px-8 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold capitalize">
                            {navItems.find(n => n.href === pathname)?.label || 'Admin'}
                        </h1>
                        <Link href="/" className="text-zinc-400 hover:text-white text-sm">
                            ← Back to Site
                        </Link>
                    </div>
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
