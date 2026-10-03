'use client';

import { useEffect } from 'react';
import { Check, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { RequestDetails } from './RequestDetailsModal';
import { useAcceptRequestMutation, useRejectRequestMutation } from '@/lib/redux/slices/RequestSlice';

interface DeliveryReviewModalProps {
    request: RequestDetails;
    onClose: () => void;
}

export default function DeliveryReviewModal({ request, onClose }: DeliveryReviewModalProps) {
    const [acceptRequest, { isLoading: isAccepting }] = useAcceptRequestMutation();
    const [rejectRequest, { isLoading: isRejecting }] = useRejectRequestMutation();
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

    const acceptDelivery = async () => {
        try {
            await acceptRequest(Number(request.id)).unwrap();
            toast.success('Delivery accepted.');
            onClose();
        } catch {
            toast.error('Unable to accept delivery.');
        }
    };

    const rejectDelivery = async () => {
        const reason = window.prompt('Why are you rejecting this delivery?')?.trim();
        if (!reason) return;
        try {
            await rejectRequest({ requestId: Number(request.id), reason }).unwrap();
            toast.success('Delivery rejected.');
            onClose();
        } catch {
            toast.error('Unable to reject delivery.');
        }
    };

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
                aria-labelledby="delivery-review-title"
                className="w-full max-w-[650px] overflow-hidden rounded-2xl border border-slate-200 bg-[#f6f8fb] shadow-[0_24px_80px_rgba(15,23,42,0.25)]"
            >
                <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5 sm:px-6">
                    <div>
                        <p className="text-[9px] text-slate-400">Client workspace</p>
                        <p className="text-[13px] font-semibold text-slate-900">Dataset Review</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close delivery review"
                        autoFocus
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <X size={17} />
                    </button>
                </header>

                <div className="space-y-3.5 p-4 sm:p-5">
                    <section className="flex gap-3 rounded-[14px] border border-blue-100 bg-blue-50/80 p-4 sm:gap-3.5 sm:p-5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-blue-100 bg-white text-blue-600">
                            <Check size={16} strokeWidth={1.8} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[10px] font-medium text-blue-700">Dataset Ready for Review</p>
                            <h2 id="delivery-review-title" className="mt-1 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                                Request #{request.id}
                            </h2>
                            <p className="mt-1 text-[10px] leading-4 text-slate-600">The requested dataset has been prepared and is ready for your review.</p>
                        </div>
                    </section>

                    <section className="rounded-[14px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.045)] sm:p-[18px]">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-[11px] font-semibold text-slate-900">Delivery Summary</h3>
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-medium text-emerald-700">Delivered</span>
                        </div>

                        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-0">
                            <div className="border-slate-200 sm:border-r sm:pr-4">
                                <dt className="text-[9px] text-slate-400">Episodes Requested</dt>
                                <dd className="mt-1 text-base font-semibold text-slate-900">{request.episodes}</dd>
                            </div>
                            <div className="border-slate-200 sm:border-r sm:px-4">
                                <dt className="text-[9px] text-slate-400">Episodes Delivered</dt>
                                <dd className="mt-1 text-base font-semibold text-slate-900">{request.episodesAssigned}</dd>
                            </div>
                            <div className="sm:pl-4">
                                <dt className="text-[9px] text-slate-400">Task</dt>
                                <dd className="mt-1 text-[12px] font-semibold text-slate-900">{request.task}</dd>
                            </div>
                        </dl>

                        <div className="mt-4 flex flex-col-reverse gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={rejectDelivery}
                                disabled={isRejecting || isAccepting}
                                className="h-[34px] rounded-[9px] border border-rose-200 bg-white px-3.5 text-[10px] font-medium text-rose-600 transition-colors hover:bg-rose-50"
                            >
                                Reject Delivery
                            </button>
                            <button
                                type="button"
                                onClick={acceptDelivery}
                                disabled={isRejecting || isAccepting}
                                className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[9px] bg-blue-600 px-3.5 text-[10px] font-semibold text-white transition-colors hover:bg-blue-700"
                            >
                                <CheckCircle2 size={13} />
                                Accept Delivery
                            </button>
                        </div>
                    </section>
                </div>
            </section>
        </div>
    );
}