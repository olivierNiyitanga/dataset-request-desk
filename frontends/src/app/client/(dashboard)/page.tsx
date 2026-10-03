'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useGetRequestsQuery } from '@/lib/redux/slices/RequestSlice';
import { useGetCurrentUserQuery } from '@/lib/redux/slices/AuthSlice';
import {
    ArrowRight,
    Check,
    Clock3,
    FileText,
    Plus,
} from 'lucide-react';

const statusLabels: Record<string, string> = { submitted: 'Submitted', accepted: 'Accepted', rejected: 'Rejected', in_progress: 'In Progress', delivered: 'Delivered' };

const statTone: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    slate: 'bg-slate-100 text-slate-500',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-emerald-50 text-emerald-600',
};

const statusTone: Record<string, string> = {
    'In Progress': 'bg-amber-50 text-amber-700',
    Delivered: 'bg-emerald-50 text-emerald-700',
    Accepted: 'bg-emerald-50 text-emerald-700',
};

export default function ClientDashboard() {
    const { data: session } = useSession();
    const { data, isLoading, isError } = useGetRequestsQuery({ page: 1, page_size: 100 });
    const { data: backendUser } = useGetCurrentUserQuery();
    const requests = data?.items ?? [];
    const stats = [
        { label: 'Total Requests', value: requests.length, note: 'Current', icon: FileText, tone: 'blue' },
        { label: 'Submitted', value: requests.filter((request) => request.status === 'submitted').length, note: 'Current', icon: Clock3, tone: 'slate' },
        { label: 'In Progress', value: requests.filter((request) => request.status === 'in_progress' || request.status === 'accepted').length, note: 'Current', icon: Clock3, tone: 'amber' },
        { label: 'Delivered', value: requests.filter((request) => request.status === 'delivered').length, note: 'Current', icon: Check, tone: 'green' },
    ];
    const organisation = backendUser?.organisation || backendUser?.name || session?.user?.name || 'your organisation';

    if (isLoading) return <div className="mx-auto max-w-[1280px] px-5 py-7 text-xs text-slate-500">Loading dashboard...</div>;
    if (isError) return <div className="mx-auto max-w-[1280px] px-5 py-7 text-xs text-rose-600">Unable to load dashboard data.</div>;

    return (
        <div className="mx-auto min-h-[calc(100vh-64px)] max-w-[1280px] px-5 py-7 sm:px-8 lg:px-10">
            <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-1.5 text-[10px] font-semibold text-blue-600">Overview</p>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-[22px]">Good morning, {organisation}</h2>
                    <p className="mt-1 text-xs text-slate-500">Manage your dataset requests and review delivered datasets.</p>
                </div>
                <Link href="/client/requests/new" className="inline-flex h-9 w-fit items-center gap-2 rounded-[9px] bg-blue-600 px-3.5 text-[11px] font-semibold text-white no-underline shadow-sm transition-colors hover:bg-blue-700">
                    <Plus size={14} strokeWidth={2.5} />
                    Create New Request
                </Link>
            </section>

            <section aria-label="Request summary" className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <article key={stat.label} className="min-h-[116px] rounded-[14px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.035)]">
                        <div className="flex items-center justify-between">
                            <span className={`grid h-8 w-8 place-items-center rounded-[9px] ${statTone[stat.tone]}`}>
                                <stat.icon size={14} strokeWidth={1.8} />
                            </span>
                            <span className={`text-[9px] font-medium ${stat.note === 'Current' ? 'text-slate-400' : 'text-emerald-600'}`}>{stat.note}</span>
                        </div>
                        <p className="mt-3 text-[22px] font-semibold leading-6 text-slate-950">{stat.value}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{stat.label}</p>
                    </article>
                ))}
            </section>

            <section id="requests" className="overflow-hidden rounded-[14px] border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.035)]">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
                    <div>
                        <h3 className="text-[13px] font-semibold text-slate-900">Recent Requests</h3>
                        <p className="mt-1 text-[10px] text-slate-500">Your latest dataset requests and their current status.</p>
                    </div>
                    <Link href="/client/requests" className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-blue-600 no-underline hover:text-blue-700">
                        View all requests <ArrowRight size={12} />
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                {['Request ID', 'Task', 'Episodes', 'Deadline', 'Status', 'Created', 'Action'].map((heading) => (
                                    <th key={heading} className="px-5 py-3 text-[8px] font-medium uppercase tracking-[0.08em] text-slate-400">{heading}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {requests.slice(0, 3).map((request) => (
                                <tr key={request.id} className="border-t border-slate-100 text-[10px] text-slate-700 transition-colors hover:bg-slate-50/70">
                                    <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-900">{request.id}</td>
                                    <td className="whitespace-nowrap px-5 py-3.5">{request.task_name}</td>
                                    <td className="px-5 py-3.5">{request.episodes_requested}</td>
                                    <td className="whitespace-nowrap px-5 py-3.5">{new Date(`${request.deadline}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                                    <td className="px-5 py-3.5">
                                        <span className={`inline-flex rounded-full px-2 py-1 text-[8px] font-medium ${statusTone[statusLabels[request.status]] || 'bg-slate-100 text-slate-600'}`}>{statusLabels[request.status]}</span>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">{new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                                    <td className="px-5 py-3.5 text-right">
                                        <Link href="/client/requests" className="font-medium text-blue-600 no-underline hover:text-blue-700">{request.status === 'delivered' ? 'Review' : 'View'}</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}