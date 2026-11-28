import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from './theme-provider';

/**
 * @zettly-code ZC-ZETTY-UI003-BATCH1-THEME-TOGGLE-001
 *
 * @purpose Keep the theme toggle a 44x44px touch target on phones.
 *
 * @hypothesis The icon-only toggle rendered at 40x40px, below the mobile-first minimum.
 *
 * @fix Add 44px minimum height and width to the existing Button without changing theme behavior.
 *
 * @tests resources/js/__tests__/uiBatch1.test.js
 */
export function ModeToggle() {
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="relative h-7 w-7 min-h-[44px] min-w-[44px] rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-slate-300" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
