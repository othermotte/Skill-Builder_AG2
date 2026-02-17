# The Mobile Stability Pattern
## Goal: Preventing Horizontal "Wobble" (Side-Scrolling) in Mobile Web Apps

This pattern solves the common issue where a mobile webpage shifts left and right while scrolling vertically, typically caused by layout elements accidentally exceeding the viewport width.

---

### 1. The Core Problem
Most mobile "wobble" is caused by two specific technical behaviors:
- **The `100vw` Trap:** `100vw` (Viewport Width) often includes the width of the vertical scrollbar. If a scrollbar appears, `100vw` becomes wider than the actual visible area, forcing a horizontal scroll.
- **Flexbox `min-width: auto`:** By default, flex items (`flex-1`, `flex-grow`) have a `min-width` of `auto`. This means they will expand to fit their content (like long strings of text or large images) even if that content is wider than the container.

---

### 2. The 3-Step Fix

#### Step 1: The Global Reset (HTML/CSS)
Do not use `100vw`. Instead, use `100%` and explicitly hide the overflow on the X-axis at the highest possible level.

```html
<style>
  html, body {
    width: 100%;
    overflow-x: hidden; /* Force horizontal containment */
    margin: 0;
    padding: 0;
    /* Prevent font-size jumping when rotating the phone */
    -webkit-text-size-adjust: 100%;
  }

  #root {
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>
```

#### Step 2: The Root Wrapper
Apply `overflow-x-hidden` to your main application wrapper to catch any "poking" children.

```tsx
const App = () => {
  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden">
      <main className="flex-grow">
        {/* Your content */}
      </main>
    </div>
  );
};
```

#### Step 3: The `min-w-0` Rule (Crucial for Flex)
Whenever you have a container using `flex-1` (or `flex-grow`) that contains text, inputs, or other nested flex items, you **MUST** add `min-w-0`. This overrides the default `min-width: auto` and allows the box to shrink to the size of the viewport rather than the size of the text.

```tsx
/* WRONG - May wobble if text is long */
<div className="flex w-full">
  <div className="flex-1">
    <p className="break-words">Long content here...</p>
  </div>
</div>

/* CORRECT - Rock solid stability */
<div className="flex w-full overflow-hidden">
  <div className="flex-1 min-w-0">
    <p className="break-words">Long content here...</p>
  </div>
</div>
```

---

### 3. Checklist for Future Apps
1. [ ] Remove all instances of `width: 100vw`. Replace with `width: 100%`.
2. [ ] Add `overflow-x: hidden` to `html` and `body`.
3. [ ] Add `min-w-0` to every container using `flex-1` or `flex-grow`.
4. [ ] Ensure text-heavy elements have `break-words` or `truncate` classes.
5. [ ] Use `max-w-full` on images to prevent them from "poking out" the side.
