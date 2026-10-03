'use client';

import { useState } from 'react';
import AdminNavbar from '@/components/admincomponents/AdminNavbar';
import AdminSidebar from '@/components/admincomponents/AdminSidebar';

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#f6f8fb]">
            <AdminSidebar isMobileOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />
            <div className="min-h-screen md:pl-[205px]">
                <AdminNavbar onMenuClick={() => setIsMobileOpen(true)} />
                <main>{children}</main>
            </div>
        </div>
    );
}