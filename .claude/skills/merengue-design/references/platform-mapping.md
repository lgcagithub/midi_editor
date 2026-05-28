# Merengue — Platform Mapping

## 1. HTML / CSS / WEB

### Font Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500&family=JetBrains+Mono:wght@400&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700&display=swap" rel="stylesheet">
```

### CSS Custom Properties — Dark Mode (Primary)

```css
:root {
  /* Colors */
  --background: #1A1819;
  --bg: var(--background);
  --surface1: #242223;
  --surface2: #2E2927;
  --surface3: #423B38;
  --border: #2E2927;
  --border-visible: #423B38;
  --text1: #FAF9F8;
  --text2: #A89D96;
  --text3: #7A706A;
  --text4: #5C5450;
  --accent: #FF6E82;
  --accent-subtle: #3D0D17;
  --success: #4BC0A0;
  --success-bg: #0F2E28;
  --warning: #F4A742;
  --warning-bg: #2E2412;
  --error: #E5484D;
  --error-bg: #2E1515;

  /* Fonts */
  --font-display: "Fredoka", "Segoe UI", "Noto Sans SC", sans-serif;
  --font-body: "Nunito Sans", "Segoe UI", "Noto Sans SC", sans-serif;
  --font-mono: "JetBrains Mono", "Consolas", "Courier New", monospace;

  /* Type Scale */
  --text-display: 36px;
  --text-h1: 28px;
  --text-h2: 22px;
  --text-h3: 18px;
  --text-body: 14px;
  --text-body-sm: 12px;
  --text-caption: 11px;
  --text-label: 10px;

  /* Spacing */
  --space-2xs: 2px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
  --space-4xl: 96px;

  /* Radii */
  --radius-element: 4px;
  --radius-control: 8px;
  --radius-component: 12px;
  --radius-container: 16px;
  --radius-pill: 999px;

  /* Motion */
  --ease-micro: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-standard: cubic-bezier(0.34, 1.3, 0.64, 1);
  --ease-emphasis: cubic-bezier(0.32, 1.2, 0.64, 1);
  --duration-micro: 150ms;
  --duration-standard: 250ms;
  --duration-emphasis: 400ms;

  /* Shadows */
  --shadow-1: 0 1px 2px rgba(0,0,0,0.20), 0 1px 4px rgba(0,0,0,0.30);
  --shadow-2: 0 2px 8px rgba(0,0,0,0.30), 0 4px 16px rgba(0,0,0,0.20);
  --shadow-3: 0 4px 16px rgba(0,0,0,0.40), 0 8px 32px rgba(0,0,0,0.30);

  /* MIDI Note Colors */
  --note-coral: #FF5C72;
  --note-tangerine: #FFB347;
  --note-sky: #7EC8E3;
  --note-lavender: #C3A6F4;
  --note-mint: #4BC0A0;
  --note-peach: #FF8A80;
  --note-lemon: #FFE566;
  --note-lilac: #D4A5F6;
}
```

### Light Mode

```css
[data-theme="light"] {
  --background: #FAF9F8;
  --bg: var(--background);
  --surface1: #F5F2F0;
  --surface2: #E8E3DF;
  --surface3: #D4CDC7;
  --border: #E8E3DF;
  --border-visible: #D4CDC7;
  --text1: #242223;
  --text2: #5C5450;
  --text3: #7A706A;
  --text4: #A89D96;
  --accent: #FF5C72;
  --accent-subtle: #FFF0F2;
  --success: #4BC0A0;
  --success-bg: #F0FDF6;
  --warning: #F4A742;
  --warning-bg: #FFFBF0;
  --error: #E5484D;
  --error-bg: #FEF2F2;
  --shadow-1: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06);
  --shadow-2: 0 2px 8px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
  --shadow-3: 0 4px 16px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.04);
}
```

### Base Reset

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--text1);
  background: var(--background);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Focus ring */
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

/* Selection */
::selection {
  background: var(--accent-subtle);
  color: var(--text1);
}
```

---

## 2. REACT / TAILWIND

### tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: {
          1: "var(--surface1)",
          2: "var(--surface2)",
          3: "var(--surface3)",
        },
        border: {
          DEFAULT: "var(--border)",
          visible: "var(--border-visible)",
        },
        text: {
          1: "var(--text1)",
          2: "var(--text2)",
          3: "var(--text3)",
          4: "var(--text4)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          subtle: "var(--accent-subtle)",
        },
        success: {
          DEFAULT: "var(--success)",
          bg: "var(--success-bg)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          bg: "var(--warning-bg)",
        },
        error: {
          DEFAULT: "var(--error)",
          bg: "var(--error-bg)",
        },
        note: {
          coral: "var(--note-coral)",
          tangerine: "var(--note-tangerine)",
          sky: "var(--note-sky)",
          lavender: "var(--note-lavender)",
          mint: "var(--note-mint)",
          peach: "var(--note-peach)",
          lemon: "var(--note-lemon)",
          lilac: "var(--note-lilac)",
        },
      },
      fontFamily: {
        display: ["Fredoka", "Segoe UI", "Noto Sans SC", "sans-serif"],
        body: ["Nunito Sans", "Segoe UI", "Noto Sans SC", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "Courier New", "monospace"],
      },
      fontSize: {
        display: ["36px", { lineHeight: "1.15", letterSpacing: "-0.01em", fontWeight: "500" }],
        h1: ["28px", { lineHeight: "1.2", letterSpacing: "-0.005em", fontWeight: "500" }],
        h2: ["22px", { lineHeight: "1.25", fontWeight: "600" }],
        h3: ["18px", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["14px", { lineHeight: "1.5" }],
        "body-sm": ["12px", { lineHeight: "1.5" }],
        caption: ["11px", { lineHeight: "1.4", letterSpacing: "0.01em" }],
        label: ["10px", { lineHeight: "1.3", letterSpacing: "0.03em", fontWeight: "700" }],
      },
      spacing: {
        "2xs": "2px",
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
        "3xl": "64px",
        "4xl": "96px",
      },
      borderRadius: {
        element: "4px",
        control: "8px",
        component: "12px",
        container: "16px",
        pill: "999px",
      },
      transitionTimingFunction: {
        micro: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        standard: "cubic-bezier(0.34, 1.3, 0.64, 1)",
        emphasis: "cubic-bezier(0.32, 1.2, 0.64, 1)",
      },
      transitionDuration: {
        micro: "150ms",
        standard: "250ms",
        emphasis: "400ms",
      },
      boxShadow: {
        1: "0 1px 2px rgba(0,0,0,0.20), 0 1px 4px rgba(0,0,0,0.30)",
        2: "0 2px 8px rgba(0,0,0,0.30), 0 4px 16px rgba(0,0,0,0.20)",
        3: "0 4px 16px rgba(0,0,0,0.40), 0 8px 32px rgba(0,0,0,0.30)",
      },
    },
  },
  plugins: [],
};
```

### Font Loading

Load fonts via Google Fonts `<link>` tag in the HTML `<head>` (see Section 1 above) or via `@fontsource` packages:

```bash
npm install @fontsource/fredoka @fontsource/nunito-sans @fontsource/jetbrains-mono
```

```js
import "@fontsource/fredoka/500.css";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/600.css";
import "@fontsource/nunito-sans/700.css";
import "@fontsource/jetbrains-mono/400.css";
```

### CSS Variables

Include the `:root` CSS custom properties from Section 1 in your global stylesheet (`globals.css` or `index.css`). The Tailwind config references these via `var(--token-name)` for automatic dark/light mode support.
