import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { OAuthAuthorize } from './pages/OAuthAuthorize';
import { SearchPage } from './pages/Search';
import { Library } from './pages/Library';
import { Profile } from './pages/Profile';

import { Navbar } from './components/ui/Navbar';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-floresta-negra)] text-[var(--color-seda-milharal)] p-4 md:p-8 flex flex-col md:flex-row">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}



import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';

function OAuthRedirectGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const pendingRaw = sessionStorage.getItem('pending_oauth');
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          if (pending.clientId && pending.redirectUri) {
            sessionStorage.removeItem('pending_oauth');
            const target = `/oauth/authorize?client_id=${encodeURIComponent(pending.clientId)}&redirect_uri=${encodeURIComponent(pending.redirectUri)}&state=${encodeURIComponent(pending.state || '')}`;
            window.location.href = target;
          }
        } catch {}
      }
    }
  }, [user]);

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <OAuthRedirectGuard>
        <BrowserRouter>
          <Routes>
            {/* Rotas Públicas de Autenticação & Autorização OAuth */}
            <Route path="/login" element={<Login />} />
            <Route path="/oauth/authorize" element={<OAuthAuthorize />} />

            {/* Rotas Privadas/Protegidas */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Library />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SearchPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </OAuthRedirectGuard>
    </AuthProvider>
  );
}

