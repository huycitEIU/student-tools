# CSS Organization Guide

## Overview

The stylesheets have been reorganized from a single monolithic `style.css` into a modular structure for better maintainability and scalability.

## Directory Structure

```
src/
├── styles/
│   ├── index.css                    # Main CSS index (imports all other files)
│   ├── base.css                     # Global & base styles
│   └── tools/
│       ├── weather.css              # Weather Tool
│       ├── notes.css                # Notes Tool
│       ├── dictionary.css           # Dictionary Tool
│       ├── random.css               # Random Tool
│       ├── timer.css                # Study Timer Tool
│       ├── courseCalculator.css     # Course Calculator Tool
│       ├── unitConverter.css        # Unit Converter Tool
│       ├── timetable.css            # My Timetable Tool (Timetable)
│       ├── moneyManagement.css      # Money Management Tool
│       ├── gradeScale.css           # Grade Scale Tool
│       ├── studentPlanner.css       # Student Planner Tool
│       └── qrGenerator.css          # QR Generator Tool
├── main.js                          # Updated to import from styles/index.css
└── [other files...]
```

## File Descriptions

### `base.css`
Contains all global and base styles:
- CSS variables and root styling
- Topbar styles
- Layout (sidebar, content area)
- Common card and button styles
- Form elements
- Tables
- Mobile responsive base styles

### Tool-Specific CSS Files

Each tool has its own CSS file in `src/styles/tools/`:

#### `weather.css`
- Weather search and display components
- Weather cards and metrics
- Weather summary and dashboard layouts

#### `notes.css`
- Note editor and toolbar
- Note card display
- Note list management

#### `dictionary.css`
- Dictionary search functionality
- Dictionary entry and meaning cards

#### `random.css`
- Random generator inputs
- Random result display
- Modal popup styles
- Random popup dialog

#### `timer.css`
- Timer display and controls
- Timer presets
- Custom time input

#### `courseCalculator.css`
- Course title input
- Course row layouts
- Grade calculation inputs

#### `unitConverter.css`
- Converter grid layout
- Unit selection dropdowns
- Conversion input/output

#### `timetable.css`
- Timetable grid layout
- Day headers and time cells
- Event cells and selections
- Timetable toolbar and editor

#### `moneyManagement.css`
- Currency selector
- Tab navigation
- Summary cards
- Money forms and lists
- Budget tracking and progress bars
- Income/Expense items

#### `gradeScale.css`
- Placeholder for grade scale specific styles
- Currently uses base styles

#### `studentPlanner.css`
- Placeholder for student planner specific styles
- Currently uses base styles

#### `qrGenerator.css`
- QR generator layout, preview, and download controls
- Responsive two-column form and preview layout

## How It Works

### Import Chain
1. `main.js` imports `styles/index.css`
2. `styles/index.css` imports:
   - `base.css` (first, for foundational styles)
   - All tool-specific CSS files in order
3. Browser loads all styles in the correct order

### CSS Cascade
- Base styles provide foundation (colors, spacing, typography)
- Tool-specific files build on base styles
- More specific selectors override base styles where needed
- Mobile responsive breakpoints are defined in each file

## Adding a New Tool

When adding a new tool:

1. **Create a new CSS file** in `src/styles/tools/` named after the tool:
   ```
   src/styles/tools/myNewTool.css
   ```

2. **Add import to index.css**:
   ```css
   @import url('./tools/myNewTool.css');
   ```

3. **Add styles following this template**:
   ```css
   /* ============================================
      MY NEW TOOL STYLES
      ============================================ */
   
   .my-tool-class {
     /* styles */
   }
   
   /* My New Tool - Responsive */
   @media (max-width: 700px) {
     .my-tool-class {
       /* mobile styles */
     }
   }
   ```

## Modifying Existing Styles

### To modify a tool's styles:
1. Open the corresponding file in `src/styles/tools/`
2. Make your changes
3. No need to modify other files

### To modify global/base styles:
1. Open `src/styles/base.css`
2. Update the relevant section
3. Changes apply to all tools

## Best Practices

1. **Keep related styles together** - Group selectors and related media queries
2. **Use consistent naming** - Follow the pattern used in existing files
3. **Add comments** - Use section headers and comments for clarity
4. **Mobile first** - Define mobile styles in media queries at the end of each tool file
5. **Don't over-nest** - Keep CSS selectors simple and maintainable

## Responsive Breakpoints

Currently using:
- `700px` - Main mobile breakpoint
- `1200px` - Medium/tablet breakpoint (used in some tools)

## Color Palette Reference

From `base.css`:

```css
:root {
  --primary: #1d4ed8;
  --primary-dark: #1e40af;
  --light-bg: #eef2f7;
  --white: #ffffff;
  --text-dark: #0f172a;
  --text-light: #64748b;
  --border: #dbe2ea;
  --border-light: #cbd5e1;
  --success: #16a34a;
  --error: #dc2626;
  --background: #f8fafc;
}
```

## Performance Considerations

- Individual CSS files are minified when building for production
- CSS is loaded in order, so base styles don't interfere with tool styles
- Each tool's styles are properly scoped with class prefixes
- No unused styles are loaded for inactive tools

## Troubleshooting

### Styles not applying?
1. Check that the tool CSS file is imported in `index.css`
2. Verify the import path is correct
3. Check CSS selector specificity

### Import order issues?
- Base styles must be loaded first
- Tool imports should not conflict
- Use specific class selectors to avoid cascade issues

### Mobile styles not working?
- Ensure media queries are at the end of the file
- Check breakpoint value (700px or 1200px)
- Test in browser DevTools responsive mode

---

**Last Updated**: April 2026
**Maintainer Notes**: This modular structure makes it easy to:
- Find and modify specific tool styles
- Add new tools without editing global CSS
- Maintain consistent design system
- Scale the application with new tools
