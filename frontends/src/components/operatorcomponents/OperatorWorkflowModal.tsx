'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Clock3, X } from 'lucide-react';

export type OperatorRequestStatus = 'Submitted' | 'In Progress' | 'Delivered' | 'Rejected';
type WorkflowStatus = Exclude<OperatorRequestStatus, 'Rejected'>;

export interface OperatorRequest {
    id: string;
    client: string;
    task: string;
    requested: number;
    assigned: number;
    status: OperatorRequestStatus;
    deadline: string;
    notes: string;
}

interface OperatorWorkflowModalProps {
    request: OperatorRequest;
    onClose: () => void;
    onSave: (requestId: string, status: WorkflowStatus) => void;
    isSaving: boolean;
}

const workflow = ['Submitted', 'In Progress', 'Delivered'] as const;

function formatDeadline(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

export default function OperatorWorkflowModal({ request, onClose, onSave, isSaving }: OperatorWorkflowModalProps) {
    const [status, setStatus] = useState<WorkflowStatus>(request.status === 'Rejected' ? 'In Progress' : request.status);
    const progress = request.requested > 0 ? Math.min(100, Math.round((request.assigned / request.requested) * 100)) : 0;
    const activeStep = workflow.indexOf(status);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[3px] sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="operator-request-title" className="max-h-[calc(100vh-24px)] w-full max-w-[900px] overflow-y-auto rounded-2xl border border-slate-200 bg-[#f6f8fb] shadow-[0_24px_80px_rgba(15,23,42,0.25)] sm:max-h-[calc(100vh-48px)]">
                <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-3.5 backdrop-blur sm:px-6"><div><p className="text-[9px] text-slate-400">Client workspace</p><h2 id="operator-request-title" className="text-[13px] font-semibold text-slate-900">Request Details</h2></div><button type="button" onClick={onClose} aria-label="Close request" autoFocus className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={17} /></button></header>
                <div className="space-y-3.5 px-4 py-4 sm:px-6 sm:py-5">
                    <div><button type="button" onClick={onClose} className="mb-2 text-[10px] font-medium text-blue-600 hover:text-blue-700">← Back to Requests</button><div className="flex flex-wrap items-center gap-2.5"><h3 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">Request #{request.id}</h3><span className={`rounded-full px-2 py-1 text-[9px] font-medium ${status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' : status === 'Submitted' ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700'}`}>{status}</span></div><p className="mt-1 text-[10px] text-slate-500">Request details, fulfillment progress and status history.</p></div>
                    <section aria-label="Request information" className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-6">{[{ label: 'Client', value: request.client }, { label: 'Task', value: request.task }, { label: 'Episodes Requested', value: String(request.requested) }, { label: 'Episodes Assigned', value: String(request.assigned) }, { label: 'Deadline', value: formatDeadline(request.deadline) }, { label: 'Created', value: 'Today' }].map((item) => <div key={item.label} className="min-w-0"><p className="text-[9px] text-slate-400">{item.label}</p><p className="mt-1 truncate text-[10px] font-medium text-slate-900">{item.value}</p></div>)}</section>
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-[18px]"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h4 className="text-[11px] font-semibold text-slate-900">Workflow Status</h4><p className="mt-1 text-[10px] text-slate-500">Operators control operational transitions.</p></div><select value={status} disabled={isSaving || request.status === 'Delivered'} onChange={(event) => setStatus(event.target.value as WorkflowStatus)} aria-label="Workflow status" className="h-[35px] rounded-[8px] border border-slate-200 bg-white px-3 text-[10px] text-slate-800 disabled:bg-slate-100"><option disabled={request.status !== 'Submitted'}>Submitted</option><option>In Progress</option><option disabled={request.status !== 'In Progress'}>Delivered</option></select></div><ol className="mt-3.5 flex flex-wrap items-center gap-2">{workflow.map((step, index) => { const complete = index < activeStep; const current = index === activeStep; const tone = current && step === 'Delivered' ? 'bg-emerald-50 text-emerald-700' : current ? 'bg-blue-50 text-blue-700' : complete ? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-400'; return <li key={step} className="flex items-center gap-2"><span className={`inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[9px] font-medium ${tone}`}>{complete && <Check size={10} />}{step}</span>{index < workflow.length - 1 && <span aria-hidden="true" className="text-[10px]">→</span>}</li>; })}</ol></section>
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-[18px]"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h4 className="text-[11px] font-semibold text-slate-900">Dataset Fulfillment</h4><p className="mt-1 text-[10px] text-slate-500">{request.assigned} / {request.requested} episodes assigned</p></div><Link href={`/operator/episode-assignment?requestId=${request.id}`} onClick={onClose} className="inline-flex h-[35px] items-center justify-center rounded-[8px] border border-slate-200 px-3 text-[9px] font-medium text-slate-700 no-underline hover:bg-slate-50">Assign Episodes</Link></div><div role="progressbar" aria-label="Dataset fulfillment" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-800" style={{ width: `${progress}%` }} /></div></section>
                    <section className="min-h-[140px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-[18px]"><h4 className="text-[11px] font-semibold text-slate-900">Request Notes</h4><p className="mt-3 rounded-lg bg-slate-50 p-3 text-[10px] leading-5 text-slate-600">{request.notes || 'No additional notes were provided for this request.'}</p></section>
                </div>
                <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:justify-end sm:px-5"><button type="button" disabled={isSaving || status === request.status || request.status === 'Delivered'} onClick={() => onSave(request.id, status)} className="h-[36px] rounded-[8px] border border-slate-200 px-3.5 text-[9px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Status'}</button><button type="button" disabled={isSaving || request.status !== 'In Progress'} onClick={() => onSave(request.id, 'Delivered')} className="h-[36px] rounded-[8px] bg-slate-900 px-3.5 text-[9px] font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300">Mark Delivered</button></footer>
            </section>
        </div>
    );
}
