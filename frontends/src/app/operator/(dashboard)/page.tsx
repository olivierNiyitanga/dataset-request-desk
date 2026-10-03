'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { ArrowRight, Boxes, Check, ClipboardList, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import OperatorWorkflowModal, { type OperatorRequest, type OperatorRequestStatus } from '@/components/operatorcomponents/OperatorWorkflowModal';

type AttentionRequest = OperatorRequest & { organization: string; detail: string };

import { useGetRequestsQuery, useUpdateRequestStatusMutation, type RequestStatus } from '@/lib/redux/slices/RequestSlice';
import { useGetEpisodesQuery } from '@/lib/redux/slices/EpisodeSlice';

export default function OperatorDashboardPage() {
    const { data: session } = useSession();
    const firstName = session?.user?.name?.trim().split(/\s+/)[0] || 'Sam';
    const [selectedRequest, setSelectedRequest] = useState<AttentionRequest | null>(null);
    const { data: requestData, isLoading: requestsLoading } = useGetRequestsQuery({ page: 1, page_size: 100 });
    const { data: episodeData, isLoading: episodesLoading } = useGetEpisodesQuery({ page: 1, page_size: 100 });
    const [updateStatus, { isLoading: isSavingStatus }] = useUpdateRequestStatusMutation();
    const attentionRequests: AttentionRequest[] = (requestData?.items ?? []).filter((request) => ['submitted', 'rejected', 'in_progress'].includes(request.status)).slice(0, 5).map((request) => ({
        id: String(request.id),
        status: ({ submitted: 'Submitted', rejected: 'Rejected', in_progress: 'In Progress', accepted: 'In Progress', delivered: 'Delivered' } as const)[request.status],
        client: request.client.name || request.client.email,
        organization: request.client.organisation || request.client.name || request.client.email,
        task: request.task_name,
        requested: request.episodes_requested,
        assigned: request.assigned_episode_count,
        deadline: String(request.deadline),
        notes: request.notes ?? '',
        detail: request.status === 'rejected' ? 'Customer requested rework' : `${request.assigned_episode_count} / ${request.episodes_requested} episodes assigned`,
    }));
    const metrics = [
        { label: 'Submitted', value: requestData?.items.filter((request) => request.status === 'submitted').length ?? 0, detail: 'Waiting to be started' },
        { label: 'In Progress', value: requestData?.items.filter((request) => request.status === 'in_progress' || request.status === 'accepted').length ?? 0, detail: 'Currently being fulfilled' },
        { label: 'Ready to Deliver', value: requestData?.items.filter((request) => request.assigned_episode_count >= request.episodes_requested).length ?? 0, detail: 'Fully assigned datasets' },
        { label: 'Available Episodes', value: episodeData?.items.filter((episode) => !episode.assignment).length ?? 0, detail: 'Current page inventory' },
    ];
    const inventory = ['good', 'usable', 'bad'].map((quality) => ({ label: quality[0].toUpperCase() + quality.slice(1), value: episodeData?.items.filter((episode) => episode.quality === quality).length ?? 0, width: `${((episodeData?.items.filter((episode) => episode.quality === quality).length ?? 0) / Math.max(episodeData?.items.length ?? 1, 1)) * 100}%`, color: quality === 'good' ? 'bg-emerald-500' : quality === 'usable' ? 'bg-amber-400' : 'bg-rose-400' }));

    const saveRequestStatus = async (requestId: string, status: OperatorRequestStatus) => {
        const backendStatus: RequestStatus = ({ Submitted: 'submitted', 'In Progress': 'in_progress', Delivered: 'delivered' } as const)[status as Exclude<OperatorRequestStatus, 'Rejected'>];
        try {
            await updateStatus({ requestId: Number(requestId), status: backendStatus }).unwrap();
            toast.success('Request status updated.');
            setSelectedRequest(null);
        } catch (error) {
            const detail = (error as { data?: { detail?: string } })?.data?.detail;
            toast.error(detail || 'Unable to update request status.');
        }
    };

    if (requestsLoading || episodesLoading) return <div className="mx-auto max-w-[1440px] px-5 py-6 text-xs text-slate-500">Loading dashboard...</div>;

    return (
        <div className="mx-auto min-h-[calc(100vh-54px)] max-w-[1440px] px-5 py-6 sm:px-6 lg:px-[26px]">
            <section className="mb-5">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">Good morning, {firstName}</h2>
                <p className="mt-1 text-[10px] text-slate-500">Here is what needs your attention today.</p>
            </section>

            <section aria-label="Operations summary" className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                    <article key={metric.label} className="min-h-[106px] rounded-[11px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_2px_5px_rgba(15,23,42,0.025)]">
                        <p className="text-[9px] text-slate-500">{metric.label}</p>
                        <p className="mt-3 text-xl font-semibold leading-6 text-slate-950">{metric.value}</p>
                        <p className="mt-1 text-[9px] text-slate-500">{metric.detail}</p>
                    </article>
                ))}
            </section>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                <section className="overflow-hidden rounded-[11px] border border-slate-200 bg-white shadow-[0_2px_5px_rgba(15,23,42,0.025)]">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
                        <div>
                            <h3 className="text-[12px] font-semibold text-slate-950">Requests Requiring Attention</h3>
                            <p className="mt-1 text-[9px] text-slate-500">Prioritize submitted and rework requests</p>
                        </div>
                        <Link href="/operator/requests" className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-slate-900 no-underline hover:text-blue-600">
                            View all <ArrowRight size={12} />
                        </Link>
                    </div>

                    <div className="px-4 sm:px-5">
                        {attentionRequests.map((request) => (
                            <article key={request.id} className="flex min-h-[65px] items-center gap-3 border-b border-slate-100 py-2.5 last:border-b-0">
                                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-[8px] ${request.status === 'Rejected' ? 'bg-rose-50 text-rose-600' : request.status === 'In Progress' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-700'}`}>
                                    {request.status === 'Rejected' ? <RotateCcw size={13} strokeWidth={1.8} /> : request.status === 'In Progress' ? <Check size={13} strokeWidth={1.8} /> : <ClipboardList size={13} strokeWidth={1.8} />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[10px] font-semibold text-slate-900">{request.id}</span>
                                        <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-medium ${request.status === 'Submitted' ? 'bg-slate-100 text-slate-600' : request.status === 'Rejected' ? 'bg-rose-50 text-rose-600' : request.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-600'}`}>
                                            {request.status}
                                        </span>
                                    </div>
                                    <p className="mt-1 truncate text-[9px] text-slate-500">{request.organization} · {request.detail}</p>
                                </div>
                                <button type="button" onClick={() => setSelectedRequest(request)} className={`inline-flex h-7 shrink-0 items-center justify-center rounded-[7px] px-3 text-[9px] font-medium transition-colors ${request.status === 'Submitted' ? 'bg-slate-900 text-white hover:bg-slate-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                                    {request.status === 'Submitted' ? 'Start' : request.status === 'Rejected' ? 'Review' : request.status === 'In Progress' ? 'Continue' : 'View'}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="rounded-[11px] border border-slate-200 bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.025)] sm:p-4">
                    <div className="flex items-center gap-2">
                        <Boxes size={15} className="text-slate-500" />
                        <div>
                            <h3 className="text-[12px] font-semibold text-slate-950">Episode Inventory</h3>
                            <p className="mt-1 text-[9px] text-slate-500">Available assignment pool</p>
                        </div>
                    </div>

                    <div className="mt-5 space-y-4">
                        {inventory.map((item) => (
                            <div key={item.label}>
                                <div className="mb-1 flex items-center justify-between text-[9px]">
                                    <span className="text-slate-600">{item.label}</span>
                                    <span className="font-semibold text-slate-900">{item.value}</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                    <div className={`h-full rounded-full ${item.color}`} style={{ width: item.width }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <Link href="/operator/import-episodes" className="mt-5 flex h-8 w-full items-center justify-center rounded-[7px] border border-slate-200 text-[9px] font-medium text-slate-700 no-underline transition-colors hover:bg-slate-50">
                        Browse Episodes
                    </Link>
                </section>
            </div>
            {selectedRequest && <OperatorWorkflowModal request={selectedRequest} onClose={() => setSelectedRequest(null)} onSave={saveRequestStatus} isSaving={isSavingStatus} />}
        </div>
    );
}
