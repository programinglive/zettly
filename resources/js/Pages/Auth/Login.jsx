import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AppLayout title="Log in">
            <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 p-10 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Welcome Back</h2>
                    <p className="text-gray-600 dark:text-gray-400">Sign in to your account</p>
                </div>

                <Head title="Log in" />

                {status && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                        <div className="text-sm font-medium text-green-800 dark:text-green-200">
                            {status}
                        </div>
                    </div>
                )}

                <form onSubmit={submit} className="space-y-6">
                    <div>
                        <InputLabel htmlFor="email" value="Email or Username" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block" />

                        <TextInput
                            id="email"
                            type="text"
                            name="email"
                            value={data.email}
                            className="mt-1 block w-full px-4 py-3 text-base border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                            autoComplete="username"
                            isFocused={true}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="Enter your email or username"
                        />

                        <InputError message={errors.email} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password" value="Password" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block" />

                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="mt-1 block w-full px-4 py-3 text-base border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:bg-gray-700 dark:text-gray-100"
                            autoComplete="current-password"
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Enter your password"
                        />

                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center">
                            <Checkbox
                                name="remember"
                                checked={data.remember}
                                onChange={(e) =>
                                    setData('remember', e.target.checked)
                                }
                            />
                            <span className="ms-2 text-sm text-gray-600 dark:text-gray-400">
                                Remember me
                            </span>
                        </label>

                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-sm text-emerald-600 hover:text-emerald-800 underline focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:text-emerald-400 dark:hover:text-emerald-200"
                            >
                                Forgot password?
                            </Link>
                        )}
                    </div>

                    <div className="pt-4">
                        <PrimaryButton className="w-full bg-emerald-600 hover:bg-emerald-700 py-3 text-base font-medium" disabled={processing}>
                            {processing ? 'Signing in...' : 'Sign In'}
                        </PrimaryButton>
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Don't have an account?{' '}
                        <Link
                            href={route('register')}
                            className="font-medium text-emerald-600 hover:text-emerald-800 underline focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:text-emerald-400 dark:hover:text-emerald-200"
                        >
                            Create one here
                        </Link>
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
