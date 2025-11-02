import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { createInertiaApp } from '@inertiajs/react';
import Edit from '../../resources/js/Pages/Profile/Edit';

describe('Debug Mode Toggle', () => {
    it('renders the debug mode toggle for super admin users', () => {
        const { container } = render(
            <Edit 
                auth={{ user: { id: 1, name: 'John Doe', email: 'john@example.com', role: 'super_admin' } }}
                mustVerifyEmail={false}
                status={null}
                tokens={[]}
                new_token={null}
            />
        );

        // Check that Debug Settings card is visible
        expect(screen.getByText('Debug Settings')).toBeInTheDocument();
        
        // Check that the label exists
        expect(screen.getByText('Debug Mode')).toBeInTheDocument();
        
        // Check that the Switch component is rendered (it should have the debug-mode id)
        const switchElement = screen.getByRole('switch', { name: /debug mode/i });
        expect(switchElement).toBeInTheDocument();
    });

    it('does not render debug settings for non-super-admin users', () => {
        const { container } = render(
            <Edit 
                auth={{ user: { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' } }}
                mustVerifyEmail={false}
                status={null}
                tokens={[]}
                new_token={null}
            />
        );

        // Debug Settings should not be visible for regular users
        expect(screen.queryByText('Debug Settings')).not.toBeInTheDocument();
    });

    it('toggles debug mode and updates localStorage', () => {
        const { container } = render(
            <Edit 
                auth={{ user: { id: 1, name: 'John Doe', email: 'john@example.com', role: 'super_admin' } }}
                mustVerifyEmail={false}
                status={null}
                tokens={[]}
                new_token={null}
            />
        );

        const switchElement = screen.getByRole('switch', { name: /debug mode/i });
        
        // Initially unchecked
        expect(switchElement).not.toBeChecked();
        
        // Click to enable
        fireEvent.click(switchElement);
        
        // Should be checked after click
        expect(switchElement).toBeChecked();
        
        // Verify localStorage was updated
        expect(localStorage.getItem('zettly-debug-mode')).toBe('true');
    });

    it('shows debug enabled message when toggle is on', () => {
        const { container } = render(
            <Edit 
                auth={{ user: { id: 1, name: 'John Doe', email: 'john@example.com', role: 'super_admin' } }}
                mustVerifyEmail={false}
                status={null}
                tokens={[]}
                new_token={null}
            />
        );

        const switchElement = screen.getByRole('switch', { name: /debug mode/i });
        
        // Initially the success message should not be visible
        expect(screen.queryByText(/Debug mode enabled!/)).not.toBeInTheDocument();
        
        // Click to enable
        fireEvent.click(switchElement);
        
        // Now the success message should appear
        expect(screen.getByText(/Debug mode enabled!/)).toBeInTheDocument();
    });
});
