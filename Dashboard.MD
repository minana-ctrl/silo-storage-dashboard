# Project Specification: Silo Storage Dashboard

## 1. Project Context
**App Name:** Silo Storage AI Assistant Dashboard
**Description:** A high-performance internal dashboard for monitoring AI agent analytics and reviewing conversation logs.
**Visual Identity:** Futuristic, high-contrast, clean SaaS interface.
**Reference Style:** Based on "ChatDash" layout but fully customized to Silo Storage branding.

## 2. Design System & Theming
*Cursor, please enforce the following design tokens strictly:*

### A. Color Palette
*   **Primary Brand:** `#ec2f2f` (Vibrant Red) - Used for primary buttons, active states, key metrics, and call-to-actions.
*   **Secondary/Base:** `#000000` (Black) - Used for sidebar, high-contrast text, and footer elements.
*   **Backgrounds:** `#ffffff` (White) - Main content area, cards, and input fields.
*   **Text Hierarchy:**
    *   Headings: Black or Red.
    *   Body: Dark Gray (`#333333`) for readability.
    *   Muted: Light Gray (`#9ca3af`) for labels.

### B. Typography
*   **Headings (h1, h2, h3, Metrics):** `Robostic-Futuristic-Font`
    *   *Note:* Use for all page titles, card values (e.g., the big numbers), and navigation headers.
*   **Body Copy:** `Metropolis`
    *   *Note:* Use for all standard text, conversation logs, and table data.

### C. UI Component Styling
*   **Buttons:** Solid Red (`#ec2f2f`) background, White text, rounded corners (4px).
*   **Cards:** White background, subtle border (`1px solid #e5e5e5`), minimal shadow.
*   **Charts:**
    *   Line 1 (Current Period): `#ec2f2f` (Red).
    *   Line 2 (Previous Period): `#000000` (Black) or Grey.

---

## 3. Architecture & Navigation

### Global Sidebar (Left)
*   **Width:** Fixed (e.g., 250px).
*   **Background:** `#000000` (Black) or very light grey depending on contrast preference (Prefer White with Black text for clean look, or Black with White text for bold look).
*   **Logo:** Silo Storage Logo (Top Left).
*   **Menu Items:**
    1.  **Analytics** (Active state: Red text or Red left-border).
    2.  **Conversations**
    3.  Knowledge Base
    4.  Topics
    5.  Agent Settings
*   **Footer:** User Profile (Avatar + Name).

---

## 4. Page Specifications

### PAGE 1: Analytics
**Layout:** Grid-based dashboard.

**1. Header Control:**
*   Title: "Analytics"
*   Time Filter Dropdown: [Last 7 days, 14 days, 30 days, 90 days]

**2. Key Metric Cards (Row 1)**
*   *Design:* White card, Number in `Robostic-Futuristic-Font` (Red), Label in `Metropolis`.
*   **Total Conversations:** Display Count + % Change.
*   **Incoming Messages:** Display Count + % Change.
*   **Average Interactions:** Display Count.
*   **Unique Users:** Display Count.

**3. Visualizations (Row 2)**
*   *Library:* Recharts (React) or similar.
*   **Graph 1: Conversations over Time**
    *   Type: Spline Area or Line Chart.
    *   Style: Red line gradient.
*   **Graph 2: Incoming Messages over Time**
    *   Type: Spline Area or Line Chart.
    *   Style: Black/Grey line gradient.

---

### PAGE 2: Conversations
**Layout:** 3-Column "Master-Detail" View.

**Column 1: Conversation List (Left - 25% width)**
*   **Search:** "Search user..." input.
*   **Filter:** "Last 7 days" + Filter Icon + Export Icon.
*   **List Item:**
    *   User Name ("New User").
    *   Platform Icon (Web/WhatsApp).
    *   Timestamp.
    *   *State:* Selected item highlights with Red border or light Red bg.

**Column 2: Chat Interface (Center - 50% width)**
*   **Header:** Current User ID.
*   **Tags:** [Join Discord] [Roadmap] (Pill shapes).
*   **Message Area:**
    *   **AI Message:** White bubble, Grey border.
    *   **User Message:** Red (`#ec2f2f`) bubble, White text.
*   **Input Placeholder:** "What is ChatDash?" (Read-only view mostly).

**Column 3: Inspector / Details (Right - 25% width)**
*   **Header:** "Actions"
*   **Toggles:**
    *   Intent Confidence (Switch).
    *   Debug Messages (Switch).
*   **Note Input:** "Leave a note" textarea.

---

## 5. Integration Details
**Configuration Keys (Environment Variables):**

PROJECT_ID: 68792d2878b4da6819beed13
VERSION_ID`: 68792d2878b4da6819beed14
API_KEY`: VF.DM.6900af41a4313f954735f12b.7aOTRQv8N76ZUXTV
