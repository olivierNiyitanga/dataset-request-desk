'use client';

import { useState } from 'react';
import Navbar from '@/components/clientcomponents/Navbar';
import Sidebar from '@/components/clientcomponents/Sidebar';

export default function ClientLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#f6f8fb]">
            <Sidebar isMobileOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />
            <div className="min-h-screen md:pl-[205px]">
                <Navbar onMenuClick={() => setIsMobileOpen(true)} />
                <main>{children}</main>
            </div>
        </div>
    );
}