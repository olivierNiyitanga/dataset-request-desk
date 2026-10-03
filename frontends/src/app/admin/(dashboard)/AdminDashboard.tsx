'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Activity, ArrowRight, BellRing, Boxes, ClipboardList, RotateCw, Users } from 'lucide-react';
import { useGetRequestsQuery } from '@/lib/redux/slices/RequestSlice';
import { useGetEpisodesQuery } from '@/lib/redux/slices/EpisodeSlice';
import { useGetUsersQuery } from '@/lib/redux/slices/UserSlice';
import { useGetHealthQuery } from '@/lib/redux/slices/HealthSlice';

const services = ['API', 'Database', 'Episode Import', 'Authentication'];

export default function AdminDashboard() {
    const { data: session } = useSession();
    const { data: requestData, isLoading: requestsLoading } = useGetRequestsQuery({ page: 1, page_size: 100 });
    const { data: episodeData, isLoading: episodesLoading } = useGetEpisodesQuery({ page: 1, page_size: 100 });
    const { data: users, isLoading: usersLoading } = useGetUsersQuery();
    const { data: health } = useGetHealthQuery();
    const requests = requestData?.items ?? [];
    const episodes = episodeData?.items ?? [];
    const metrics = [
        { label: 'Total Requests', value: requestData?.total ?? 0, note: 'From database', icon: ClipboardList, tone: 'bg-slate-100 text-slate-600' },
        { label: 'Active Requests', value: requests.filter((request) => ['submitted', 'accepted', 'in_progress'].includes(request.status)).length, note: 'Current workflow', icon: RotateCw, tone: 'bg-blue-50 text-blue-600' },
        { label: 'Available Episodes', value: episodes.filter((episode) => !episode.assignment).length, note: 'Current page inventory', icon: Boxes, tone: 'bg-emerald-50 text-emerald-600' },
        { label: 'Active Users', value: users?.filter((user) => user.is_active).length ?? 0, note: 'Active accounts', icon: Users, tone: 'bg-violet-50 text-violet-600' },
    ];
    const recentRequests = requests.slice(0, 3).map((request) => ({ id: request.id, client: request.client.organisation || request.client.name || request.client.email, task: request.task_name, progress: request.episodes_requested ? Math.round((request.assigned_episode_count / request.episodes_requested) * 100) : 0, status: request.status === 'in_progress' || request.status === 'accepted' ? 'In Progress' : request.status === 'delivered' ? 'Delivered' : 'Submitted' }));
    const firstName = session?.user?.name?.trim().split(/\s+/)[0] || 'there';

    if (requestsLoading || episodesLoading || usersLoading) return <div className="mx-auto max-w-[1440px] px-5 py-6 text-xs text-slate-500">Loading dashboard...</div>;

    return (
        <div className="mx-auto min-h-[calc(100vh-54px)] max-w-[1440px] px-5 py-6 sm:px-6 lg:px-[26px]">
            <section className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div><h2 className="text-xl font-semibold tracking-tight text-slate-950">Good morning, {firstName}</h2><p className="mt-1 text-[10px] text-slate-500">Monitor requests, episode inventory, and platform activity.</p></div>
                <Link href="/admin/users" className="inline-flex h-8 w-fit items-center gap-2 rounded-[7px] bg-slate-900 px-3 text-[9px] font-semibold text-white no-underline hover:bg-slate-700"><Users size={12} /> Add User</Link>
            </section>

            <section aria-label="Platform overview" className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => <article key={metric.label} className="min-h-[106px] rounded-[11px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_2px_5px_rgba(15,23,42,0.025)]"><div className="flex items-center justify-between"><p className="text-[9px] text-slate-500">{metric.label}</p><span className={`grid h-6 w-6 place-items-center rounded-[6px] ${metric.tone}`}><metric.icon size={13} /></span></div><p className="mt-2 text-xl font-semibold leading-6 text-slate-950">{metric.value}</p><p className={`mt-1 text-[8px] ${metric.label === 'Total Requests' ? 'text-emerald-600' : 'text-slate-500'}`}>{metric.note}</p></article>)}
            </section>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(280px,0.85fr)]">
                <section className="overflow-hidden rounded-[11px] border border-slate-200 bg-white shadow-[0_2px_5px_rgba(15,23,42,0.025)]">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5"><div><h3 className="text-[11px] font-semibold text-slate-950">Recent Requests</h3><p className="mt-1 text-[9px] text-slate-500">Latest activity across all clients</p></div><Link href="/admin/requests" className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-700 no-underline hover:text-blue-600">View all <ArrowRight size={11} /></Link></div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[590px] text-left"><thead className="bg-slate-50"><tr>{['Request', 'Client', 'Task', 'Progress', 'Status'].map((label) => <th key={label} className="px-4 py-2.5 text-[8px] font-medium uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead><tbody>{recentRequests.map((request) => <tr key={request.id} className="border-t border-slate-100 text-[9px] text-slate-700"><td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-900">{request.id}</td><td className="whitespace-nowrap px-4 py-3.5">{request.client}</td><td className="whitespace-nowrap px-4 py-3.5">{request.task}</td><td className="px-4 py-3.5"><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{ width: `${request.progress}%` }} /></div><span className="text-[8px] text-slate-500">{request.progress}%</span></div></td><td className="px-4 py-3.5"><span className={`rounded-full px-2 py-1 text-[8px] font-medium ${request.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' : request.status === 'Submitted' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'}`}>{request.status}</span></td></tr>)}</tbody></table></div>
                </section>

                <section className="rounded-[11px] border border-slate-200 bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.025)]"><div className="flex items-center gap-2"><Activity size={14} className="text-slate-500" /><div><h3 className="text-[11px] font-semibold text-slate-950">System Health</h3><p className="mt-1 text-[9px] text-slate-500">Current platform services</p></div></div><ul className="mt-4 space-y-3">{services.map((service) => <li key={service} className="flex items-center gap-2 text-[9px]"><span className={`h-1.5 w-1.5 rounded-full ${health?.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`} /><span className="flex-1 text-slate-700">{service}</span><span className={`text-[8px] font-medium ${health?.status === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>{health?.status === 'ok' ? 'Operational' : 'Unavailable'}</span></li>)}</ul><p className="mt-4 flex items-center gap-1.5 rounded-[7px] bg-slate-50 px-2.5 py-2 text-[8px] text-slate-500"><BellRing size={10} /> Health status from backend</p></section>
            </div>
        </div>
    );
}