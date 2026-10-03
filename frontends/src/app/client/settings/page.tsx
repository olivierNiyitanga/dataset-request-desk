'use client';

import { useEffect, useState } from 'react';

const preferencesKey = 'client-workspace-preferences';

interface ClientPreferences {
    deliveryNotifications: boolean;
    statusNotifications: boolean;
    theme: 'Light' | 'Dark' | 'System';
}

const defaultPreferences: ClientPreferences = {
    deliveryNotifications: true,
    statusNotifications: true,
    theme: 'Light',
};

export default function ClientSettingsPage() {
    const [preferences, setPreferences] = useState(defaultPreferences);

    useEffect(() => {
        const stored = window.localStorage.getItem(preferencesKey);
        if (stored) {
            try {
                setPreferences({ ...defaultPreferences, ...JSON.parse(stored) as Partial<ClientPreferences> });
            } catch {
                window.localStorage.removeItem(preferencesKey);
            }
        }
    }, []);

    const updatePreference = <K extends keyof ClientPreferences>(key: K, value: ClientPreferences[K]) => {
        setPreferences((current) => {
            const updated = { ...current, [key]: value };
            window.localStorage.setItem(preferencesKey, JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <div className="mx-auto min-h-[calc(100vh-64px)] max-w-[1034px] px-5 py-7 sm:px-8 lg:px-10">
            <div className="mb-5">
                <p className="mb-1.5 text-[10px] font-semibold text-blue-600">Account</p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-[22px]">Settings</h2>
                <p className="mt-1 text-xs text-slate-500">Manage your workspace preferences.</p>
            </div>

            <section className="rounded-[14px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.035)] sm:px-[18px] sm:py-5">
                <h3 className="text-[11px] font-semibold text-slate-900">Notifications</h3>
                <div className="mt-3 space-y-3">
                    <label className="flex cursor-pointer items-center justify-between gap-4">
                        <span>
                            <span className="block text-[10px] font-medium text-slate-900">Delivery notifications</span>
                            <span className="mt-0.5 block text-[9px] text-slate-400">Notify me when a request is delivered.</span>
                        </span>
                        <input
                            type="checkbox"
                            checked={preferences.deliveryNotifications}
                            onChange={(event) => updatePreference('deliveryNotifications', event.target.checked)}
                            className="h-3 w-3 shrink-0 accent-blue-600"
                        />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between gap-4">
                        <span>
                            <span className="block text-[10px] font-medium text-slate-900">Request status updates</span>
                            <span className="mt-0.5 block text-[9px] text-slate-400">Notify me when the operations team changes a request status.</span>
                        </span>
                        <input
                            type="checkbox"
                            checked={preferences.statusNotifications}
                            onChange={(event) => updatePreference('statusNotifications', event.target.checked)}
                            className="h-3 w-3 shrink-0 accent-blue-600"
                        />
                    </label>
                </div>
            </section>

            <section className="mt-3.5 flex flex-col gap-3 rounded-[14px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.035)] sm:flex-row sm:items-center sm:justify-between sm:px-[18px] sm:py-5">
                <div>
                    <h3 className="text-[11px] font-semibold text-slate-900">Appearance</h3>
                    <label htmlFor="theme" className="mt-3 block text-[10px] font-medium text-slate-900">Theme</label>
                    <p className="mt-0.5 text-[9px] text-slate-400">Light theme is recommended for operational workflows.</p>
                </div>
                <select
                    id="theme"
                    value={preferences.theme}
                    onChange={(event) => updatePreference('theme', event.target.value as ClientPreferences['theme'])}
                    className="h-[30px] w-full rounded-[8px] border border-slate-200 bg-white px-2.5 text-[10px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 sm:w-[72px]"
                >
                    <option>Light</option>
                    <option>Dark</option>
                    <option>System</option>
                </select>
            </section>
        </div>
    );
}