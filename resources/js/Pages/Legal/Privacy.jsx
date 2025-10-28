import React from 'react';
import { Head, Link } from '@inertiajs/react';

import AppLayout from '@/Layouts/AppLayout';

export default function Privacy() {
    return (
        <AppLayout title="Privacy Policy">
            <Head title="Privacy Policy" />
            <div className="max-w-4xl mx-auto space-y-12">
                <header className="space-y-4">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
                    <p className="text-gray-600 dark:text-gray-300">
                        Effective date: October 5, 2025
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                        Zettly is open source. This policy describes how data is handled when you self-host or contribute to the project.
                    </p>
                </header>

                <section className="space-y-3">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">1. Self-Hosted Instances</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        If you deploy Zettly on your own infrastructure, you control all collected data. The project maintainers do not receive telemetry or analytics from self-hosted installations. Protecting user data in your deployment is your responsibility.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">2. Data We Receive</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        When you interact with our public repository, we may receive information such as your GitHub profile and contribution history. This data is governed by GitHub’s privacy policy and is used only to maintain project collaboration.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">3. Cookies and Analytics</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        The open-source project does not include third-party analytics or advertising scripts by default. Administrators of hosted instances may add their own analytics; consult their privacy policies for more information.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">4. Security</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        We aim to provide secure defaults. However, security updates and server hardening for self-hosted instances remain your responsibility. Report security issues by emailing <a className="text-blue-600 dark:text-blue-400 hover:underline" href="mailto:security@programinglive.com">security@programinglive.com</a>.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">5. Rights and Choices</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        Because Zettly is open source, you can inspect, modify, or delete data stored in your own instance at any time. If you use a third-party hosted instance, contact that operator directly to exercise any data rights they provide.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">6. Updates</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        We may update this policy to reflect new features or legal requirements. Changes will be documented in the project repository with a revision history. Material updates will reference the effective date at the top of this page.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">7. Contact</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        For questions related to privacy, contact <a className="text-blue-600 dark:text-blue-400 hover:underline" href="mailto:mahatma.mahardhika@programinglive.com">mahatma.mahardhika@programinglive.com</a> or open an issue in our repository. You can also review the <Link href="/legal/terms" className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</Link> for licensing information.
                    </p>
                </section>
            </div>
        </AppLayout>
    );
}
