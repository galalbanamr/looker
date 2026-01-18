'use client';

import Link from 'next/link';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-zinc-950" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-3xl" />

                {/* Navigation */}
                <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🏆</span>
                        <span className="text-xl font-bold gradient-text">Competition Monitor</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/auth" className="btn-secondary">
                            Sign In
                        </Link>
                    </div>
                </nav>

                {/* Hero content */}
                <div className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32 text-center">
                    <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-zinc-800/50 rounded-full border border-zinc-700">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-sm text-zinc-400">Powered by Perplexity AI</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
                        Never Miss a
                        <span className="block gradient-text">Competition Again</span>
                    </h1>

                    <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
                        AI-powered monitoring for hackathons, competitions, grants, and events.
                        Get instant WhatsApp alerts when opportunities match your interests.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/auth" className="btn-primary text-lg px-8 py-4">
                            Get Started Free →
                        </Link>
                        <Link href="#features" className="btn-secondary text-lg px-8 py-4">
                            Learn More
                        </Link>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <section id="features" className="py-24 px-8 max-w-7xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
                <p className="text-zinc-400 text-center mb-16 max-w-2xl mx-auto">
                    Set up your preferences once, and let our AI do the heavy lifting
                </p>

                <div className="grid md:grid-cols-3 gap-8">
                    <FeatureCard
                        icon="🎯"
                        title="Define Your Interests"
                        description="Create search profiles with keywords like 'hackathon', 'startup competition', or 'AI grant'. Set your location and frequency."
                    />
                    <FeatureCard
                        icon="🤖"
                        title="AI Scans the Web"
                        description="Perplexity AI searches the internet multiple times per day, finding new competitions and extracting key details."
                    />
                    <FeatureCard
                        icon="📱"
                        title="Instant WhatsApp Alerts"
                        description="Get notified immediately via WhatsApp with event details, deadlines, and links. Never miss an opportunity."
                    />
                </div>
            </section>

            {/* Notification Preview */}
            <section className="py-24 px-8 bg-zinc-900/50">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-4">What You'll Receive</h2>
                    <p className="text-zinc-400 text-center mb-16">
                        Clean, actionable notifications right in your WhatsApp
                    </p>

                    <div className="max-w-md mx-auto">
                        <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700 shadow-2xl">
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-700">
                                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                                    CM
                                </div>
                                <div>
                                    <div className="font-semibold">Competition Monitor</div>
                                    <div className="text-xs text-zinc-400">Now</div>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm">
                                <p className="font-bold text-lg">🏆 Qatar Startup Challenge 2026</p>
                                <p><span className="text-zinc-400">What:</span> Pitch competition for tech startups with $100K prize pool</p>
                                <p><span className="text-zinc-400">Deadline:</span> February 15, 2026</p>
                                <p className="text-indigo-400 break-all">🔗 https://qsc2026.qa/apply</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-bold mb-6">Ready to Find Your Next Opportunity?</h2>
                    <p className="text-xl text-zinc-400 mb-10">
                        Join thousands of ambitious individuals who never miss a competition
                    </p>
                    <Link href="/auth" className="btn-primary text-xl px-10 py-5 inline-block">
                        Start Monitoring Now →
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-8 border-t border-zinc-800">
                <div className="max-w-7xl mx-auto text-center text-zinc-500 text-sm">
                    © 2026 Competition Monitor. Built with ❤️ using Next.js and Perplexity AI.
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
        <div className="card hover:border-indigo-500/50 transition-colors group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{icon}</div>
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-zinc-400">{description}</p>
        </div>
    );
}
