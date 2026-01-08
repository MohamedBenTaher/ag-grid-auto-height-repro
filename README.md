# AG Grid Auto Height Issue Reproduction

This project reproduces the specific "Zero Height" issue encountered in our production application using the **exact component structure** (`AgGridTable` + `EntryAgGridTable`).

## Description
The issue occurs when `domLayout='autoHeight'` is used in a grid that is:
1.  Initialized inside a hidden container (e.g., `display: none` via Accordion/Tab).
2.  Populated with data asynchronously while still hidden.
3.  Subsequently revealed.

In production builds, the grid often calculates a height of 0 or renders incorrectly until a window resize event is triggered.

## Components Included
*   **`AgGridTable.tsx`**: Our wrapper component that handles `domLayout` and resizing logic (including `ResizeObserver`).
*   **`EntryAgGridTable.tsx`**: The specific business logic component where we see the issue.
*   **Styles**: Original `AgGridTable.css` and theme configuration.

## Steps to Reproduce
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Run the dev server:
    ```bash
    npm run dev
    ```
    *(Or build for production simulation: `npm run build && npm run preview`)*

3.  **In the App:**
    *   **Do NOT** click "Show Container" yet.
    *   Click **"Load Data (Async)"**. Wait 1-2 seconds for data to "load" (simulated).
    *   Now click **"Show Container"**.
    *   **Observe**: The grid may appear with 0 height or missing rows.

## Expected Behavior
The grid should automatically resize to fit its content (Auto Height) immediately upon becoming visible.
