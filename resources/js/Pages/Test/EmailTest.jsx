import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Textarea } from '@/Components/ui/textarea';

export default function EmailTest({ defaults = {}, flash = {} }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        recipient: defaults.recipient ?? '',
        subject: defaults.subject ?? 'Zettly Test Email',
        message: 'Hello from Zettly!\n\nThis is a test email triggered from the development tools page.',
    });

    const handleSubmit = (event) => {
        event.preventDefault();
        post(route('test.email.send'), {
            preserveScroll: true,
            onSuccess: () => {
                reset({
                    recipient: data.recipient,
                    subject: data.subject,
                    message: data.message,
                });
            },
        });
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Head title="Email Test" />

            <div className="max-w-3xl mx-auto py-10 px-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900">Email Test</h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Use this tool to dispatch a simple email using the configured mail driver. Only super administrators can access this page.
                    </p>
                </div>

                {flash.success && (
                    <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        {flash.success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
                    <div>
                        <InputLabel htmlFor="recipient" value="Recipient email" />
                        <TextInput
                            id="recipient"
                            type="email"
                            value={data.recipient}
                            onChange={(event) => setData('recipient', event.target.value)}
                            className="mt-1 block w-full"
                            required
                            autoComplete="email"
                        />
                        {errors.recipient && <p className="mt-2 text-sm text-red-600">{errors.recipient}</p>}
                    </div>

                    <div>
                        <InputLabel htmlFor="subject" value="Subject" />
                        <TextInput
                            id="subject"
                            type="text"
                            value={data.subject}
                            onChange={(event) => setData('subject', event.target.value)}
                            className="mt-1 block w-full"
                            required
                        />
                        {errors.subject && <p className="mt-2 text-sm text-red-600">{errors.subject}</p>}
                    </div>

                    <div>
                        <InputLabel htmlFor="message" value="Message" />
                        <Textarea
                            id="message"
                            value={data.message}
                            onChange={(event) => setData('message', event.target.value)}
                            className="mt-1 block w-full"
                            rows={6}
                            required
                        />
                        {errors.message && <p className="mt-2 text-sm text-red-600">{errors.message}</p>}
                    </div>

                    <div className="flex justify-end">
                        <PrimaryButton type="submit" disabled={processing}>
                            {processing ? 'Sending…' : 'Send test email'}
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </div>
    );
}
