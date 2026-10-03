'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const settingsKey = 'admin-system-settings';

interface AdminSettings {
    deadlineWindow: string;
    notesLength: string;
    strongPasswords: boolean;
    sessionTimeout: string;
}

const defaultSettings: AdminSettings = { deadlineWindow: '14', notesLength: '2000', strongPasswords: true, sessionTimeout: '30' };

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState(defaultSettings);

    useEffect(() => {
        const saved = window.localStorage.getItem(settingsKey);
        if (!saved) return;
        try {
            setSettings({ ...defaultSettings, ...JSON.parse(saved) as Partial<AdminSettings> });
        } catch {
            window.localStorage.removeItem(settingsKey);
        }
    }, []);

    const save = () => {
        window.localStorage.setItem(settingsKey, JSON.stringify(settings));
        toast.success('System settings saved.');
    };

    return (
        <div className="mx-auto min-h-[calc(100vh-54px)] max-w-[1440px] px-5 py-6 sm:px-6 lg:px-[26px]">
            <div className="mb-5"><h2 className="text-xl font-semibold text-slate-950">System Settings</h2><p className="mt-1 text-[10px] text-slate-500">Configure platform defaults and administrative preferences.</p></div>
            <div className="max-w-[615px] space-y-3.5">
                <section className="rounded-[11px] border border-slate-200 bg-white p-4 sm:px-[18px] sm:py-5">
                    <h3 className="text-[11px] font-semibold text-slate-900">Request Workflow</h3><p className="mt-1 text-[9px] text-slate-500">Workflow transitions are enforced by the backend.</p>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="text-[9px] font-medium text-slate-800">Default request deadline window<input type="number" min="1" value={settings.deadlineWindow} onChange={(event) => setSettings((current) => ({ ...current, deadlineWindow: event.target.value }))} className="mt-1.5 h-[34px] w-full rounded-[7px] border border-slate-200 px-2.5 text-[9px] outline-none focus:border-blue-500" /></label>
                        <label className="text-[9px] font-medium text-slate-800">Maximum notes length<input type="number" min="1" value={settings.notesLength} onChange={(event) => setSettings((current) => ({ ...current, notesLength: event.target.value }))} className="mt-1.5 h-[34px] w-full rounded-[7px] border border-slate-200 px-2.5 text-[9px] outline-none focus:border-blue-500" /></label>
                    </div>
                </section>
                <section className="rounded-[11px] border border-slate-200 bg-white p-4 sm:px-[18px] sm:py-5">
                    <h3 className="text-[11px] font-semibold text-slate-900">Security</h3>
                    <label className="mt-4 flex cursor-pointer items-center justify-between gap-4"><span><span className="block text-[9px] font-medium text-slate-900">Require strong passwords</span><span className="mt-0.5 block text-[8px] text-slate-500">Enforce password policy for new users.</span></span><input type="checkbox" checked={settings.strongPasswords} onChange={(event) => setSettings((current) => ({ ...current, strongPasswords: event.target.checked }))} className="h-3 w-3 accent-blue-600" /></label>
                    <label className="mt-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><span><span className="block text-[9px] font-medium text-slate-900">Session timeout</span><span className="mt-0.5 block text-[8px] text-slate-500">Automatically expire inactive sessions.</span></span><select value={settings.sessionTimeout} onChange={(event) => setSettings((current) => ({ ...current, sessionTimeout: event.target.value }))} className="h-[32px] rounded-[7px] border border-slate-200 bg-white px-2.5 text-[9px]"><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">60 minutes</option></select></label>
                </section>
                <div className="flex justify-end"><button type="button" onClick={save} className="h-[34px] rounded-[7px] bg-slate-900 px-3.5 text-[9px] font-semibold text-white hover:bg-slate-700">Save Changes</button></div>
            </div>
        </div>
    );
}