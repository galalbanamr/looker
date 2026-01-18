import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Looker - Never Miss an Opportunity',
    description: 'Looker monitors the web for competitions, hackathons, and events. Get instant WhatsApp notifications when new opportunities match your interests.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className="min-h-screen bg-zinc-950 text-white antialiased">
                {children}
            </body>
        </html>
    );
}
