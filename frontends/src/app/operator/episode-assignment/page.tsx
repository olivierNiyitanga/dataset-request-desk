'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpFromLine } from 'lucide-react';
import { toast } from 'sonner';
import { useGetEpisodesQuery, type EpisodeQuality } from '@/lib/redux/slices/EpisodeSlice';
import { useGetRequestsQuery } from '@/lib/redux/slices/RequestSlice';
import { useAssignEpisodesMutation } from '@/lib/redux/slices/AssignmentSlice';

function formatTaskName(task: string) {
    return task.trim().split(/\s+/).filter(Boolean).map((word) => `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`).join(' ');
}

export default function EpisodeAssignmentPage() {
    const [taskSearch, setTaskSearch] = useState('');
    const [quality, setQuality] = useState('All quality');
    const [robot, setRobot] = useState('All robots');
    const [unassignedOnly, setUnassignedOnly] = useState(true);
    const [filters, setFilters] = useState({ task: '', quality: 'All quality', robot: 'All robots', unassigned: true });
    const [selectedEpisodes, setSelectedEpisodes] = useState<number[]>([]);
    const [targetRequestId, setTargetRequestId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    useEffect(() => {
        const rawRequestId = new URLSearchParams(window.location.search).get('requestId');
        const requestId = Number(rawRequestId);
        if (rawRequestId && Number.isInteger(requestId) && requestId > 0) setTargetRequestId(requestId);
    }, []);

    const { data: requestsData } = useGetRequestsQuery({ page: 1, page_size: 100 });
    const activeRequests = (requestsData?.items ?? []).filter((request) => ['submitted', 'in_progress', 'rejected'].includes(request.status));
    const targetRequest = activeRequests.find((request) => request.id === targetRequestId) ?? activeRequests[0];
    useEffect(() => {
        if (targetRequest) setTaskSearch(targetRequest.task_name);
    }, [targetRequest?.id, targetRequest?.task_name]);

    const { data: episodesData, isLoading, isError } = useGetEpisodesQuery({
        page: currentPage,
        page_size: pageSize,
        task: filters.task.trim() || undefined,
        quality: filters.quality === 'All quality' ? undefined : filters.quality.toLowerCase() as EpisodeQuality,
        robot_id: filters.robot === 'All robots' ? undefined : filters.robot,
        unassigned_only: filters.unassigned,
        assignable_only: true,
    });
    const [assignEpisodes, { isLoading: isAssigning }] = useAssignEpisodesMutation();
    const availableEpisodes = useMemo(
        () => (episodesData?.items ?? []).filter((episode) => !filters.unassigned || !episode.assignment),
        [episodesData, filters.unassigned],
    );
    const selectableEpisodes = useMemo(
        () => availableEpisodes.filter((episode) => !episode.assignment && (episode.quality === 'good' || episode.quality === 'usable')),
        [availableEpisodes],
    );
    const totalPages = episodesData?.pages ?? 0;
    const pageStart = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const visiblePageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => pageStart + index);
    const firstVisibleRow = episodesData?.total ? (currentPage - 1) * pageSize + 1 : 0;
    const lastVisibleRow = Math.min(currentPage * pageSize, episodesData?.total ?? 0);

    useEffect(() => {
        if (totalPages === 0 && currentPage !== 1) setCurrentPage(1);
        else if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    const toggleEpisode = (episodeId: number) => {
        setSelectedEpisodes((selected) => selected.includes(episodeId) ? selected.filter((id) => id !== episodeId) : [...selected, episodeId]);
    };

    const assignSelected = async () => {
        const episodeIds = selectedEpisodes;
        if (!targetRequest || !episodeIds.length) {
            toast.info(targetRequest ? 'Select unassigned good or usable episodes to assign.' : 'There is no active request to assign.');
            return;
        }
        try {
            await assignEpisodes({ requestId: targetRequest.id, episode_ids: episodeIds }).unwrap();
            setSelectedEpisodes([]);
            toast.success('Episodes assigned successfully.');
        } catch (error) {
            const detail = (error as { data?: { detail?: string } })?.data?.detail;
            toast.error(detail || 'Unable to assign episodes.');
        }
    };

    if (isLoading) return <div className="mx-auto max-w-[1440px] px-5 py-6 text-xs text-slate-500">Loading episodes...</div>;
    if (isError) return <div className="mx-auto max-w-[1440px] px-5 py-6 text-xs text-rose-600">Unable to load episodes.</div>;

    return (
        <div className="mx-auto min-h-[calc(100vh-54px)] max-w-[1440px] px-5 py-6 sm:px-6 lg:px-[26px]">
            <div className="mb-5">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">Episode Assignment</h2>
                <p className="mt-1 text-[10px] text-slate-500">Find eligible episodes and assign them to an active request.</p>
            </div>
            <div className="mb-3 flex justify-end">
                <Link href="/operator/import-episodes" className="inline-flex h-8 items-center gap-2 rounded-[7px] bg-slate-900 px-3 text-[9px] font-medium text-white no-underline hover:bg-slate-700"><ArrowUpFromLine size={12} /> Import CSV</Link>
            </div>
            <section className="mb-3 flex flex-col gap-2 rounded-[10px] border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
                <input value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} disabled={Boolean(targetRequest)} placeholder="Task name" aria-label="Filter by task" className="h-[32px] min-w-0 flex-1 rounded-[7px] border border-slate-200 px-2.5 text-[9px] outline-none placeholder:text-slate-400 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500" />
                <select value={quality} onChange={(event) => setQuality(event.target.value)} aria-label="Filter by quality" className="h-[32px] rounded-[7px] border border-slate-200 bg-white px-2.5 text-[9px] text-slate-700"><option>All quality</option><option>Good</option><option>Usable</option></select>
                <select value={robot} onChange={(event) => setRobot(event.target.value)} aria-label="Filter by robot" className="h-[32px] rounded-[7px] border border-slate-200 bg-white px-2.5 text-[9px] text-slate-700"><option>All robots</option><option value="arm-01">arm-01</option><option value="arm-02">arm-02</option><option value="arm-03">arm-03</option><option value="mobile-01">mobile-01</option><option value="humanoid-01">humanoid-01</option></select>
                <select value={targetRequest?.id ?? ''} onChange={(event) => { setTargetRequestId(event.target.value ? Number(event.target.value) : null); setSelectedEpisodes([]); setCurrentPage(1); }} aria-label="Select request for assignment" className="h-[32px] rounded-[7px] border border-slate-200 bg-white px-2.5 text-[9px] text-slate-700"><option value="">Select request</option>{activeRequests.map((request) => <option key={request.id} value={request.id}>#{request.id} · {request.task_name}</option>)}</select>
                <select value={unassignedOnly ? 'Unassigned only' : 'All episodes'} onChange={(event) => setUnassignedOnly(event.target.value === 'Unassigned only')} aria-label="Filter assigned episodes" className="h-[32px] rounded-[7px] border border-slate-200 bg-white px-2.5 text-[9px] text-slate-700"><option>Unassigned only</option><option>All episodes</option></select>
                <button type="button" onClick={() => { setFilters({ task: targetRequest?.task_name ?? taskSearch, quality, robot, unassigned: unassignedOnly }); setSelectedEpisodes([]); setCurrentPage(1); }} className="h-[32px] rounded-[7px] border border-slate-200 px-3 text-[9px] font-medium text-slate-800 hover:bg-slate-50">Apply</button>
            </section>

            <section className="mb-3 flex flex-col justify-between gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 sm:flex-row sm:items-center">
                <p className="text-[9px] text-slate-700">
                    {targetRequest ? <><span className="font-semibold text-slate-900">Request #{targetRequest.id} — {formatTaskName(targetRequest.task_name)} — {targetRequest.episodes_requested} episodes required</span><span className="ml-2">{targetRequest.assigned_episode_count} assigned · click Apply to filter episodes</span></> : <span className="font-semibold text-slate-900">Select a request to filter matching episodes.</span>}
                </p>
                <button type="button" disabled={isAssigning || selectedEpisodes.length === 0} onClick={assignSelected} className="h-7 rounded-[7px] bg-slate-900 px-3 text-[9px] font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300">{isAssigning ? 'Assigning...' : 'Assign selected'}</button>
            </section>

            <section className="overflow-x-auto rounded-[10px] border border-slate-200 bg-white">
                <table className="w-full min-w-[780px] text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="w-10 px-3 py-2.5"><input type="checkbox" aria-label="Select all eligible visible episodes" checked={selectableEpisodes.length > 0 && selectableEpisodes.every((episode) => selectedEpisodes.includes(episode.id))} onChange={(event) => setSelectedEpisodes(event.target.checked ? [...new Set([...selectedEpisodes, ...selectableEpisodes.map((episode) => episode.id)])] : selectedEpisodes.filter((id) => !selectableEpisodes.some((episode) => episode.id === id)))} className="h-3 w-3 accent-slate-900" /></th>
                            {['Episode ID', 'Robot', 'Task', 'Recorded', 'Duration', 'Quality'].map((heading) => <th key={heading} className="px-3 py-2.5 text-[8px] font-medium uppercase tracking-wide text-slate-500">{heading}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {availableEpisodes.map((episode) => {
                            const selectable = !episode.assignment && (episode.quality === 'good' || episode.quality === 'usable');
                            const qualityTone = episode.quality === 'good' ? 'bg-emerald-50 text-emerald-700' : episode.quality === 'usable' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700';
                            return (
                                <tr key={episode.id} className="border-t border-slate-100 text-[9px] text-slate-800">
                                    <td className="px-3 py-3"><input type="checkbox" checked={selectedEpisodes.includes(episode.id)} disabled={!selectable || isAssigning} onChange={() => toggleEpisode(episode.id)} aria-label={`Select episode ${episode.episode_id}`} className="h-3 w-3 accent-slate-900 disabled:cursor-not-allowed disabled:opacity-40" /></td>
                                    <td className="whitespace-nowrap px-3 py-3 font-medium">{episode.episode_id}</td><td className="px-3 py-3">{episode.robot_id || '—'}</td><td className="px-3 py-3">{episode.task_name || '—'}</td><td className="whitespace-nowrap px-3 py-3">{episode.recorded_at ? new Date(episode.recorded_at).toLocaleString() : '—'}</td><td className="px-3 py-3">{episode.duration_seconds ? `${episode.duration_seconds}s` : '—'}</td>
                                    <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[8px] font-medium ${qualityTone}`}>{episode.quality || 'Unknown'}{episode.quality === 'bad' ? ' · not assignable' : ''}</span></td>
                                </tr>
                            );
                        })}
                        {availableEpisodes.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-[9px] text-slate-500">No episodes match this request task and filters.</td></tr>}
                    </tbody>
                </table>
            </section>
            <nav aria-label="Episode results pages" className="mt-3 flex flex-col gap-3 rounded-[10px] border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[9px] text-slate-500">Showing {firstVisibleRow}–{lastVisibleRow} of {episodesData?.total ?? 0} episodes</p>
                <div className="flex items-center justify-center gap-1">
                    <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="h-8 rounded-[6px] border border-slate-200 px-2.5 text-[9px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                    {visiblePageNumbers.map((pageNumber) => <button key={pageNumber} type="button" aria-current={currentPage === pageNumber ? 'page' : undefined} onClick={() => setCurrentPage(pageNumber)} className={`h-8 min-w-8 rounded-[6px] border px-2 text-[9px] font-medium ${currentPage === pageNumber ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{pageNumber}</button>)}
                    <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className="h-8 rounded-[6px] border border-slate-200 px-2.5 text-[9px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                </div>
            </nav>
        </div>
    );
}
