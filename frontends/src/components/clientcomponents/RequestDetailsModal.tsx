'use client';

import { useEffect } from 'react';
import { Check, X } from 'lucide-react';

export type RequestStatus = 'In Progress' | 'Delivered' | 'Accepted' | 'Rejected' | 'Submitted';

export interface RequestDetails {
    id: string;
    client?: string;
    task: string;
    episodes: number;
    episodesAssigned: number;
    deadline: string;
    status: RequestStatus;
    statusHistory: Array<{ id: number; oldStatus: string; newStatus: string; changedAt: string }>;
    createdAt: string;
    notes: string;
}

interface RequestDetailsModalProps {
    request: RequestDetails;
    onClose: () => void;
}

const statusStyles: Record<RequestStatus, string> = {
    'In Progress': 'bg-amber-50 text-amber-700 ring-amber-200',
    Delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    Accepted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    Rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
    Submitted: 'bg-blue-50 text-blue-700 ring-blue-200',
};

function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    });
}

export default function RequestDetailsModal({ request, onClose }: RequestDetailsModalProps) {
    const progress = request.episodes > 0
        ? Math.min(100, Math.round((request.episodesAssigned / request.episodes) * 100))
        : 0;
    const timeline = [...request.statusHistory]
        .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())
        .map((event) => ({
            id: event.id,
            title: event.newStatus.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
            detail: new Date(event.changedAt).toLocaleString(),
            rejected: event.newStatus === 'rejected',
        }));

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

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[3px] sm:p-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="request-details-title"
                className="max-h-[calc(100vh-24px)] w-full max-w-[940px] overflow-y-auto rounded-2xl border border-slate-200 bg-[#f6f8fb] shadow-[0_24px_80px_rgba(15,23,42,0.25)] sm:max-h-[calc(100vh-48px)]"
            >
                <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-3.5 backdrop-blur sm:px-6">
                    <div>
                        <p className="text-[9px] text-slate-400">Client workspace</p>
                        <p className="text-[13px] font-semibold text-slate-900">Request Details</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close request details"
                        autoFocus
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <X size={17} />
                    </button>
                </header>

                <div className="space-y-3.5 px-4 py-4 sm:px-6 sm:py-5">
                    <div>
                        <button type="button" onClick={onClose} className="mb-2 text-[10px] font-medium text-blue-600 hover:text-blue-700">
                            ← Back to My Requests
                        </button>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h2 id="request-details-title" className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                                Request #{request.id}
                            </h2>
                            <span className={`rounded-full px-2 py-1 text-[9px] font-medium ring-1 ring-inset ${statusStyles[request.status]}`}>
                                {request.status}
                            </span>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">Request details, fulfillment progress and status history.</p>
                    </div>

                    <section aria-label="Request information" className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
                        {[
                            { label: 'Client', value: request.client || '—' },
                            { label: 'Task', value: request.task },
                            { label: 'Episodes Requested', value: request.episodes.toString() },
                            { label: 'Episodes Assigned', value: request.episodesAssigned.toString() },
                            { label: 'Deadline', value: formatDate(request.deadline) },
                            { label: 'Created', value: request.createdAt },
                        ].map((detail) => (
                            <div key={detail.label} className="min-w-0">
                                <p className="text-[9px] text-slate-400">{detail.label}</p>
                                <p className="mt-1 truncate text-[10px] font-medium text-slate-900">{detail.value}</p>
                            </div>
                        ))}
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-[18px]">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-[11px] font-semibold text-slate-900">Dataset Fulfillment</h3>
                                <p className="mt-1 text-[10px] text-slate-500">{request.episodesAssigned} / {request.episodes} episodes assigned</p>
                            </div>
                            <span className="text-[10px] font-semibold text-blue-600">{progress}%</span>
                        </div>
                        <div
                            role="progressbar"
                            aria-label="Dataset fulfillment"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={progress}
                            className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-slate-100"
                        >
                            <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="mt-2 flex justify-between text-[8px] text-slate-400">
                            <span>0 assigned</span>
                            <span>{request.episodes} required</span>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                        <section className="min-h-[190px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-[18px]">
                            <h3 className="text-[11px] font-semibold text-slate-900">Request Notes</h3>
                            <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-[10px] leading-5 text-slate-600">
                                {request.notes || 'No additional notes were provided for this request.'}
                            </p>
                        </section>

                        <section className="min-h-[190px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-[18px]">
                            <h3 className="text-[11px] font-semibold text-slate-900">Request Timeline</h3>
                            <ol className="mt-3 space-y-3">
                                {timeline.length ? timeline.map((event, index) => (
                                    <li key={event.id} className="relative flex min-h-7 gap-2.5">
                                        {index < timeline.length - 1 && <span aria-hidden="true" className="absolute left-[6px] top-3.5 h-[calc(100%+4px)] w-px bg-slate-200" />}
                                        <span className={`relative z-[1] mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full ${event.rejected ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {event.rejected ? <X size={9} /> : <Check size={9} />}
                                        </span>
                                        <div className="min-w-0">
                                            <p className={`text-[10px] font-medium ${event.rejected ? 'text-rose-700' : 'text-slate-800'}`}>{event.title}</p>
                                            <p className="mt-0.5 text-[8px] text-slate-400">{event.detail}</p>
                                        </div>
                                    </li>
                                )) : <li className="text-[10px] text-slate-400">No status changes recorded.</li>}
                            </ol>
                        </section>
                    </div>
                </div>
            </section>
        </div>
    );
}
