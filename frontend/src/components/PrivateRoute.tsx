import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../services/auth.service';

export default function PrivateRoute() {
  return authService.isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
}
