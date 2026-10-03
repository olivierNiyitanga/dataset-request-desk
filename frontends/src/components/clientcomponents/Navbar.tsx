'use client';

import { useSession } from 'next-auth/react';
import { Bell, ChevronDown, Menu, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useGetCurrentUserQuery } from '@/lib/redux/slices/AuthSlice';

interface NavbarProps {
    onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
    const { data: session, status } = useSession();
    const { data: backendUser } = useGetCurrentUserQuery(undefined, { skip: status !== 'authenticated' });
    const pathname = usePathname();
    const pageTitle = pathname === '/client/requests/new'
        ? 'Create Request'
        : pathname?.endsWith('/review')
            ? 'Dataset Review'
        : pathname === '/client/requests'
            ? 'My Requests'
            : pathname === '/client/profile'
                ? 'Profile'
                : pathname === '/client/settings'
                    ? 'Settings'
            : pathname === '/client'
                ? 'Dashboard'
                : 'Client workspace';
    const displayName = backendUser?.name || backendUser?.email || session?.user?.name || session?.user?.email || 'Account';
    const role = backendUser?.role || session?.user?.role || 'client';
    const initials = displayName
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <header className="flex h-[64px] items-center justify-between border-b border-slate-800 bg-[#030817] px-4 text-white sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
                <button type="button" aria-label="Open navigation" onClick={onMenuClick} className="grid h-8 w-8 place-items-center rounded-md text-white hover:bg-blue-700 md:hidden">
                    <Menu size={18} />
                </button>
                <div className="min-w-0">
                    <p className="text-[9px] leading-3 text-blue-100">Client workspace</p>
                    <h1 className="truncate text-sm font-semibold leading-5 text-white">{pageTitle}</h1>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 sm:gap-5">
                <button type="button" aria-label="Search" className="grid h-8 w-8 place-items-center text-blue-100 transition-colors hover:text-white">
                    <Search size={15} />
                </button>
                <button type="button" aria-label="Notifications" className="relative grid h-8 w-8 place-items-center text-blue-100 transition-colors hover:text-white">
                    <Bell size={15} />
                    <span className="absolute right-[5px] top-[5px] h-1.5 w-1.5 rounded-full bg-white" />
                </button>
                <button type="button" className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-0.5 text-left hover:bg-blue-700">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[9px] font-semibold text-blue-700">{initials}</span>
                    <span className="hidden sm:block">
                        <span className="block max-w-32 truncate text-[10px] font-semibold leading-4 text-white">{displayName}</span>
                        <span className="block text-[9px] capitalize leading-3 text-blue-100">{role}</span>
                    </span>
                    <ChevronDown size={12} className="hidden text-blue-100 sm:block" />
                </button>
            </div>
        </header>
    );
}
