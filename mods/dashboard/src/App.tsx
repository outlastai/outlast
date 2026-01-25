/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { ThemeProvider, AuthProvider, useAuth } from "@/providers";
import { LoginPage, SuccessPage } from "@/pages";

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return isAuthenticated ? <SuccessPage /> : <LoginPage />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
