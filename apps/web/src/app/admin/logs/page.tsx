'use client';

import { useState, useEffect } from 'react';

interface AuditLog {
    id: string;
    adminId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    changes?: Record<string, any>;
    ipAddress?: string;
    createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL === 'RELATIVE' ? 'https://car-scan.qa/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

export default function AdminLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchLogs();
    }, [page]);

    const fetchLogs = async () => {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', '30');

        try {
            const res = await fetch(`${API_URL}/admin/audit-logs?${params}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                setTotalPages(data.pagination?.totalPages || 1);
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        }
        setLoading(false);
    };

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const getActionColor = (action: string) => {
        if (action.includes('delete')) return 'text-red-400 bg-red-500/20';
        if (action.includes('create')) return 'text-green-400 bg-green-500/20';
        if (action.includes('update') || action.includes('verify')) return 'text-blue-400 bg-blue-500/20';
        return 'text-zinc-400 bg-zinc-700';
    };

    return (
        <div className="space-y-6">
            <p className="text-zinc-400">Admin activity audit trail</p>

            <div className="card overflow-hidden p-0">
                <table className="w-full">
                    <thead className="bg-zinc-800/50">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">Timestamp</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">Action</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">Resource</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-400">IP Address</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [...Array(10)].map((_, i) => (
                                <tr key={i} className="border-t border-zinc-800">
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-32 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-24 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-40 animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-zinc-800 rounded w-24 animate-pulse" /></td>
                                </tr>
                            ))
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                                    No audit logs found
                                </td>
                            </tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                                    <td className="px-6 py-4 text-zinc-400 text-sm">{formatDate(log.createdAt)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full ${getActionColor(log.action)}`}>
                                            {log.action.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-zinc-300">{log.resourceType}</span>
                                        {log.resourceId && (
                                            <span className="text-zinc-500 text-sm ml-2">#{log.resourceId.slice(0, 8)}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-500 text-sm font-mono">{log.ipAddress || '—'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 p-4 border-t border-zinc-800">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 bg-zinc-800 rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-zinc-400">Page {page} of {totalPages}</span>
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
