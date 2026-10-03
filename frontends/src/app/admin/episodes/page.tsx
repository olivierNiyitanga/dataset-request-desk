'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { useGetEpisodesQuery, type EpisodeQuality } from '@/lib/redux/slices/EpisodeSlice';

export default function AdminEpisodesPage() {
    const [taskSearch, setTaskSearch] = useState('');
    const [quality, setQuality] = useState('All quality');
    const [robot, setRobot] = useState('All robots');
    const [filters, setFilters] = useState({ task: '', quality: 'All quality', robot: 'All robots' });
    const { data, isLoading, isError } = useGetEpisodesQuery({ page: 1, page_size: 100, task_name: filters.task || undefined, quality: filters.quality === 'All quality' ? undefined : filters.quality.toLowerCase() as EpisodeQuality, robot_id: filters.robot === 'All robots' ? undefined : filters.robot });
    const filteredEpisodes = data?.items ?? [];

    if (isLoading) return <div className="mx-auto max-w-[1440px] px-5 py-6 text-xs text-slate-500">Loading episodes...</div>;
    if (isError) return <div className="mx-auto max-w-[1440px] px-5 py-6 text-xs text-rose-600">Unable to load episodes.</div>;

    return (
        <div className="mx-auto min-h-[calc(100vh-54px)] max-w-[1440px] px-5 py-6 sm:px-6 lg:px-[26px]">
            <div className="mb-5 flex items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-950">Episode Management</h2><p className="mt-1 text-[10px] text-slate-500">Search and assign available recording episodes.</p></div><Link href="/admin/import-episodes" className="inline-flex h-8 items-center gap-2 rounded-[7px] bg-slate-900 px-3 text-[9px] font-medium text-white no-underline hover:bg-slate-700"><UploadCloud size={12} /> Import CSV</Link></div>
            <section className="mb-3 flex flex-col gap-2 rounded-[10px] border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
                <input value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} placeholder="Search task..." aria-label="Search tasks" className="h-[34px] min-w-0 flex-1 rounded-[8px] border border-slate-200 px-2.5 text-[9px] outline-none focus:border-blue-500" />
                <select value={quality} onChange={(event) => setQuality(event.target.value)} aria-label="Filter episode quality" className="h-[34px] rounded-[8px] border border-slate-200 bg-white px-2.5 text-[9px]"><option>All quality</option><option>Good</option><option>Usable</option><option>Bad</option></select>
                <select value={robot} onChange={(event) => setRobot(event.target.value)} aria-label="Filter robot" className="h-[34px] rounded-[8px] border border-slate-200 bg-white px-2.5 text-[9px]"><option>All robots</option><option>RB-01</option><option>RB-02</option><option>RB-03</option></select>
                <button type="button" onClick={() => setFilters({ task: taskSearch, quality, robot })} className="h-[34px] rounded-[8px] border border-slate-200 px-4 text-[9px] font-medium hover:bg-slate-50">Apply filters</button>
            </section>
            <section className="overflow-x-auto rounded-[11px] border border-slate-200 bg-white"><table className="w-full min-w-[850px] text-left"><thead className="bg-slate-50"><tr>{['Episode ID', 'Robot', 'Task', 'Recorded', 'Duration', 'Quality', 'Availability'].map((label) => <th key={label} className="px-4 py-3 text-[8px] font-medium uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead><tbody>{filteredEpisodes.map((episode) => <tr key={episode.id} className="border-t border-slate-100 text-[9px] text-slate-700"><td className="px-4 py-3.5 font-medium text-slate-900">{episode.episode_id}</td><td className="px-4 py-3.5">{episode.robot_id || '—'}</td><td className="px-4 py-3.5">{episode.task_name || '—'}</td><td className="px-4 py-3.5">{episode.recorded_at ? new Date(episode.recorded_at).toLocaleString() : '—'}</td><td className="px-4 py-3.5">{episode.duration_seconds ? `${episode.duration_seconds}s` : '—'}</td><td className="px-4 py-3.5"><span className={`rounded-full px-2 py-1 text-[8px] font-medium ${episode.quality === 'good' ? 'bg-emerald-50 text-emerald-700' : episode.quality === 'usable' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{episode.quality || 'Unknown'}</span></td><td className={`px-4 py-3.5 ${episode.assignment ? 'text-slate-400' : 'text-emerald-600'}`}>{episode.assignment ? 'Assigned' : 'Available'}</td></tr>)}{filteredEpisodes.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-[9px] text-slate-500">No episodes match these filters.</td></tr>}</tbody></table></section>
        </div>
    );
}