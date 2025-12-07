# Zettly Design System: Two-Color Mode

## Overview

Zettly implements a strict two-color design system using ONLY black, white, and gray colors throughout the entire application. This monochromatic approach ensures visual consistency, reduces cognitive load, and creates a clean, professional interface.

## Color Palette

### Primary Colors
- **Black**: `#000000` - Primary text, borders, dark elements
- **White**: `#FFFFFF` - Backgrounds, light text, overlays

### Gray Scale
- `gray-50` (`#F9FAFB`) - Lightest backgrounds
- `gray-100` (`#F3F4F6`) - Subtle backgrounds
- `gray-200` (`#E5E7EB`) - Disabled states, subtle borders
- `gray-300` (`#D1D5DB`) - Standard borders, outline buttons
- `gray-400` (`#9CA3AF`) - Placeholder text, subtle icons
- `gray-500` (`#6B7280`) - Secondary text, light buttons
- `gray-600` (`#4B5563`) - Standard buttons, primary text
- `gray-700` (`#374151`) - Dark buttons, emphasis text
- `gray-800` (`#1F2937`) - Primary actions, dark elements
- `gray-900` (`#111827`) - Darkest elements, strong emphasis

## Component Guidelines

### Buttons

#### Primary Actions
```jsx
className="bg-gray-800 hover:bg-gray-900 text-white font-medium transition-colors"
```

#### Secondary Actions
```jsx
className="bg-gray-600 hover:bg-gray-700 text-white font-medium transition-colors"
```

#### Outline Actions
```jsx
className="border border-gray-300 text-gray-600 hover:bg-gray-100 font-medium transition-colors"
```

#### Destructive Actions
```jsx
className="border border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-100 font-medium transition-colors"
```

### Status Messages

#### Error States
```jsx
className="bg-gray-200 text-gray-900 border border-gray-300 px-3 py-2 rounded-lg"
```

#### Success States
```jsx
className="bg-gray-700 text-white px-3 py-2 rounded-lg"
```

#### Warning States
```jsx
className="bg-gray-300 text-gray-900 px-3 py-2 rounded-lg"
```

### Form Elements

#### Inputs
```jsx
className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-gray-500 focus:ring-gray-500"
```

#### Labels
```jsx
className="text-sm font-medium text-gray-700 dark:text-gray-300"
```

### Navigation

#### Active States
```jsx
className="bg-gray-800 text-white"
```

#### Hover States
```jsx
className="hover:bg-gray-100 dark:hover:bg-gray-800"
```

## Dark Mode Implementation

### Background Colors
- Primary: `dark:bg-gray-900`
- Secondary: `dark:bg-gray-800`
- Tertiary: `dark:bg-gray-700`

### Text Colors
- Primary: `dark:text-white`
- Secondary: `dark:text-gray-300`
- Tertiary: `dark:text-gray-400`

### Border Colors
- Primary: `dark:border-gray-700`
- Secondary: `dark:border-gray-600`
- Tertiary: `dark:border-gray-500`

## Prohibited Colors

The following colors are **STRICTLY PROHIBITED** in all UI components:
- Red (`red-*`, `#FF*`)
- Blue (`blue-*`, `#00*`, `#0000FF`)
- Green (`green-*`, `#00FF*`)
- Yellow (`yellow-*`, `#FF*`)
- Orange (`orange-*`, `#FFA*`)
- Purple (`purple-*`, `#933*`)
- Pink (`pink-*`, `#EC*`)
- Indigo (`indigo-*`, `#636*`)
- Any other colored elements

## AI Development Guidelines

### For AI Assistants
1. **Always** use gray scale colors for UI elements
2. **Never** suggest colored buttons, badges, or status indicators
3. **Replace** color-based status with gray intensity variations
4. **Use** semantic meaning through typography and spacing instead of color
5. **When unsure**, default to gray-600/gray-700 combinations

### Code Review Checklist
- [ ] No colored Tailwind classes (red-*, blue-*, green-*, etc.)
- [ ] All buttons use gray scale colors
- [ ] Error states use gray backgrounds, not red
- [ ] Success states use gray backgrounds, not green
- [ ] Warning states use gray backgrounds, not yellow
- [ ] Icons are black, white, or gray only
- [ ] Borders use gray colors only

## Implementation Examples

### Focus Greeting Component
```jsx
// Complete Focus Button
<button className="bg-gray-800 hover:bg-gray-900 text-white">
  Complete Focus
</button>

// Delete Button
<button className="border border-gray-300 text-gray-600 hover:bg-gray-100">
  Delete
</button>

// Edit Icon (inline)
<button className="text-gray-400 hover:text-gray-600">
  <Edit className="w-4 h-4" />
</button>
```

### Eisenhower Matrix
```jsx
// Quadrant Headers
<div className="bg-gray-800 text-white p-4">
  <h3>Q1: Do First</h3>
</div>

// Task Cards
<div className="bg-white border-gray-200 p-3">
  <h4 className="text-gray-900">Task Title</h4>
</div>
```

### Kanban Board
```jsx
// Column Headers
<div className="bg-gray-700 text-white p-4">
  <h3>Q2: Schedule</h3>
</div>

// Task Cards
<div className="bg-gray-50 border-gray-300">
  <p className="text-gray-700">Task content</p>
</div>
```

## Testing Guidelines

### Visual Testing
- Verify all UI elements use only black, white, and gray
- Check contrast ratios meet accessibility standards
- Test in both light and dark modes
- Ensure no color bleed from external dependencies

### Automated Testing
- Include color checks in component tests
- Verify no prohibited color classes in CSS
- Test dark mode transitions
- Validate accessibility compliance

## Migration Guide

When updating existing components:
1. Replace all colored classes with gray equivalents
2. Update semantic color meanings to use typography/spacing
3. Test dark mode compatibility
4. Verify accessibility standards
5. Update documentation

## Conclusion

This two-color Bauhaus-inspired design system creates a clean, focused, and professional interface that reduces visual noise and cognitive load. All developers and AI assistants must strictly adhere to these guidelines to maintain consistency across the Zettly application.
