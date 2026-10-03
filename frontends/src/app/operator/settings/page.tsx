'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const settingsKey = 'operator-workspace-settings';

export default function OperatorSettingsPage() {
    const [preferences, setPreferences] = useState({ newRequests: true, rejectedDeliveries: true, importCompletion: true, requestsPerPage: '25' });

    useEffect(() => {
        const savedSettings = window.localStorage.getItem(settingsKey);
        if (!savedSettings) return;
        try {
            const parsed = JSON.parse(savedSettings) as Partial<typeof preferences>;
            const loaded = { ...preferences, ...parsed };
            setPreferences(loaded);
        } catch {
            window.localStorage.removeItem(settingsKey);
        }
    }, []);

    const saveSettings = () => {
        window.localStorage.setItem(settingsKey, JSON.stringify(preferences));
        toast.success('Settings saved.');
    };

    return (
        <div className="min-h-[calc(100vh-54px)] px-5 py-6 sm:px-6 lg:px-[26px]">
            <div className="mb-5">
                <h2 className="text-xl font-semibold text-slate-950">Settings</h2>
                <p className="mt-1 text-[10px] text-slate-500">Personal preferences for the operations workspace.</p>
            </div>
            <div className="max-w-[616px] space-y-3.5">
                <section className="rounded-[11px] border border-slate-200 bg-white p-4 sm:px-[18px] sm:py-5">
                    <h3 className="text-[11px] font-semibold text-slate-900">Notifications</h3>
                    <div className="mt-3.5 space-y-3.5">
                        {[
                            { key: 'newRequests' as const, title: 'New requests', description: 'Notify when a client submits a request.' },
                            { key: 'rejectedDeliveries' as const, title: 'Rejected deliveries', description: 'Notify when a client requests rework.' },
                            { key: 'importCompletion' as const, title: 'Import completion', description: 'Notify when CSV processing finishes.' },
                        ].map((item) => (
                            <label key={item.key} className="flex cursor-pointer items-center justify-between gap-4">
                                <span><span className="block text-[10px] font-semibold text-slate-900">{item.title}</span><span className="mt-0.5 block text-[9px] text-slate-500">{item.description}</span></span>
                                <input type="checkbox" checked={preferences[item.key]} onChange={(event) => setPreferences((current) => ({ ...current, [item.key]: event.target.checked }))} className="h-3 w-3 shrink-0 accent-blue-600" />
                            </label>
                        ))}
                    </div>
                </section>

                <section className="rounded-[11px] border border-slate-200 bg-white p-4 sm:px-[18px] sm:py-5">
                    <h3 className="text-[11px] font-semibold text-slate-900">Display</h3>
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                        <label htmlFor="requests-per-page" className="text-[10px] font-medium text-slate-900">Requests per page</label>
                        <select id="requests-per-page" value={preferences.requestsPerPage} onChange={(event) => setPreferences((current) => ({ ...current, requestsPerPage: event.target.value }))} className="h-[34px] rounded-[8px] border border-slate-200 bg-white px-3 text-[10px] text-slate-800 outline-none focus:border-blue-500">
                            <option value="25">25</option><option value="50">50</option><option value="100">100</option>
                        </select>
                    </div>
                </section>

                <div className="flex justify-end">
                    <button type="button" onClick={saveSettings} className="h-[34px] rounded-[8px] bg-slate-900 px-3.5 text-[9px] font-semibold text-white transition-colors hover:bg-slate-700">Save Changes</button>
                </div>
            </div>
        </div>
    );
}