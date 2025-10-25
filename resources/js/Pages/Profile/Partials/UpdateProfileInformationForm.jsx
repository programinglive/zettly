import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Switch, Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useEffect } from 'react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}) {
    const user = usePage().props.auth.user;
    const {
        isSupported,
        isSubscribed,
        isLoading,
        requestPermission,
        unsubscribe,
        permission,
    } = usePushNotifications();

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const storageKey = 'zettly-notifications-dismissed';
        const previousValue = window.localStorage.getItem(storageKey);
        window.localStorage.setItem(storageKey, '1');
        window.dispatchEvent(new Event('zettly:push-prompt-dismiss'));

        return () => {
            if (previousValue === null) {
                window.localStorage.removeItem(storageKey);
            } else {
                window.localStorage.setItem(storageKey, previousValue);
                window.dispatchEvent(new Event('zettly:push-prompt-dismiss'));
            }
        };
    }, []);

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
        });

    const submit = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    const handleToggle = async (desiredState) => {
        if (isLoading) {
            return;
        }

        if (desiredState) {
            await requestPermission();
        } else {
            await unsubscribe();
        }
    };

    const permissionDenied = permission === 'denied';
    const siteHost = typeof window !== 'undefined' ? window.location.host : 'this site';

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
                            Enable push notifications on this device to receive updates even when the app is closed.
                        </p>
                    </header>

                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-slate-900">
                        <div className="space-y-1">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                {permissionDenied
                                    ? 'Notifications blocked'
                                    : isSubscribed
                                    ? 'Notifications enabled'
                                    : 'Notifications disabled'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {permissionDenied
                                    ? `Notifications are blocked in your browser settings for ${siteHost}. Update the permission and reload to enable them again.`
                                    : isSubscribed
                                    ? 'You will receive web push alerts for todos and reminders on this device.'
                                    : 'Turn on notifications to receive updates without keeping this page open.'}
                            </p>
                        </div>

                        <Switch
                            checked={isSubscribed}
                            onChange={handleToggle}
                            disabled={isLoading || permissionDenied}
                            className={`${
                                isSubscribed
                                    ? 'bg-indigo-600'
                                    : permissionDenied
                                    ? 'bg-gray-300'
                                    : 'bg-gray-200'
                            } relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed dark:focus-visible:ring-offset-slate-900`}
                        >
                            <span
                                aria-hidden="true"
                                className={`${
                                    isSubscribed ? 'translate-x-5' : 'translate-x-0'
                                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition`}
                            />
                        </Switch>
                    </div>
                </section>
            )}
        </section>
    );
}
