'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Plus, Search } from 'lucide-react';
import RequestDetailsModal, { type RequestDetails, type RequestStatus } from '@/components/clientcomponents/RequestDetailsModal';
import DeliveryReviewModal from '@/components/clientcomponents/DeliveryReviewModal';
import { useGetRequestsQuery } from '@/lib/redux/slices/RequestSlice';

const statusLabels: Record<string, RequestStatus> = {
    submitted: 'Submitted',
    accepted: 'Accepted',
    rejected: 'Rejected',
    in_progress: 'In Progress',
    delivered: 'Delivered',
};

const statusStyles: Record<RequestStatus, string> = {
    'In Progress': 'bg-amber-50 text-amber-700',
    Delivered: 'bg-emerald-50 text-emerald-700',
    Accepted: 'bg-emerald-50 text-emerald-700',
    Rejected: 'bg-rose-50 text-rose-700',
    Submitted: 'bg-blue-50 text-blue-700',
};

const pageSize = 5;

export default function ClientRequestsPage() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('All statuses');
    const [deadline, setDeadline] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRequest, setSelectedRequest] = useState<RequestDetails | null>(null);
    const { data, isLoading, isError } = useGetRequestsQuery({ page: 1, page_size: 100 });
    const requests = useMemo<RequestDetails[]>(() => (data?.items ?? []).map((request) => ({
        id: String(request.id),
        client: request.client.organisation || request.client.name || request.client.email,
        task: request.task_name,
        episodes: request.episodes_requested,
        episodesAssigned: request.assigned_episode_count,
        deadline: String(request.deadline),
        status: statusLabels[request.status],
        statusHistory: request.status_history.map((event) => ({
            id: event.id,
            oldStatus: event.old_status,
            newStatus: event.new_status,
            changedAt: event.changed_at,
        })),
        createdAt: new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        notes: request.notes ?? '',
    })), [data]);

    const filteredRequests = useMemo(() => requests.filter((request) => {
        const matchesSearch = `${request.id} ${request.task}`.toLowerCase().includes(search.trim().toLowerCase());
        const matchesStatus = status === 'All statuses' || request.status === status;
        const matchesDeadline = !deadline || request.deadline === deadline;
        return matchesSearch && matchesStatus && matchesDeadline;
    }), [search, status, deadline]);

    const totalPages = Math.ceil(filteredRequests.length / pageSize);
    const visibleRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const firstVisible = filteredRequests.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const lastVisible = Math.min(currentPage * pageSize, filteredRequests.length);

    const changeFilter = (update: () => void) => {
        update();
        setCurrentPage(1);
    };

    if (isLoading) return <div className="mx-auto max-w-[1280px] px-5 py-7 text-xs text-slate-500">Loading requests...</div>;
    if (isError) return <div className="mx-auto max-w-[1280px] px-5 py-7 text-xs text-rose-600">Unable to load requests.</div>;

    return (
        <div className="mx-auto min-h-[calc(100vh-64px)] max-w-[1280px] px-5 py-7 sm:px-8 lg:px-10">
            <section className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-1.5 text-[10px] font-semibold text-blue-600">Workspace</p>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-[22px]">My Requests</h2>
                    <p className="mt-1 text-xs text-slate-500">View and track all dataset requests submitted by your organization.</p>
                </div>
                <Link href="/client/requests/new" className="inline-flex h-9 w-fit items-center gap-2 rounded-[9px] bg-blue-600 px-3.5 text-[11px] font-semibold text-white no-underline shadow-sm transition-colors hover:bg-blue-700">
                    <Plus size={14} strokeWidth={2.5} />
                    Create Request
                </Link>
            </section>

            <section className="overflow-hidden rounded-[14px] border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.035)]">
                <div className="flex flex-col gap-2.5 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
                    <label className="flex h-[34px] min-w-0 flex-1 items-center gap-2 rounded-[9px] border border-slate-200 px-2.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10">
                        <Search size={13} className="shrink-0 text-slate-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => changeFilter(() => setSearch(event.target.value))}
                            placeholder="Search by task name..."
                            aria-label="Search by task name or request ID"
                            className="h-full min-w-0 flex-1 border-0 bg-transparent text-[10px] text-slate-800 outline-none placeholder:text-slate-400"
                        />
                    </label>
                    <select
                        value={status}
                        onChange={(event) => changeFilter(() => setStatus(event.target.value))}
                        aria-label="Filter by status"
                        className="h-[34px] rounded-[9px] border border-slate-200 bg-white px-3 text-[10px] text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    >
                        <option>All statuses</option>
                        <option>Submitted</option>
                        <option>In Progress</option>
                        <option>Delivered</option>
                        <option>Accepted</option>
                        <option>Rejected</option>
                    </select>
                    <input
                        type="date"
                        value={deadline}
                        onChange={(event) => changeFilter(() => setDeadline(event.target.value))}
                        aria-label="Filter by deadline"
                        className="h-[34px] rounded-[9px] border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] border-collapse text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                {['Request ID', 'Task name', 'Episodes', 'Deadline', 'Status', 'Created at', 'Action'].map((heading) => (
                                    <th key={heading} className="px-5 py-3 text-[8px] font-medium uppercase tracking-[0.08em] text-slate-400">{heading}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRequests.length > 0 ? visibleRequests.map((request) => (
                                <tr key={request.id} className="border-t border-slate-100 text-[10px] text-slate-700 transition-colors hover:bg-slate-50/70">
                                    <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-900">{request.id}</td>
                                    <td className="whitespace-nowrap px-5 py-3.5">{request.task}</td>
                                    <td className="px-5 py-3.5">{request.episodes}</td>
                                    <td className="whitespace-nowrap px-5 py-3.5">{new Date(`${request.deadline}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                                    <td className="px-5 py-3.5">
                                        <span className={`inline-flex rounded-full px-2 py-1 text-[8px] font-medium ${statusStyles[request.status]}`}>{request.status}</span>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">{request.createdAt}</td>
                                    <td className="px-5 py-3.5 text-right">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRequest(request)}
                                            className="font-medium text-blue-600 hover:text-blue-700"
                                        >
                                            {request.status === 'Delivered' ? 'Review' : 'View'}
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-xs text-slate-500">No requests match these filters.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[9px] text-slate-500">Showing {firstVisible}–{lastVisible} of {filteredRequests.length} requests</p>
                    <nav aria-label="Request pages" className="flex items-center justify-end gap-1">
                        <button
                            type="button"
                            aria-label="Previous page"
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                            className="grid h-7 w-7 place-items-center rounded-[7px] border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ArrowLeft size={11} />
                        </button>
                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                            <button
                                key={page}
                                type="button"
                                aria-label={`Page ${page}`}
                                aria-current={currentPage === page ? 'page' : undefined}
                                onClick={() => setCurrentPage(page)}
                                className={`grid h-7 w-7 place-items-center rounded-[7px] border text-[10px] ${currentPage === page ? 'border-blue-600 bg-blue-600 font-semibold text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            type="button"
                            aria-label="Next page"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                            className="grid h-7 w-7 place-items-center rounded-[7px] border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ArrowRight size={11} />
                        </button>
                    </nav>
                </div>
            </section>
            {selectedRequest?.status === 'Delivered' && <DeliveryReviewModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />}
            {selectedRequest && selectedRequest.status !== 'Delivered' && <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />}
        </div>
    );
}
