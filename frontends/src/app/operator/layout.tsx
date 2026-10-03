'use client';

import { useState } from 'react';
import Navbar from '@/components/operatorcomponents/Navbar';
import Sidebar from '@/components/operatorcomponents/Sidebar';

export default function OperatorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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