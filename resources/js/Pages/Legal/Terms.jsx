import React from 'react';
import { Head, Link } from '@inertiajs/react';

import AppLayout from '@/Layouts/AppLayout';

export default function Terms() {
    return (
        <AppLayout title="Terms of Service">
            <Head title="Terms of Service" />
            <div className="max-w-4xl mx-auto space-y-12">
                <header className="space-y-4">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
                    <p className="text-gray-600 dark:text-gray-300">
                        Effective date: October 5, 2025
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                        Todo App is an open-source project. By accessing or using the application, you agree to the terms below.
                    </p>
                </header>

                <section className="space-y-3">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">1. Open Source License</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        Todo App is distributed under the MIT License. You are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software, provided that the original copyright notice and permission notice are included in all copies or substantial portions of the software.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">2. Acceptable Use</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        You agree not to use Todo App to store or transmit unlawful content, malicious code, or to infringe upon the rights of others. When self-hosting, you are solely responsible for complying with local laws and regulations.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">3. Contributions</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        Contributions to the project are welcomed. By submitting a pull request, you grant the maintainers the right to incorporate your contribution under the existing project license.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">4. No Warranty</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">5. Hosted Service</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        If you access an instance of Todo App hosted by another party, you acknowledge that they may impose additional terms. We are not responsible for how third parties operate or configure their deployments.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">6. Contact</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                        Questions about these terms can be sent to <a className="text-blue-600 dark:text-blue-400 hover:underline" href="mailto:legal@todoapp.test">legal@todoapp.test</a> or by opening an issue in our public repository.
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                        For privacy-related questions, please review our <Link href="/legal/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</Link>.
                    </p>
                </section>
            </div>
        </AppLayout>
    );
}
