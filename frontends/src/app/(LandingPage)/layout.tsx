import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Dataset Request Desk | Client Portal",
    description: "Request, track, and review robotics datasets.",
    icons: {
        icon: '/favicon.ico',
        shortcut: '/logo.jpeg',
        apple: '/logo.jpeg',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <>{children}</>;
}
