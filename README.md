
# SCADA Assistant: An AI-Powered Industrial Intelligence Platform

## Complete Project Audit & Final Documentation

This document serves as the final audit and comprehensive documentation for the SCADA Assistant application. The project is a modern, AI-powered web platform designed to provide monitoring, analysis, and reporting on Supervisory Control and Data Acquisition (SCADA) system data. It features a robust, real-time architecture built on a modern tech stack, ensuring scalability, efficiency, and a seamless user experience.

---

## 1. Core Features

The SCADA Assistant provides a suite of integrated tools for industrial data management:

### 1.1. Real-Time Dashboard
A dynamic, at-a-glance overview of your system's health and performance.
- **System Overview:** Live statistics on reports generated, scheduled tasks, and active users.
- **Overall System Status:** A real-time indicator (`Operational`, `Degraded`, `Offline`) derived from the health of all connected components.
- **Quick Actions:** Direct navigation to the most common tasks, such as generating a new report or managing templates.
- **Recent Activity Feed:** A live-updating list of the latest system events, user actions, and alerts.
- **Component Health:** Individual status indicators for critical services like the Database, Backend, and AI Services.

### 1.2. AI-Powered Report Generator
A multi-step wizard that leverages Google's Gemini AI to generate detailed, context-aware reports from your live SCADA data.
- **Step 1: Criteria Selection:** Define the report's scope by selecting a date range, machines, and specific parameters (tags).
- **Step 2: Template Selection:** Choose from a library of pre-defined or custom-built templates that guide the AI's analysis.
- **Step 3: Data Preview:** Review and selectively include or exclude raw data points before they are sent to the AI.
- **Step 4: Chart Styling:** Visualize the data with an interactive chart preview. Includes an **AI Chart Stylist** that automatically suggests chart types, titles, and color schemes based on a natural language prompt (e.g., "a professional look with dark blue colors").
- **Step 5: Output & Delivery:** Choose the final format (Markdown/PDF or CSV) and optionally email the report to specified recipients immediately upon generation.

### 1.3. Template Management
Create and manage a library of custom report templates to standardize reporting and focus the AI's analysis.
- **Centralized Library:** View all available templates in a grid or list layout.
- **Categorization:** Organize templates by category (e.g., `Production`, `Maintenance`, `Quality`) to streamline selection in the report generator.
- **Custom Creation:** Easily create new templates by defining a name, category, and a descriptive purpose that instructs the AI on the desired analytical focus.

### 1.4. Task Scheduler
Automate the entire report generation process to run at specific intervals.
- **Schedule New Tasks:** Define a task name, select a report template, and set a future date and time for execution.
- **Real-Time Status:** View a live list of all scheduled tasks with clear status indicators: `Scheduled`, `Processing`, `Completed`, `Failed`, or `Overdue`.
- **Automated Delivery:** Scheduled reports are automatically generated and emailed to the user who created the task (if email notifications are enabled).

### 1.5. System & Activity Logging
- **WinCC Activity Logger:** A dedicated, filterable, real-time feed of all significant system and user activities.
- **System Logs & Errors:** A comprehensive log of all backend events, including informational messages, warnings, and errors, with filtering capabilities.
- **Email Sender Log:** A specific log for all outgoing SMTP emails, showing their status (`sent` or `failed`) and any associated errors.

### 1.6. Secure Authentication & User Management
- **Firebase Authentication:** Secure and reliable user registration, login, and session management.
- **Password Reset:** A secure, email-based password reset flow that uses a custom backend emailer for a professional experience.
- **User Profile & Settings:** Users can manage their display name, view their email, and configure all application settings from a centralized, secure page.

---

## 2. Tech Stack & Architecture

The application is built with a modern, robust, and scalable tech stack. The architecture is designed to be secure, efficient, and maintainable, with a clear separation between client-side and server-side logic.

- **Framework:** **Next.js 14** (App Router)
- **UI:** **React**, **ShadCN UI**, **Tailwind CSS**
- **Generative AI:** **Google Gemini** via **Genkit** (Firebase's AI framework)
- **Database (Primary):** Direct connection to **MS SQL Server** for SCADA data.
- **Database (Application):** **Cloud Firestore** for all application data (user settings, templates, tasks, logs).
- **Authentication:** **Firebase Authentication**

### 2.1. Architectural Principles

- **Unidirectional & Real-Time Data Flow:** The application employs a clean and efficient data access strategy. A central `DataProvider` (`/src/components/database/data-provider.tsx`) establishes a single, real-time connection to shared Firestore collections (`machines`, `reportTemplates`). This data is then distributed throughout the application via a React Context (`useData`). This eliminates redundant database listeners, ensures UI consistency, and improves performance.
- **Secure Backend Operations:** All sensitive operations and interactions with the AI models are handled through **Authenticated Genkit Flows** and **Next.js Server Actions**. The client never directly holds API keys or performs database mutations.
    -   **Server-Side Security:** All Genkit flows that write data or access paid services are now authenticated, ensuring only logged-in users can perform actions.
    -   **Secure Key Management:** The user's Gemini API key is stored securely in the database and only accessed by backend flows on the server. It is never exposed to the client.
- **Robust Database Connectivity:** The application features intelligent logic to connect to MS SQL Server. It automatically detects whether a full ODBC connection string or separate server/database details are provided, and can inject user credentials into connection strings if needed, ensuring flexible and reliable connections to any SQL Server environment.
- **Clear Client/Server Separation:**
    - **`client-database-service.ts`:** This file is the **sole entry point for all client-side data reading**. It handles all real-time Firestore listeners for the dashboard and logs.
    - **`database-service.ts`:** This is a **purely server-side service** using the `firebase-admin` SDK. It is responsible for all secure database mutations (writing data), such as creating new tasks or saving user settings.
- **Component-Based & Reusable UI:** The UI is built with ShadCN, promoting consistency, reusability, and accessibility.

---

## 3. Getting Started: Essential Setup

To get the application running, follow these essential setup steps through the user interface after creating an account.

1.  **Create an Account**: Register a new user to get started.

2.  **Connect to Your SCADA Database**:
    - Navigate to **Settings > Database**.
    - Enter your SQL Server credentials. You can either provide a full ODBC connection string in the "Server Address" field or fill out the separate fields for server, database name, user, and password.
    - Use the **Test Connection** button to verify the details are correct, then **Save All** settings.

3.  **Map Your Data Columns**:
    - Navigate to **Settings > Data Mapping**.
    - Click **Fetch Schema** to load your database tables and columns. This will only work if the database connection in the previous step was successful.
    - Select the table containing your SCADA data.
    - Map the corresponding columns for `Timestamp`, `Machine Name`, `Parameter/Tag`, and `Value`. This is crucial for the application to read your data correctly.
    - **Save All** settings.

4.  **Add Your Gemini API Key**:
    - Navigate to **Settings > Integrations**.
    - Enter your Google Gemini API key. This is required for all AI-powered features.
    - **Save All** settings.

5.  **(Optional) Configure Email (SMTP) Settings**:
    - To enable email notifications for scheduled reports and other alerts, navigate to **Settings > Email**.
    - Enter your SMTP server details and test the connection.
    - **Save All** settings.

Once these steps are complete, the dashboard will populate with live data, and all features, including the report generator and task scheduler, will be fully functional.
