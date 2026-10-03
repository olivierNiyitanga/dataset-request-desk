'use client';

import { useEffect, useRef } from 'react';
import { LogOut, X } from 'lucide-react';

interface LogoutConfirmDialogProps {
    open: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export default function LogoutConfirmDialog({ open, onCancel, onConfirm }: LogoutConfirmDialogProps) {
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;

        cancelButtonRef.current?.focus();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
            <section role="alertdialog" aria-modal="true" aria-labelledby="logout-dialog-title" aria-describedby="logout-dialog-description" className="w-full max-w-[400px] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
                <div className="flex items-start gap-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                        <LogOut size={18} />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                        <h2 id="logout-dialog-title" className="text-sm font-semibold text-slate-950">Confirm logout</h2>
                        <p id="logout-dialog-description" className="mt-1.5 text-xs leading-5 text-slate-500">Are you sure you want to log out of your account?</p>
                    </div>
                    <button type="button" aria-label="Close logout confirmation" onClick={onCancel} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                        <X size={16} />
                    </button>
                </div>
                <div className="mt-6 flex justify-end gap-2.5">
                    <button ref={cancelButtonRef} type="button" onClick={onCancel} className="h-9 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm} className="h-9 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                        Log out
                    </button>
                </div>
            </section>
        </div>
    );
}
