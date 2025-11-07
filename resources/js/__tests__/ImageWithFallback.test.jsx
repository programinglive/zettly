import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ImageWithFallback from '@/Components/ImageWithFallback';

describe('ImageWithFallback Component', () => {
    it('renders image when src is provided', () => {
        render(
            <ImageWithFallback
                src="https://example.com/image.png"
                alt="Test Image"
                className="h-10 w-10"
            />
        );

        const img = screen.getByAltText('Test Image');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/image.png');
    });

    it('renders fallback when src is not provided', () => {
        const { container } = render(
            <ImageWithFallback
                alt="Test Image"
                className="h-10 w-10"
                initials="AC"
            />
        );

        const fallback = container.querySelector('div');
        expect(fallback).toBeInTheDocument();
        expect(fallback).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('renders initials in fallback', () => {
        render(
            <ImageWithFallback
                alt="Test Image"
                className="h-10 w-10"
                initials="AC"
            />
        );

        expect(screen.getByText('AC')).toBeInTheDocument();
    });

    it('renders image icon when no initials provided', () => {
        const { container } = render(
            <ImageWithFallback
                alt="Test Image"
                className="h-10 w-10"
            />
        );

        // Check for SVG icon
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });

    it('applies custom className to image', () => {
        render(
            <ImageWithFallback
                src="https://example.com/image.png"
                alt="Test Image"
                className="h-10 w-10 rounded-full"
            />
        );

        const img = screen.getByAltText('Test Image');
        expect(img).toHaveClass('h-10', 'w-10', 'rounded-full');
    });

    it('applies fallbackClassName to fallback div', () => {
        const { container } = render(
            <ImageWithFallback
                alt="Test Image"
                className="h-10 w-10"
                fallbackClassName="h-10 w-10 rounded-full"
                initials="AC"
            />
        );

        const fallback = container.querySelector('div');
        expect(fallback).toHaveClass('h-10', 'w-10', 'rounded-full');
    });

    it('shows fallback when image fails to load', async () => {
        const { container, rerender } = render(
            <ImageWithFallback
                src="https://example.com/broken.png"
                alt="Test Image"
                className="h-10 w-10"
                initials="AC"
            />
        );

        const img = screen.getByAltText('Test Image');
        
        // Simulate image load error
        img.dispatchEvent(new Event('error'));

        // Re-render to see the fallback
        rerender(
            <ImageWithFallback
                src="https://example.com/broken.png"
                alt="Test Image"
                className="h-10 w-10"
                initials="AC"
            />
        );

        // After error, should show fallback
        expect(screen.getByText('AC')).toBeInTheDocument();
    });
});
