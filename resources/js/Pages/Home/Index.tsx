import { Link, Head } from '@inertiajs/react';
import { PageProps } from '@/types';
import ApplicationLogo from '@/Components/ApplicationLogo';

interface HomeProps extends PageProps {
    canLogin?: boolean;
    laravelVersion?: string;
    phpVersion?: string;
}

export default function Home({ auth, canLogin, laravelVersion, phpVersion }: HomeProps) {
    return (
        <>
            <Head title="Welcome" />
            <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
                {/* Navigation Header */}
                <header className="w-full border-b border-white/10 backdrop-blur-md bg-slate-900/60 sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <ApplicationLogo className="h-9 w-9 text-indigo-400" />
                            <span className="font-bold text-lg tracking-tight text-white">Pháp Tạng App</span>
                        </div>

                        <nav className="flex items-center gap-4">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition duration-150 shadow-sm shadow-indigo-500/20"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                canLogin && (
                                    <Link
                                        href={route('login')}
                                        className="px-4 py-2 text-sm font-medium rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition duration-150"
                                    >
                                        Log in
                                    </Link>
                                )
                            )}
                        </nav>
                    </div>
                </header>

                {/* Hero Section */}
                <main className="flex-1 flex items-center justify-center px-6 py-16">
                    <div className="max-w-3xl text-center space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Application Ready
                        </div>

                        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">Pháp Tạng Web App</span>
                        </h1>

                        <p className="text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
                            Clean Laravel + React + Inertia foundation configured with authentication, user management, and profile settings.
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="px-6 py-3 text-base font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition duration-150"
                                >
                                    Go to Dashboard &rarr;
                                </Link>
                            ) : (
                                <Link
                                    href={route('login')}
                                    className="px-6 py-3 text-base font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition duration-150"
                                >
                                    Sign In
                                </Link>
                            )}
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="w-full border-t border-white/10 py-6 text-center text-xs text-slate-400">
                    <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p>&copy; {new Date().getFullYear()} Pháp Tạng Web App. All rights reserved.</p>
                        <p className="text-slate-500">
                            Laravel v{laravelVersion || ''} (PHP v{phpVersion || ''})
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
