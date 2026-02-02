/**
 * Copyright (C) 2026 by Outlast.
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, AuthProvider, useAuth } from "@/providers";
import { LoginPage, SuccessPage, PendingReviewsPage, RecordHistoryPage } from "@/pages";

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<SuccessPage />} />
      <Route path="/pending-reviews" element={<PendingReviewsPage />} />
      <Route path="/records/:recordId/history" element={<RecordHistoryPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
