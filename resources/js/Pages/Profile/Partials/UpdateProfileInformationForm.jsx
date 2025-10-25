import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}) {
    const user = usePage().props.auth.user;
    const { isSupported, isSubscribed, isLoading, requestPermission, unsubscribe } =
        usePushNotifications();

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
        });

    const submit = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Profile Information
                </h2>

                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Update your account's profile information and email address.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                <div>
                    <InputLabel htmlFor="name" value="Name" />

                    <TextInput
                        id="name"
                        className="mt-1 block w-full"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        isFocused
                        autoComplete="name"
                    />

                    <InputError className="mt-2" message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1 block w-full"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />

                    <InputError className="mt-2" message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="mt-2 text-sm text-gray-800 dark:text-gray-200">
                            Your email address is unverified.
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:text-gray-100 dark:focus:ring-offset-gray-800"
                            >
                                Click here to re-send the verification email.
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                                A new verification link has been sent to your
                                email address.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>Save</PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Saved.
                        </p>
                    </Transition>
                </div>
            </form>

            {isSupported && (
                <section className="mt-12 space-y-6 border-t border-gray-200 pt-12 dark:border-gray-700">
                    <header>
                        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Push Notifications
                        </h2>

                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Manage push notifications for real-time updates.
                        </p>
                    </header>

                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                {isSubscribed ? 'Notifications Enabled' : 'Notifications Disabled'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {isSubscribed
                                    ? 'You will receive push notifications on this device.'
                                    : 'Enable to receive push notifications.'}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={isSubscribed ? unsubscribe : requestPermission}
                            disabled={isLoading}
                            className={`rounded-lg px-4 py-2 font-medium transition ${
                                isSubscribed
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200 disabled:bg-red-50 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50'
                            }`}
                        >
                            {isLoading ? 'Loading...' : isSubscribed ? 'Disable' : 'Enable'}
                        </button>
                    </div>
                </section>
            )}
        </section>
    );
}
