
export const MOBILE_STABILITY_GUIDE = `# The Mobile Stability Pattern
## Goal: Preventing Horizontal "Wobble" (Side-Scrolling) in Mobile Web Apps

This pattern solves the common issue where a mobile webpage shifts left and right while scrolling vertically, typically caused by layout elements accidentally exceeding the viewport width.

---

### 1. The Core Problem
Most mobile "wobble" is caused by two specific technical behaviors:
- **The \`100vw\` Trap:** \`100vw\` (Viewport Width) often includes the width of the vertical scrollbar. If a scrollbar appears, \`100vw\` becomes wider than the actual visible area, forcing a horizontal scroll.
- **Flexbox \`min-width: auto\`:** By default, flex items (\`flex-1\`, \`flex-grow\`) have a \`min-width\` of \`auto\`. This means they will expand to fit their content (like long strings of text or large images) even if that content is wider than the container.

---

### 2. The 3-Step Fix

#### Step 1: The Global Reset (HTML/CSS)
Do not use \`100vw\`. Instead, use \`100%\` and explicitly hide the overflow on the X-axis at the highest possible level.

#### Step 2: The Root Wrapper
Apply \`overflow-x-hidden\` to your main application wrapper to catch any "poking" children.

#### Step 3: The \`min-w-0\` Rule (Crucial for Flex)
Whenever you have a container using \`flex-1\` (or \`flex-grow\`) that contains text, inputs, or other nested flex items, you **MUST** add \`min-w-0\`. This overrides the default \`min-width: auto\` and allows the box to shrink to the size of the viewport rather than the size of the text.
`;

export const ARCHITECTURE_GUIDE = `# Leadership Skills Lab: Architecture Summary

### 1. The "Dual-Brain" AI Strategy (Google Gemini API)
*   **The Actor (Gemini 2.5 Flash Native Audio):** Handles live, low-latency voice interaction. This allows for realistic role-play with characters like Alex.
*   **The Coach (Gemini 3 Pro):** Analyzes the full conversation transcript against specific rubrics. It identifies missing micro-skills from the 80+ skill hierarchy.

### 2. The "Memory Layer" (Personalization)
*   **Executive Summaries:** Each completed session generates a dense summary of the learner's behavior.
*   **Contextual Injection:** Future sessions can inject these summaries into the AI's system instructions, allowing the facilitator to say things like, "I noticed in your previous challenge that you prioritized speed over ethics; how are you thinking about that balance today?"

### 3. The Capability Pathway
*   **Assessment -> Insight:** Phase 1 (Assessor Labs) surfaces hidden judgment patterns.
*   **Insight -> Action:** Post-session analysis identifies "Micro-Skill Gaps" (e.g., *Reframing Resistance*).
*   **Action -> Mastery:** The UI prompts the learner to enter specific Simulation Labs (like the Alex roleplay) to practice the identified gap.
*   **Continuous Loop:** Mastery is tracked in Firestore, adjusting the 80-skill hierarchy progress.

### 4. Data Infrastructure
*   **Auth & Firestore:** Securely manages user identity and stores the session history, including transcripts and structured rubric JSON.
`;
