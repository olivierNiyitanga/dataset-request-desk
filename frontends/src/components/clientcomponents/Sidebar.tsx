'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    ArrowRightFromLine,
    Box,
    FileText,
    Home,
    Plus,
    Settings,
    UserRound,
    X,
} from 'lucide-react';
import { useGetCurrentUserQuery } from '@/lib/redux/slices/AuthSlice';
import LogoutConfirmDialog from '@/components/LogoutConfirmDialog';

interface SidebarProps {
    isMobileOpen: boolean;
    onClose: () => void;
}

const workspaceItems = [
    { title: 'Dashboard', url: '/client', icon: Home },
    { title: 'My Requests', url: '/client/requests', icon: FileText },
    { title: 'Create Request', url: '/client/requests/new', icon: Plus },
    { title: 'Profile', url: '/client/profile', icon: UserRound },
];

export default function Sidebar({ isMobileOpen, onClose }: SidebarProps) {
    const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const { data: backendUser } = useGetCurrentUserQuery(undefined, { skip: status !== 'authenticated' });
    const displayName = backendUser?.name || backendUser?.email || session?.user?.name || session?.user?.email || 'Account';
    const role = backendUser?.role || session?.user?.role || 'client';
    const initials = displayName
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <>
            <button
                type="button"
                aria-label="Close navigation"
                onClick={onClose}
                className={`fixed inset-0 z-30 bg-slate-950/30 md:hidden ${isMobileOpen ? 'block' : 'hidden'}`}
            />
            <aside className={`fixed inset-y-0 left-0 z-40 flex w-[205px] flex-col border-r border-slate-800 bg-[#030817] text-white transition-transform duration-200 md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex h-[64px] shrink-0 items-center gap-2.5 border-b border-blue-500 px-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-white text-blue-600">
                        <Box size={16} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-[11px] font-semibold leading-4 text-white">Dataset Request Desk</span>
                        <span className="block text-[9px] leading-3 text-blue-100">Client Portal</span>
                    </span>
                    <button type="button" aria-label="Close menu" onClick={onClose} className="ml-auto grid h-7 w-7 place-items-center text-blue-100 hover:text-white md:hidden">
                        <X size={17} />
                    </button>
                </div>

                <nav className="flex-1 px-[10px] pt-4">
                    <p className="mb-2 px-2.5 text-[9px] font-medium uppercase tracking-[0.12em] text-blue-100/80">Workspace</p>
                    <ul className="space-y-1">
                        {workspaceItems.map((item) => {
                            const active = pathname === item.url;
                            return (
                                <li key={item.title}>
                                    <Link
                                        href={item.url}
                                        onClick={onClose}
                                        aria-current={active ? 'page' : undefined}
                                        className={`flex h-8 items-center gap-2.5 rounded-[9px] px-2.5 text-[11px] font-medium transition-colors ${active ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-50 hover:bg-blue-500 hover:text-white'}`}
                                    >
                                        <item.icon size={14} strokeWidth={1.8} />
                                        <span>{item.title}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    <p className="mb-2 mt-7 px-2.5 text-[9px] font-medium uppercase tracking-[0.12em] text-blue-100/80">Account</p>
                    <Link
                        href="/client/settings"
                        onClick={onClose}
                        className={`flex h-8 items-center gap-2.5 rounded-[9px] px-2.5 text-[11px] font-medium transition-colors ${pathname === '/client/settings' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-50 hover:bg-blue-500 hover:text-white'}`}
                    >
                        <Settings size={14} strokeWidth={1.8} />
                        <span>Settings</span>
                    </Link>
                </nav>

                <div className="border-t border-blue-500 p-[10px]">
                    <div className="flex h-12 items-center gap-2.5 rounded-[9px] bg-blue-700/40 px-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[9px] font-semibold text-blue-700">{initials}</span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[10px] font-medium text-white">{displayName}</span>
                            <span className="block capitalize text-[9px] text-blue-100">{role}</span>
                        </span>
                        <button
                            type="button"
                            aria-label="Sign out"
                            title="Sign out"
                            onClick={() => setLogoutDialogOpen(true)}
                            className="grid h-7 w-7 shrink-0 place-items-center text-blue-100 transition-colors hover:text-white"
                        >
                            <ArrowRightFromLine size={14} />
                        </button>
                    </div>
                </div>
            </aside>
            <LogoutConfirmDialog open={logoutDialogOpen} onCancel={() => setLogoutDialogOpen(false)} onConfirm={() => signOut({ callbackUrl: '/auth' })} />
        </>
    );
}
