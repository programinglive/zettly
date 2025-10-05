import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AppLayout title="Register">
            <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 p-10 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Create Account</h2>
                    <p className="text-gray-600 dark:text-gray-400">Join us and start organizing your tasks</p>
                </div>

                <Head title="Register" />

                <form onSubmit={submit} className="space-y-6">
                    <div>
                        <InputLabel htmlFor="name" value="Full Name" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block" />

                        <TextInput
                            id="name"
                            name="name"
                            value={data.name}
                            className="mt-1 block w-full px-4 py-3 text-base border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:border-gray-500 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100"
                            autoComplete="name"
                            isFocused={true}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Enter your full name"
                            required
                        />

                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="email" value="Email Address" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block" />

                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="mt-1 block w-full px-4 py-3 text-base border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:border-gray-500 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100"
                            autoComplete="username"
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="Enter your email address"
                            required
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
                            className="mt-1 block w-full px-4 py-3 text-base border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:border-gray-500 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100"
                            autoComplete="new-password"
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Choose a strong password"
                            required
                        />

                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel
                            htmlFor="password_confirmation"
                            value="Confirm Password"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block"
                        />

                        <TextInput
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="mt-1 block w-full px-4 py-3 text-base border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:border-gray-500 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100"
                            autoComplete="new-password"
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            placeholder="Confirm your password"
                            required
                        />

                        <InputError
                            message={errors.password_confirmation}
                            className="mt-2"
                        />
                    </div>

                    <div className="pt-4">
                        <PrimaryButton className="w-full bg-gray-900 hover:bg-gray-800 py-3 text-base font-medium" disabled={processing}>
                            {processing ? 'Creating account...' : 'Create Account'}
                        </PrimaryButton>
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Already have an account?{' '}
                        <Link
                            href={route('login')}
                            className="font-medium text-gray-600 hover:text-gray-800 underline focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            Sign in here
                        </Link>
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
