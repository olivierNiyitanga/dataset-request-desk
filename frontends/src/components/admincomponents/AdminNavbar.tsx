'use client';

import { useSession } from 'next-auth/react';
import { Bell, Menu, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useGetCurrentUserQuery } from '@/lib/redux/slices/AuthSlice';

interface AdminNavbarProps {
    onMenuClick: () => void;
}

const headers: Record<string, { title: string; subtitle: string }> = {
    '/admin': { title: 'Dashboard', subtitle: 'System overview and operational activity' },
    '/admin/requests': { title: 'Requests', subtitle: 'Manage all client dataset requests and workflow status' },
    '/admin/episodes': { title: 'Episode Management', subtitle: 'Search and assign available recording episodes' },
    '/admin/import-episodes': { title: 'Import Episodes', subtitle: 'Import recording metadata safely and review skipped rows' },
    '/admin/analytics': { title: 'Analytics', subtitle: 'Operational metrics calculated from the database' },
    '/admin/users': { title: 'User Management', subtitle: 'Create, deactivate, and manage roles for platform users' },
    '/admin/settings': { title: 'System Settings', subtitle: 'Configure platform defaults and administrative preferences' },
};

export default function AdminNavbar({ onMenuClick }: AdminNavbarProps) {
    const { data: session, status } = useSession();
    const { data: backendUser } = useGetCurrentUserQuery(undefined, { skip: status !== 'authenticated' });
    const pathname = usePathname() ?? '/admin';
    const header = headers[pathname] || headers['/admin'];
    const name = backendUser?.name || backendUser?.email || session?.user?.name || session?.user?.email || 'Account';
    const role = backendUser?.role || session?.user?.role || 'admin';
    const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

    return (
        <header className="flex h-[54px] items-center justify-between border-b border-slate-800 bg-[#030817] px-4 text-white sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
                <button type="button" aria-label="Open navigation" onClick={onMenuClick} className="grid h-8 w-8 place-items-center rounded-md text-white hover:bg-blue-700 md:hidden"><Menu size={17} /></button>
                <div className="min-w-0">
                    <h1 className="truncate text-sm font-semibold leading-4 text-white">{header.title}</h1>
                    <p className="mt-0.5 truncate text-[9px] leading-3 text-blue-100">{header.subtitle}</p>
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-2.5 sm:gap-4">
                <button type="button" aria-label="Search" className="grid h-7 w-7 place-items-center rounded-lg border border-blue-400 text-blue-100 hover:bg-blue-700 hover:text-white"><Search size={14} /></button>
                <button type="button" aria-label="Notifications" className="relative grid h-7 w-7 place-items-center rounded-lg border border-blue-400 text-blue-100 hover:bg-blue-700 hover:text-white"><Bell size={14} /><span className="absolute right-[4px] top-[4px] h-1.5 w-1.5 rounded-full bg-white" /></button>
                <span className="hidden h-7 w-px bg-blue-400 sm:block" />
                <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[8px] font-semibold text-blue-700">{initials}</span>
                    <span className="hidden sm:block">
                        <span className="block max-w-32 truncate text-[10px] font-semibold leading-4 text-white">{name}</span>
                        <span className="block capitalize text-[9px] leading-3 text-blue-100">{role}</span>
                    </span>
                </div>
            </div>
        </header>
    );
}
