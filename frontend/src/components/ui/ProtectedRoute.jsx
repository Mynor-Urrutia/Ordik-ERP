import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-slate-900">
        <div data-testid="loading-spinner" className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}
