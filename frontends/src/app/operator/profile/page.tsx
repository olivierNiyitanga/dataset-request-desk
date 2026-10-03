'use client';

import { useSession } from 'next-auth/react';
import { useGetCurrentUserQuery } from '@/lib/redux/slices/AuthSlice';

export default function OperatorProfilePage() {
    const { data: session } = useSession();
    const { data: backendUser } = useGetCurrentUserQuery();
    const name = backendUser?.name || session?.user?.name || 'Account';
    const email = backendUser?.email || session?.user?.email || '';
    const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="mx-auto min-h-[calc(100vh-54px)] max-w-[1034px] px-5 py-6 sm:px-6 lg:px-[26px]">
            <div className="mb-5"><p className="mb-1 text-[9px] font-medium text-slate-500">Account</p><h2 className="text-xl font-semibold text-slate-950">Profile</h2><p className="mt-1 text-[10px] text-slate-500">View your operator account information.</p></div>
            <section className="overflow-hidden rounded-[11px] border border-slate-200 bg-white">
                <div className="flex items-center gap-3.5 px-5 py-5">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white">{initials}</span>
                    <div><h3 className="text-[12px] font-semibold text-slate-950">{name}</h3><p className="mt-1 text-[9px] text-slate-500">{email}</p><span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[8px] font-medium text-slate-700">Operator</span></div>
                </div>
                <div className="border-t border-slate-200 px-5 py-5">
                    <h3 className="text-[10px] font-semibold text-slate-900">Account Information</h3>
                    <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div><dt className="text-[8px] text-slate-400">Name</dt><dd className="mt-1 text-[10px] font-medium text-slate-900">{name}</dd></div>
                        <div><dt className="text-[8px] text-slate-400">Email</dt><dd className="mt-1 text-[10px] font-medium text-slate-900">{email}</dd></div>
                        <div><dt className="text-[8px] text-slate-400">Role</dt><dd className="mt-1 text-[10px] font-medium capitalize text-slate-900">{backendUser?.role || 'operator'}</dd></div>
                        <div><dt className="text-[8px] text-slate-400">Platform</dt><dd className="mt-1 text-[10px] font-medium text-slate-900">Dataset Request Desk</dd></div>
                    </dl>
                </div>
            </section>
        </div>
    );
}