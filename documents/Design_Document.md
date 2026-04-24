# Design Document: The MediWeb Visual Philosophy

## 1. Design Vision
MediWeb is designed to feel like a **"Premium Operating System for Healthcare."** We moved away from the sterile, boring white-and-blue look of typical medical software and embraced a "Dark Mode First" aesthetic that is easier on the eyes during long clinical shifts.

---

## 2. Visual Language

### 2.1 Glassmorphism & Depth
*   **Frosted Glass Panels**: Using semi-transparent backgrounds with background-blur effects to create a sense of layers and hierarchy.
*   **Subtle Shadows**: Components "float" over the background, making the interface feel modern and airy.
*   **Vibrant Accents**: We use **Emerald Green** for health/success, **Indigo** for technology, and **Amber** for critical alerts.

### 2.2 Typography
*   **Primary Font**: *Outfit* or *Inter* – Clean, geometric sans-serif fonts that provide excellent readability for clinical notes and data tables.
*   **Hierarchy**: Large, bold headings for sections and small, uppercase tracking for metadata to keep the interface organized.

---

## 3. User Experience (UX) Principles

### 3.1 Zero-Refresh Interaction
The app is built as a "Single Page Application." Navigating between a patient report and the inventory settings happens instantly. Real-time updates (like a supplier accepting an order) appear immediately without the user having to click "Reload."

### 3.2 Contextual UI
*   **Role-Based Views**: A Doctor sees a clinical interface; a Supplier sees a logistics interface. We hide complexity that isn't relevant to the current user.
*   **Quick Action Hubs**: Frequent tasks (like booking a patient or logging stock) are always 1-2 clicks away via floating modals or sidebars.

---

## 4. Key Components

### 4.1 The Dashboard "Pulse"
A centralized area showing real-time stats. It uses progress bars and badges to show "Inventory Health" at a glance.

### 4.2 The Clinical Canvas
The patient report page is designed like a digital notebook. It auto-saves every few seconds, so doctors never lose their work, even if they accidentally close the tab.

### 4.3 Supplier Map/List
Suppliers are presented with regional tags. The UI automatically highlights suppliers in the same city as the clinic to encourage local logistics.

---

## 5. Accessibility
*   **High Contrast**: Even in dark mode, text ratios meet AAA standards for readability.
*   **Interactive Feedback**: Buttons and inputs have distinct "Hover" and "Active" states (subtle glow or scale changes) to confirm user actions.
