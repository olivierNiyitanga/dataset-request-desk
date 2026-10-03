'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useGetEpisodesQuery } from '@/lib/redux/slices/EpisodeSlice';
import { useAssignEpisodesMutation } from '@/lib/redux/slices/AssignmentSlice';

export type AdminRequestStatus = 'Submitted' | 'In Progress' | 'Delivered' | 'Rejected';
type AdminWorkflowStatus = Exclude<AdminRequestStatus, 'Rejected'>;

export interface AdminRequest {
    id: string;
    client: string;
    task: string;
    requested: number;
    assigned: number;
    status: AdminRequestStatus;
    deadline: string;
    notes: string;
}

interface AdminRequestProcessingModalProps {
    request: AdminRequest;
    onClose: () => void;
    onSave: (requestId: string, status: AdminWorkflowStatus, assigned: number) => void;
    isSaving: boolean;
}

function formatDeadline(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AdminRequestProcessingModal({ request, onClose, onSave, isSaving }: AdminRequestProcessingModalProps) {
    const [status, setStatus] = useState<AdminWorkflowStatus>(request.status === 'Rejected' ? 'In Progress' : request.status);
    const [assigned, setAssigned] = useState(request.assigned);
    const [selectedEpisodes, setSelectedEpisodes] = useState<number[]>([]);
    const { data: episodeData } = useGetEpisodesQuery({ page: 1, page_size: 100, task_name: request.task });
    const [assignEpisodes, { isLoading: isAssigning }] = useAssignEpisodesMutation();
    const eligibleEpisodes = (episodeData?.items ?? []).filter((episode) => !episode.assignment && (episode.quality === 'good' || episode.quality === 'usable'));
    const progress = request.requested > 0 ? Math.min(100, Math.round((assigned / request.requested) * 100)) : 0;

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const toggleEpisode = (episodeId: number) => setSelectedEpisodes((current) => current.includes(episodeId) ? current.filter((id) => id !== episodeId) : [...current, episodeId]);
    const assignSelected = async () => {
        if (!selectedEpisodes.length) return;
        try {
            await assignEpisodes({ requestId: Number(request.id), episode_ids: selectedEpisodes }).unwrap();
            setAssigned((current) => Math.min(request.requested, current + selectedEpisodes.length));
            if (status === 'Submitted') setStatus('In Progress');
            setSelectedEpisodes([]);
            toast.success('Episodes assigned successfully.');
        } catch {
            toast.error('Unable to assign the selected episodes.');
        }
    };
    const save = (nextStatus = status) => onSave(request.id, nextStatus, assigned);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[3px] sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="admin-request-title" className="max-h-[calc(100vh-16px)] w-full max-w-[768px] overflow-y-auto rounded-[15px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.25)] sm:max-h-[calc(100vh-32px)]">
                <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3.5 sm:px-5">
                    <div><h2 id="admin-request-title" className="text-[16px] font-semibold text-slate-950">{request.id} · {request.task}</h2><p className="mt-1 text-[11px] text-slate-500">{request.client} · {request.requested} episodes requested</p></div>
                    <button type="button" onClick={onClose} aria-label="Close request" autoFocus className="grid h-8 w-8 place-items-center rounded-[8px] text-slate-500 hover:bg-slate-50"><X size={15} /></button>
                </header>

                <div className="space-y-3.5 p-4 sm:p-5">
                    <section aria-label="Request summary" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        {[
                            { label: 'Status', value: status },
                            { label: 'Assigned', value: `${assigned} / ${request.requested}` },
                            { label: 'Deadline', value: formatDeadline(request.deadline) },
                            { label: 'Client', value: request.client },
                        ].map((item) => <div key={item.label} className="min-w-0 rounded-[9px] bg-slate-50 px-3 py-3.5"><p className="text-[11px] text-slate-500">{item.label}</p>{item.label === 'Status' ? <span className={`mt-1.5 inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' : status === 'Submitted' ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700'}`}>{item.value}</span> : <p className="mt-2 truncate text-[13px] font-semibold text-slate-900">{item.value}</p>}</div>)}
                    </section>

                    <section aria-label="Workflow status" className="flex flex-col justify-between gap-3 rounded-[11px] border border-slate-200 p-4 sm:flex-row sm:items-center sm:p-[18px]">
                        <div><h3 className="text-[12px] font-semibold text-slate-900">Workflow Status</h3><p className="mt-1 text-[11px] text-slate-500">Choose the next valid status, then save it.</p></div>
                        <select aria-label="Workflow status" value={status} disabled={isSaving || request.status === 'Delivered'} onChange={(event) => setStatus(event.target.value as AdminWorkflowStatus)} className="h-[36px] rounded-[8px] border border-slate-200 bg-white px-3 text-[11px] text-slate-800 disabled:bg-slate-100">
                            <option disabled={request.status !== 'Submitted'}>Submitted</option>
                            <option>In Progress</option>
                            <option disabled={request.status !== 'In Progress'}>Delivered</option>
                        </select>
                    </section>

                    <section aria-label="Dataset fulfillment"><div className="flex items-center justify-between text-[12px]"><h3 className="font-semibold text-slate-900">Dataset Fulfillment</h3><span>{progress}%</span></div><div role="progressbar" aria-label="Episode fulfillment" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-800 transition-[width]" style={{ width: `${progress}%` }} /></div></section>

                    <section className="rounded-[11px] border border-slate-200 p-4 sm:p-[16px]">
                        <div className="flex items-start justify-between gap-3"><div><h3 className="text-[14px] font-medium text-slate-900">Assign Episodes</h3><p className="mt-1 text-[11px] text-slate-500">Only good/usable unassigned episodes can be selected.</p></div><button type="button" disabled={!selectedEpisodes.length || status === 'Delivered' || isAssigning} onClick={assignSelected} className="h-[36px] shrink-0 rounded-[8px] bg-slate-900 px-3.5 text-[11px] font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300">{isAssigning ? 'Assigning...' : 'Assign selected'}</button></div>
                        <div className="mt-3 space-y-2">{eligibleEpisodes.map((episode) => <label key={episode.id} className="flex min-h-[49px] cursor-pointer items-center gap-2.5 rounded-[8px] border border-slate-200 px-3"><input type="checkbox" checked={selectedEpisodes.includes(episode.id)} disabled={status === 'Delivered'} onChange={() => toggleEpisode(episode.id)} className="h-3.5 w-3.5 accent-blue-600" /><span className="font-mono text-[10px] text-slate-800">{episode.episode_id}</span><span className="flex-1 text-[12px] text-slate-900">{request.task}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${episode.quality === 'good' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{episode.quality}</span></label>)}</div>
                    </section>

                    <section className="rounded-[11px] border border-slate-200 p-4 sm:p-[18px]"><h3 className="text-[14px] font-semibold text-slate-900">Request Notes</h3><p className="mt-2.5 text-[12px] leading-6 text-slate-600">{request.notes || 'No additional notes were provided for this request.'}</p></section>
                </div>

                <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:justify-end sm:px-5"><button type="button" disabled={isSaving || status === request.status || request.status === 'Delivered'} onClick={() => save()} className="h-[40px] rounded-[8px] border border-slate-200 px-4 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Status'}</button><button type="button" disabled={isSaving || request.status !== 'In Progress'} onClick={() => save('Delivered')} className="h-[40px] rounded-[8px] bg-slate-900 px-4 text-[11px] font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300">Mark Delivered</button></footer>
            </section>
        </div>
    );
}
