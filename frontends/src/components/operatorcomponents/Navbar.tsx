'use client';

import { useSession } from 'next-auth/react';
import { Bell, Menu, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useGetCurrentUserQuery } from '@/lib/redux/slices/AuthSlice';

interface NavbarProps {
    onMenuClick: () => void;
}

const pageHeaders: Record<string, { title: string; subtitle: string }> = {
    '/operator': { title: 'Operations Dashboard', subtitle: 'Requests that need operational attention' },
    '/operator/requests': { title: 'Requests', subtitle: 'View and process all client dataset requests' },
    '/operator/episode-assignment': { title: 'Episode Assignment', subtitle: 'Find eligible episodes and assign them to an active request' },
    '/operator/import-episodes': { title: 'Import Episode Metadata', subtitle: 'Upload the recording export and review import results' },
    '/operator/profile': { title: 'Profile', subtitle: 'Operator account information' },
    '/operator/settings': { title: 'Settings', subtitle: 'Personal preferences for the operations workspace' },
};

export default function Navbar({ onMenuClick }: NavbarProps) {
    const { data: session, status } = useSession();
    const { data: backendUser } = useGetCurrentUserQuery(undefined, { skip: status !== 'authenticated' });
    const pathname = usePathname() ?? '/operator';
    const pageHeader = pageHeaders[pathname] || pageHeaders['/operator'];
    const displayName = backendUser?.name || backendUser?.email || session?.user?.name || session?.user?.email || 'Account';
    const role = backendUser?.role || session?.user?.role || 'operator';
    const initials = displayName
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <header className="flex h-[54px] items-center justify-between border-b border-slate-800 bg-[#030817] px-4 text-white sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
                <button type="button" aria-label="Open navigation" onClick={onMenuClick} className="grid h-8 w-8 place-items-center rounded-md text-white hover:bg-blue-700 md:hidden">
                    <Menu size={17} />
                </button>
                <div className="min-w-0">
                    <h1 className="truncate text-sm font-semibold leading-4 text-white">{pageHeader.title}</h1>
                    <p className="mt-0.5 truncate text-[9px] leading-3 text-blue-100">{pageHeader.subtitle}</p>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2.5 sm:gap-4">
                <button type="button" aria-label="Search" className="grid h-7 w-7 place-items-center rounded-lg border border-blue-400 text-blue-100 transition-colors hover:bg-blue-700 hover:text-white">
                    <Search size={14} />
                </button>
                <button type="button" aria-label="Notifications" className="relative grid h-7 w-7 place-items-center rounded-lg border border-blue-400 text-blue-100 transition-colors hover:bg-blue-700 hover:text-white">
                    <Bell size={14} />
                    <span className="absolute right-[4px] top-[4px] h-1.5 w-1.5 rounded-full bg-white" />
                </button>
                <span className="hidden h-7 w-px bg-blue-400 sm:block" />
                <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[8px] font-semibold text-blue-700">{initials}</span>
                    <span className="hidden sm:block">
                        <span className="block max-w-32 truncate text-[10px] font-semibold leading-4 text-white">{displayName}</span>
                        <span className="block capitalize text-[9px] leading-3 text-blue-100">{role}</span>
                    </span>
                </div>
            </div>
        </header>
    );
}
