import { describe, it } from 'node:test';
import assert from 'node:assert';

// Mock useForm functionality
const createMockUseForm = () => {
    let data = {};
    let processing = false;
    let transformFn = null;

    return {
        setData: (key, value) => {
            data[key] = value;
        },
        transform: (fn) => {
            transformFn = fn;
        },
        post: (url, options) => {
            processing = true;
            const finalData = transformFn ? transformFn() : data;
            
            // Simulate the request
            setTimeout(() => {
                processing = false;
                if (options.onSuccess) {
                    options.onSuccess();
                }
            }, 10);
            
            return Promise.resolve({ data: finalData });
        },
        reset: (key) => {
            if (key) {
                delete data[key];
            } else {
                data = {};
            }
        },
        clearErrors: () => {},
        processing,
        errors: {},
        get data() { return data; }
    };
};

describe('Todo Toggle CSRF', () => {
    it('should include CSRF token when submitting toggle reason', async () => {
        // Mock the CSRF token resolution
        const resolveCsrfToken = () => 'test-csrf-token';

        // Create mock form
        const toggleForm = createMockUseForm();
        
        // Simulate the submitReason function logic
        const submitReason = (reason) => {
            const token = resolveCsrfToken();
            toggleForm.setData('reason', reason);
            toggleForm.transform(() => ({
                reason,
                ...(token ? { _token: token } : {}),
            }));
            
            return toggleForm.post('/todos/123/toggle', {
                preserveScroll: true,
                onSuccess: () => {
                    toggleForm.reset('reason');
                    toggleForm.transform((data) => data);
                },
                onError: () => {
                    toggleForm.transform(() => ({
                        reason,
                        ...(token ? { _token: token } : {}),
                    }));
                },
                onFinish: () => {
                    toggleForm.transform((data) => data);
                },
            });
        };

        // Test the submission
        const result = await submitReason('test reason');
        
        // Verify the transformed data includes CSRF token
        const submittedData = result.data;
        assert.strictEqual(submittedData.reason, 'test reason');
        assert.strictEqual(submittedData._token, 'test-csrf-token');
    });

    it('should handle missing CSRF token gracefully', async () => {
        // Mock no CSRF token available
        const resolveCsrfToken = () => null;

        // Create mock form
        const toggleForm = createMockUseForm();
        
        // Simulate the submitReason function logic
        const submitReason = (reason) => {
            const token = resolveCsrfToken();
            toggleForm.setData('reason', reason);
            toggleForm.transform(() => ({
                reason,
                ...(token ? { _token: token } : {}),
            }));
            
            return toggleForm.post('/todos/123/toggle', {
                preserveScroll: true,
            });
        };

        // Test the submission
        const result = await submitReason('test reason');
        
        // Verify the transformed data does not include CSRF token when not available
        const submittedData = result.data;
        assert.strictEqual(submittedData.reason, 'test reason');
        assert.strictEqual(submittedData._token, undefined);
    });
});
