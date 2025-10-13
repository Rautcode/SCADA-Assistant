# SCADA Assistant

SCADA Assistant is a modern, AI-powered web application designed to help you monitor, analyze, and report on your SCADA (Supervisory Control and Data Acquisition) system data. It provides a user-friendly interface to connect directly to your live database, generate insightful reports, and automate routine tasks.

## Core Features

- **Dashboard Interface**: A real-time overview of your system's key metrics, recent activity, and component statuses.
- **AI-Powered Report Generator**: A multi-step wizard that uses Google's Gemini AI to generate detailed reports from your SCADA data. The AI tailors its analysis based on the selected report template.
- **Template Management**: Create and manage custom report templates to guide the AI's analysis and standardize your reporting formats.
- **Task Scheduler**: Automate report generation by scheduling tasks to run at specific times.
- **Activity & Error Logging**: Keep track of all system activities, user actions, and potential errors through a real-time logging interface.
- **Secure Authentication**: User authentication is handled securely through Firebase.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **UI**: [React](https://react.dev/), [ShadCN UI](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
- **Generative AI**: [Google Gemini](https://deepmind.google/technologies/gemini/) via [Genkit](https://firebase.google.com/docs/genkit)
- **Database Connectivity**: Direct connection to MS SQL Server.
- **Backend Services**: [Firebase](https://firebase.google.com/) for authentication and application data storage (user settings, templates, etc.).

## Getting Started

To get the application running, follow these essential setup steps through the user interface:

1.  **Create an Account**: Register a new user to get started.
2.  **Connect to Your Database**:
    - Navigate to **Settings > Database**.
    - Enter your SQL Server credentials (server address, database name, user, and password).
    - Use the **Test Connection** button to verify the details are correct, then save.
3.  **Map Your Data Columns**:
    - Go to **Settings > Data Mapping**.
    - Click **Fetch Schema** to load your database tables and columns.
    - Select the table containing your SCADA data and map the corresponding columns for `Timestamp`, `Machine Name`, `Parameter/Tag`, and `Value`. This is crucial for the application to read your data correctly.
4.  **Add Your Gemini API Key**:
    - Go to **Settings > Integrations**.
    - Enter your Google Gemini API key. This is required for all AI-powered features.

Once these steps are complete, the dashboard will populate with live data, and all features, including the report generator, will be fully functional.
