'use client';

import { useSession } from 'next-auth/react';
import { useGetCurrentUserQuery } from '@/lib/redux/slices/AuthSlice';

export default function ClientProfilePage() {
    const { data: session } = useSession();
    const { data: backendUser } = useGetCurrentUserQuery();
    const name = backendUser?.name || session?.user?.name || 'Account';
    const email = backendUser?.email || session?.user?.email || '';
    const initials = name
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="mx-auto min-h-[calc(100vh-64px)] max-w-[1034px] px-5 py-7 sm:px-8 lg:px-10">
            <div className="mb-5">
                <p className="mb-1.5 text-[10px] font-semibold text-blue-600">Account</p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-[22px]">Profile</h2>
                <p className="mt-1 text-xs text-slate-500">View your account and organization information.</p>
            </div>

            <section className="overflow-hidden rounded-[14px] border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.035)]">
                <div className="flex items-center gap-3.5 px-5 py-5 sm:px-6">
                    <span className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-xl bg-blue-100 text-lg font-semibold text-blue-700">{initials}</span>
                    <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-950">{name}</h3>
                        <p className="mt-1 truncate text-[10px] text-slate-500">{email}</p>
                        <div className="mt-2 flex items-center gap-1.5">
                            <span className="rounded-full bg-blue-50 px-2 py-1 text-[8px] font-medium text-blue-700">Client</span>
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-medium text-emerald-700">Active</span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-200 px-5 py-5 sm:px-6">
                    <h3 className="text-[11px] font-semibold text-slate-900">Account Information</h3>
                    <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                        {[
                            { label: 'Name', value: name },
                            { label: 'Email', value: email },
                            { label: 'Organisation', value: backendUser?.organisation || '—' },
                            { label: 'Role', value: backendUser?.role || 'client' },
                            { label: 'Account Status', value: backendUser?.is_active ? 'Active' : 'Inactive', active: backendUser?.is_active },
                        ].map((item) => (
                            <div key={item.label}>
                                <dt className="text-[9px] text-slate-400">{item.label}</dt>
                                <dd className={`mt-1 text-[10px] font-medium ${item.active ? 'text-emerald-600' : 'text-slate-900'}`}>{item.value}</dd>
                            </div>
                        ))}
                    </dl>

                    <p className="mt-5 rounded-[9px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-[9px] leading-4 text-slate-500">
                        <span className="font-semibold text-slate-700">Role permissions:</span> Client roles can create and manage their own requests and review delivered datasets. Role changes are managed by an administrator.
                    </p>
                </div>
            </section>
        </div>
    );
}