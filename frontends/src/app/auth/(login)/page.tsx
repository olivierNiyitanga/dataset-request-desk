'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn, signOut, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Box, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useLazyGetCurrentUserQuery, type AuthUser } from '@/lib/redux/slices/AuthSlice';

interface FormData {
    email: string;
    password: string;
    rememberMe: boolean;
}

export default function SignIn() {
    const [formData, setFormData] = useState<FormData>({
        email: '',
        password: '',
        rememberMe: false
    });
    const [focusedField, setFocusedField] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [fetchCurrentUser] = useLazyGetCurrentUserQuery();
    const router = useRouter();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFocus = (fieldName: string) => {
        setFocusedField(fieldName);
    };

    const handleBlur = () => {
        setFocusedField('');
    };

    const handleSignIn = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setIsLoading(true);

        if (!formData.email || !formData.password) {
            toast.error('Please fill in all fields', {
                style: {
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    border: '1px solid #fca5a5',
                },
            });
            setIsLoading(false);
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            toast.error('Please enter a valid email address', {
                style: {
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    border: '1px solid #fca5a5',
                },
            });
            setIsLoading(false);
            return;
        }

        try {
            console.log('Attempting sign-in with:', {
                email: formData.email,
                passwordLength: formData.password.length
            });

            // First, check if there's an existing session
            const existingSession = await getSession();
            if (existingSession) {
                console.log('Found existing session, signing out first...');
                await signOut({ redirect: false });
                // Wait a moment for the session to clear
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log('Attempting fresh sign-in...');
            const result = await signIn('credentials', {
                redirect: false,
                email: formData.email.trim().toLowerCase(), // Normalize email
                password: formData.password,
            });

            console.log('SignIn result:', result);

            if (result?.error) {
                console.error('SignIn error:', result.error);

                // Handle different error types
                let errorMessage = 'Login failed. Please try again.';

                switch (result.error) {
                    case 'CredentialsSignin':
                        errorMessage = 'Invalid email or password. Please check your credentials.';
                        break;
                    case 'CallbackRouteError':
                        errorMessage = 'Authentication service error. Please try again.';
                        break;
                    case 'Configuration':
                        errorMessage = 'Authentication configuration error. Please contact support.';
                        break;
                    case 'Authentication server error':
                        errorMessage = 'Server authentication error. Please try again.';
                        break;
                    default:
                        errorMessage = result.error;
                }

                toast.error(errorMessage, {
                    style: {
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: 'white',
                        border: '1px solid #fca5a5',
                    },
                });
            } else if (result?.ok) {
                console.log('SignIn successful, fetching session...');

                // Wait a moment for the session to be created
                // Wait a moment for the session to be created
                await new Promise(resolve => setTimeout(resolve, 500));

                // Get session to check user role
                const session = await getSession();
                console.log('Current session:', session);

                if (!session?.user) {
                    toast.error('Session creation failed. Please try again.', {
                        style: {
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: 'white',
                            border: '1px solid #fca5a5',
                        },
                    });
                    setIsLoading(false);
                    return;
                }

                const backendUser = await fetchCurrentUser().unwrap();
                const userRole = backendUser.role;
                console.log('User role:', userRole);

                // Show success message
                toast.success('Welcome back! Redirecting...', {
                    style: {
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: '1px solid #6ee7b7',
                        fontWeight: '600',
                    },
                });

                // Redirect based on role
                const redirectPath = getRedirectPath(userRole);
                console.log('Redirecting to:', redirectPath);

                // Clear form
                setFormData({
                    email: '',
                    password: '',
                    rememberMe: false
                });

                setTimeout(() => {
                    router.push(redirectPath);
                }, 1500);
            } else {
                // This shouldn't happen, but handle just in case
                toast.error('Unexpected error occurred. Please try again.', {
                    style: {
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: 'white',
                        border: '1px solid #fca5a5',
                    },
                });
            }
        } catch (error) {
            console.error('SignIn catch error:', error);
            toast.error('Network error. Please check your connection and try again.', {
                style: {
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    border: '1px solid #fca5a5',
                },
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getRedirectPath = (role: AuthUser['role']): string => {
        switch (role) {
            case 'admin':
                return '/admin';
            case 'operator':
                return '/operator';
            case 'client':
                return '/client';
            default:
                return '/auth';
        }
    };

    return (
        <main className="grid min-h-screen bg-white lg:grid-cols-2">
            <section className="relative flex min-h-[560px] flex-col overflow-hidden bg-[#030817] px-7 py-8 text-white sm:px-12 sm:py-12 lg:min-h-screen">
                <div className="pointer-events-none absolute -bottom-24 right-[-5rem] h-72 w-72 rounded-full border border-blue-500/10" />
                <div className="pointer-events-none absolute -bottom-10 right-10 h-44 w-44 rounded-full border border-blue-500/10" />
                <div className="relative z-10 flex w-fit items-center gap-3 text-white">
                    <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-blue-600">
                        <Box aria-hidden="true" size={18} strokeWidth={1.8} />
                    </span>
                    <span>
                        <span className="block text-sm font-semibold leading-tight">Dataset Request Desk</span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">Client Portal</span>
                    </span>
                </div>

                <div className="relative z-10 my-auto max-w-xl py-16 lg:py-0">
                    <p className="mb-4 text-xs font-semibold text-blue-400">Internal robotics dataset operations platform</p>
                    <h1 className="max-w-lg text-3xl font-semibold leading-[1.13] tracking-tight sm:text-4xl">
                        Request, track and review robotics datasets.
                    </h1>
                    <p className="mt-4 max-w-lg text-sm leading-6 text-slate-400">
                        A centralized workspace for managing dataset requirements and reviewing completed deliveries from the operations team.
                    </p>
                    <div className="mt-8 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
                        {[
                            { title: '24/7', detail: 'Request visibility' },
                            { title: 'Audit', detail: 'Status history' },
                            { title: 'Secure', detail: 'Role-based access' },
                        ].map((item) => (
                            <div key={item.title} className="rounded-xl border border-white/[0.08] bg-white/[0.045] px-3.5 py-3">
                                <p className="text-sm font-semibold">{item.title}</p>
                                <p className="mt-1 text-[10px] text-slate-400">{item.detail}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="relative z-10 text-[10px] text-slate-500">© 2026 Dataset Request Desk</p>
                <span aria-hidden="true" className="absolute left-[86%] top-1/2 h-1.5 w-1.5 rounded-full bg-blue-500" />
            </section>

            <section className="flex min-h-[560px] items-center justify-center bg-white px-5 py-12 sm:px-10 lg:min-h-screen">
                <div className="w-full max-w-[360px] rounded-2xl border border-slate-200/80 bg-white px-7 py-7 shadow-[0_10px_35px_rgba(15,23,42,0.07)] sm:px-8">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Welcome back</h2>
                    <p className="mt-1 text-sm text-slate-500">Sign in to manage your dataset requests.</p>

                    <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                        <div>
                            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-900">Email</label>
                            <div className={`flex h-11 items-center gap-2 rounded-[10px] border px-3 transition-colors ${focusedField === 'email' ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200'}`}>
                                <Mail aria-hidden="true" size={15} className="shrink-0 text-slate-400" />
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    onFocus={() => handleFocus('email')}
                                    onBlur={handleBlur}
                                    placeholder="name@company.com"
                                    autoComplete="email"
                                    className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <label htmlFor="password" className="text-sm font-medium text-slate-900">Password</label>
                                <Link href="/auth/forgot-password" className="text-xs font-medium text-blue-600 no-underline hover:text-blue-700">Forgot password?</Link>
                            </div>
                            <div className={`flex h-11 items-center gap-2 rounded-[10px] border px-3 transition-colors ${focusedField === 'password' ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200'}`}>
                                <LockKeyhole aria-hidden="true" size={15} className="shrink-0 text-slate-400" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    onFocus={() => handleFocus('password')}
                                    onBlur={handleBlur}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                                    disabled={isLoading}
                                />
                                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="grid h-6 w-6 shrink-0 place-items-center text-slate-400 hover:text-slate-600">
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        <label className="flex w-fit cursor-pointer items-center gap-2 pt-0.5 text-xs text-slate-600">
                            <input
                                type="checkbox"
                                name="rememberMe"
                                checked={formData.rememberMe}
                                onChange={handleInputChange}
                                className="h-3.5 w-3.5 accent-blue-600"
                                disabled={isLoading}
                            />
                            Remember me
                        </label>

                        <button
                            type="submit"
                            disabled={isLoading || !formData.email || !formData.password}
                            className="flex h-10 w-full items-center justify-center rounded-[10px] bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">Access is managed by your organization&apos;s administrator.</p>
                </div>
            </section>
        </main>
    );
}