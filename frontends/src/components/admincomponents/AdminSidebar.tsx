'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    Activity,
    ArrowRightFromLine,
    Bot,
    Boxes,
    ClipboardList,
    LayoutDashboard,
    Settings,
    UploadCloud,
    UserRound,
    Users,
    X,
} from 'lucide-react';
import { useGetCurrentUserQuery } from '@/lib/redux/slices/AuthSlice';
import LogoutConfirmDialog from '@/components/LogoutConfirmDialog';

interface AdminSidebarProps {
    isMobileOpen: boolean;
    onClose: () => void;
}

const workspaceLinks = [
    { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
    { title: 'Requests', url: '/admin/requests', icon: ClipboardList },
    { title: 'Episodes', url: '/admin/episodes', icon: Boxes },
    { title: 'Import Episodes', url: '/admin/import-episodes', icon: UploadCloud },
    { title: 'Analytics', url: '/admin/analytics', icon: Activity },
];

const administrationLinks = [
    { title: 'Users', url: '/admin/users', icon: Users },
    { title: 'Settings', url: '/admin/settings', icon: Settings },
];

export default function AdminSidebar({ isMobileOpen, onClose }: AdminSidebarProps) {
    const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
    const pathname = usePathname() ?? '';
    const { data: session, status } = useSession();
    const { data: backendUser } = useGetCurrentUserQuery(undefined, { skip: status !== 'authenticated' });
    const name = backendUser?.name || backendUser?.email || session?.user?.name || session?.user?.email || 'Account';
    const role = backendUser?.role || session?.user?.role || 'admin';
    const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

    const renderLinks = (links: typeof workspaceLinks) => links.map((item) => {
        const active = pathname === item.url || (item.url !== '/admin' && pathname.startsWith(`${item.url}/`));
        return (
            <li key={item.title}>
                <Link href={item.url} onClick={onClose} aria-current={active ? 'page' : undefined} className={`flex h-[33px] items-center gap-2.5 rounded-[8px] px-2.5 text-[11px] font-medium transition-colors ${active ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-50 hover:bg-blue-500 hover:text-white'}`}>
                    <item.icon size={14} strokeWidth={1.8} />
                    <span>{item.title}</span>
                </Link>
            </li>
        );
    });

    return (
        <>
            <button type="button" aria-label="Close navigation" onClick={onClose} className={`fixed inset-0 z-30 bg-slate-950/30 md:hidden ${isMobileOpen ? 'block' : 'hidden'}`} />
            <aside className={`fixed inset-y-0 left-0 z-40 flex w-[205px] flex-col border-r border-slate-800 bg-[#030817] text-white transition-transform duration-200 md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex h-[54px] shrink-0 items-center gap-2.5 border-b border-blue-500 px-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-white text-blue-600"><Bot size={16} strokeWidth={1.8} /></span>
                    <span className="min-w-0">
                        <span className="block truncate text-[11px] font-semibold leading-4 text-white">Dataset Request Desk</span>
                        <span className="block text-[9px] leading-3 text-blue-100">Operations Platform</span>
                    </span>
                    <button type="button" aria-label="Close menu" onClick={onClose} className="ml-auto grid h-7 w-7 place-items-center text-blue-100 hover:text-white md:hidden"><X size={17} /></button>
                </div>
                <nav className="flex-1 px-[10px] pt-4">
                    <p className="mb-2 px-2.5 text-[9px] font-medium uppercase tracking-[0.1em] text-blue-100/80">Workspace</p>
                    <ul className="space-y-1">{renderLinks(workspaceLinks)}</ul>
                    <p className="mb-2 mt-6 px-2.5 text-[9px] font-medium uppercase tracking-[0.1em] text-blue-100/80">Administration</p>
                    <ul className="space-y-1">{renderLinks(administrationLinks)}</ul>
                </nav>
                <div className="border-t border-blue-500 p-4">
                    <div className="flex items-center gap-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[8px] font-semibold text-blue-700">{initials}</span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[10px] font-semibold text-white">{name}</span>
                            <span className="block capitalize text-[9px] text-blue-100">{role}</span>
                        </span>
                    </div>
                    <button type="button" onClick={() => setLogoutDialogOpen(true)} className="mt-4 flex h-7 w-full items-center gap-2 rounded-md px-1 text-[10px] font-medium text-blue-50 transition-colors hover:bg-blue-500 hover:text-white">
                        <ArrowRightFromLine size={13} /> Logout
                    </button>
                </div>
            </aside>
            <LogoutConfirmDialog open={logoutDialogOpen} onCancel={() => setLogoutDialogOpen(false)} onConfirm={() => signOut({ callbackUrl: '/auth' })} />
        </>
    );
}
