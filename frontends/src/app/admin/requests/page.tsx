'use client';

import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import AdminRequestProcessingModal, { type AdminRequest, type AdminRequestStatus } from '@/components/admincomponents/AdminRequestProcessingModal';
import { useGetRequestsQuery, useUpdateRequestStatusMutation, type RequestStatus } from '@/lib/redux/slices/RequestSlice';

const statusTone: Record<AdminRequestStatus, string> = {
    Submitted: 'bg-slate-100 text-slate-700',
    Rejected: 'bg-rose-50 text-rose-700',
    'In Progress': 'bg-blue-50 text-blue-700',
    Delivered: 'bg-emerald-50 text-emerald-700',
};

export default function AdminRequestsPage() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('All statuses');
    const [deadline, setDeadline] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(null);
    const { data, isLoading, isError } = useGetRequestsQuery({ page: 1, page_size: 100 });
    const [updateStatus, { isLoading: isSavingStatus }] = useUpdateRequestStatusMutation();
    const requests: AdminRequest[] = (data?.items ?? []).map((request) => ({
        id: String(request.id),
        client: request.client.organisation || request.client.name || request.client.email,
        task: request.task_name,
        requested: request.episodes_requested,
        assigned: request.assigned_episode_count,
        status: ({ submitted: 'Submitted', accepted: 'In Progress', rejected: 'Rejected', in_progress: 'In Progress', delivered: 'Delivered' } as const)[request.status],
        deadline: String(request.deadline),
        notes: request.notes ?? '',
    }));
    const visibleRequests = useMemo(() => requests.filter((request) => `${request.id} ${request.client} ${request.task}`.toLowerCase().includes(search.trim().toLowerCase()) && (status === 'All statuses' || request.status === status) && (!deadline || request.deadline === deadline)), [requests, search, status, deadline]);

    const exportRequests = () => {
        const csv = ['ID,Client,Task,Episodes,Deadline,Status', ...visibleRequests.map((request) => `${request.id},${request.client},${request.task},${request.requested}/${request.assigned},${request.deadline},${request.status}`)].join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'dataset-requests.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    const saveStatus = async (requestId: string, nextStatus: AdminRequestStatus, _assigned: number) => {
        const backendStatus: RequestStatus = ({ Submitted: 'submitted', 'In Progress': 'in_progress', Delivered: 'delivered', Rejected: 'rejected' } as const)[nextStatus];
        try {
            await updateStatus({ requestId: Number(requestId), status: backendStatus }).unwrap();
            toast.success('Request status updated.');
            setSelectedRequest(null);
        } catch (error) {
            const detail = (error as { data?: { detail?: string } })?.data?.detail;
            toast.error(detail || 'Unable to update request status.');
        }
    };

    if (isLoading) return <div className="mx-auto max-w-[1440px] px-5 py-6 text-xs text-slate-500">Loading requests...</div>;
    if (isError) return <div className="mx-auto max-w-[1440px] px-5 py-6 text-xs text-rose-600">Unable to load requests.</div>;

    return (
        <div className="mx-auto min-h-[calc(100vh-54px)] max-w-[1440px] px-5 py-6 sm:px-6 lg:px-[26px]">
            <div className="mb-5 flex items-end justify-between gap-3"><div><h2 className="text-xl font-semibold tracking-tight text-slate-950">Requests</h2><p className="mt-1 text-[10px] text-slate-500">Manage all client dataset requests and workflow status.</p></div><button type="button" onClick={exportRequests} className="inline-flex h-8 items-center gap-1.5 rounded-[7px] border border-slate-200 bg-white px-3 text-[9px] font-medium text-slate-700 hover:bg-slate-50"><Download size={12} /> Export</button></div>
            <section className="mb-3 flex flex-col gap-2.5 rounded-[10px] border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
                <label className="flex h-[34px] min-w-0 flex-1 items-center gap-2 rounded-[8px] border border-slate-200 px-2.5 focus-within:border-blue-500"><Search size={13} className="text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search request, client, or task..." aria-label="Search requests" className="min-w-0 flex-1 border-0 bg-transparent text-[9px] outline-none placeholder:text-slate-400" /></label>
                <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter request status" className="h-[34px] rounded-[8px] border border-slate-200 bg-white px-2.5 text-[9px] text-slate-700"><option>All statuses</option><option>Submitted</option><option>In Progress</option><option>Delivered</option><option>Rejected</option></select>
                <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} aria-label="Filter deadline" className="h-[34px] rounded-[8px] border border-slate-200 bg-white px-2.5 text-[9px] text-slate-700" />
            </section>
            <section className="overflow-x-auto rounded-[11px] border border-slate-200 bg-white shadow-[0_2px_5px_rgba(15,23,42,0.025)]">
                <table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50"><tr>{['ID', 'Client', 'Task', 'Episodes', 'Deadline', 'Status', 'Action'].map((label) => <th key={label} className="px-4 py-3 text-[8px] font-medium uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead>
                    <tbody>{visibleRequests.map((request) => <tr key={request.id} className="border-t border-slate-100 text-[9px] text-slate-700"><td className="px-4 py-3.5 font-semibold text-slate-900">{request.id}</td><td className="px-4 py-3.5">{request.client}</td><td className="px-4 py-3.5">{request.task}</td><td className="px-4 py-3.5">{request.requested} / {request.assigned}</td><td className="whitespace-nowrap px-4 py-3.5">{new Date(`${request.deadline}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td><td className="px-4 py-3.5"><span className={`rounded-full px-2 py-1 text-[8px] font-medium ${statusTone[request.status]}`}>{request.status}</span></td><td className="px-4 py-3.5 text-right"><button type="button" onClick={() => setSelectedRequest(request)} className="font-medium text-slate-900 hover:text-blue-600">Manage</button></td></tr>)}
                        {visibleRequests.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-[9px] text-slate-500">No requests match these filters.</td></tr>}</tbody>
                </table>
            </section>
            {selectedRequest && <AdminRequestProcessingModal request={selectedRequest} onClose={() => setSelectedRequest(null)} onSave={saveStatus} isSaving={isSavingStatus} />}
        </div>
    );
}
