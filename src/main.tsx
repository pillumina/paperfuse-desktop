import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FetchProgressProvider } from "./contexts/FetchProgressContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { requestNotificationPermission } from "./lib/notifications";

// Request notification permission on app start
requestNotificationPermission().catch(console.error);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FetchProgressProvider>
        <LanguageProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </LanguageProvider>
      </FetchProgressProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
