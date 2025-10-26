import * as React from 'react';
import * as DrawerPrimitive from '@radix-ui/react-dialog';

import { cn } from '../../utils';

const Drawer = DrawerPrimitive.Root;

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef(function DrawerOverlay(
    { className, ...props },
    ref
) {
    return (
        <DrawerPrimitive.Overlay
            ref={ref}
            className={cn(
                'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in',
                className
            )}
            {...props}
        />
    );
});

const DrawerContent = React.forwardRef(function DrawerContent(
    { className, children, side = 'right', ...props },
    ref
) {
    return (
        <DrawerPortal>
            <DrawerOverlay />
            <DrawerPrimitive.Content
                ref={ref}
                className={cn(
                    'fixed z-50 flex h-full flex-col bg-white shadow-lg transition ease-in-out dark:bg-slate-900 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-200',
                    side === 'right' && 'inset-y-0 right-0 w-full border-l border-gray-200 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-lg',
                    side === 'left' && 'inset-y-0 left-0 w-full border-r border-gray-200 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-lg',
                    side === 'top' && 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
                    side === 'bottom' && 'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
                    className
                )}
                {...props}
            >
                {children}
            </DrawerPrimitive.Content>
        </DrawerPortal>
    );
});

const DrawerHeader = React.forwardRef(function DrawerHeader({ className, ...props }, ref) {
    return (
        <div
            ref={ref}
            className={cn('grid gap-2 pb-4 text-center sm:text-left', className)}
            {...props}
        />
    );
});

const DrawerFooter = React.forwardRef(function DrawerFooter({ className, ...props }, ref) {
    return (
        <div
            ref={ref}
            className={cn('mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
            {...props}
        />
    );
});

const DrawerTitle = React.forwardRef(function DrawerTitle({ className, ...props }, ref) {
    return (
        <DrawerPrimitive.Title
            ref={ref}
            className={cn('text-lg font-semibold text-gray-900 dark:text-slate-100', className)}
            {...props}
        />
    );
});

const DrawerDescription = React.forwardRef(function DrawerDescription({ className, ...props }, ref) {
    return (
        <DrawerPrimitive.Description
            ref={ref}
            className={cn('text-sm text-gray-500 dark:text-slate-400', className)}
            {...props}
        />
    );
});

const DrawerBody = React.forwardRef(function DrawerBody({ className, ...props }, ref) {
    return (
        <div
            ref={ref}
            className={cn('flex-1 overflow-y-auto', className)}
            {...props}
        />
    );
});

export {
    Drawer,
    DrawerTrigger,
    DrawerPortal,
    DrawerOverlay,
    DrawerContent,
    DrawerClose,
    DrawerHeader,
    DrawerFooter,
    DrawerTitle,
    DrawerDescription,
    DrawerBody,
};
