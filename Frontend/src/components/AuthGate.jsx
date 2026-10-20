import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { fetchMe } from "../store/authSlice";

export default function AuthGate({ roles, children }) {
  const dispatch = useDispatch();
  const { user, ready } = useSelector((s) => s.auth);
  const location = useLocation();

  useEffect(() => {
    if (!ready) dispatch(fetchMe());
  }, [dispatch, ready]);

  if (!ready) {
    return <p className="p-8 text-sm text-purple">Checking session…</p>;
  }
  if (!user) {
    // Admin-only areas belong to a different login screen than the customer one.
    const adminOnly = roles?.length === 1 && roles[0] === "SUPER_ADMIN";
    return <Navigate to={adminOnly ? "/admin/login" : "/login"} replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
