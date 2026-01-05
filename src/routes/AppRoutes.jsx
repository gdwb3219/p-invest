import { Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import ComparePage from "../pages/ComparePage";
import TestPage from "../pages/TestPage";

function AppRoutes() {
  return (
    <Routes>
      <Route
        path={ROUTES.HOME}
        element={<Navigate to={ROUTES.COMPARE} replace />}
      />
      <Route path={ROUTES.COMPARE} element={<ComparePage />} />
      <Route path={ROUTES.TEST} element={<TestPage />} />
    </Routes>
  );
}

export default AppRoutes;
