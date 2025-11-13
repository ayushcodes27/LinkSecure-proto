import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // Simple check for token in localStorage
  const token = localStorage.getItem('token');
  
  if (!token) {
    // Redirect to login page if no token
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
