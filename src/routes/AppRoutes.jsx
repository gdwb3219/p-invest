import { Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import ComparePage from "../pages/ComparePage";
import TestPage from "../pages/TestPage";
import HistoryPage from "../pages/HistoryPage";
import InvestDashboard from "../pages/InvestDashboard";
import SettingPage from "../pages/SettingPage";
import InvestRevPage from "../pages/InvestRevPage";
import InvestRevList from "../pages/invest-rev/InvestRevList";
import InvestRevRequest from "../pages/invest-rev/InvestRevRequest";
import InvestRevHistory from "../pages/invest-rev/InvestRevHistory";
import InvestCommitteeChangePage from "../pages/invest-rev/InvestCommitteeChangePage";
import InvestCommitteeChange from "../pages/invest-rev/InvestCommitteeChange";
import CommitteeChangeRequest from "../pages/invest-rev/CommitteeChangeRequest";
import CommitteeChangeHistory from "../pages/invest-rev/CommitteeChangeHistory";
import NavExamplePlaceholder from "../pages/invest-rev/NavExamplePlaceholder";

function AppRoutes() {
  return (
    <Routes>
      <Route
        path={ROUTES.HOME}
        element={<Navigate to={ROUTES.COMPARE} replace />}
      />
      <Route path={ROUTES.COMPARE} element={<ComparePage />} />
      <Route path={ROUTES.TEST} element={<TestPage />} />
      <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
      <Route path={ROUTES.DASHBOARD} element={<InvestDashboard />} />
      <Route path={ROUTES.SETTINGS} element={<SettingPage />} />
      <Route
        path={ROUTES.INVEST_REV_COMMITTEE_CHANGE}
        element={<InvestCommitteeChangePage />}
      >
        <Route index element={<Navigate to="main" replace />} />
        <Route path="main" element={<InvestCommitteeChange />} />
        <Route path="requests" element={<CommitteeChangeRequest />} />
        <Route path="history" element={<CommitteeChangeHistory />} />
      </Route>
      <Route
        path={ROUTES.INVEST_REV_EXAMPLE_2}
        element={<NavExamplePlaceholder variant={2} />}
      />
      <Route path={ROUTES.INVEST_REV} element={<InvestRevPage />}>
        <Route index element={<Navigate to="list" replace />} />
        <Route path="list" element={<InvestRevList />} />
        <Route path="request" element={<InvestRevRequest />} />
        <Route path="history" element={<InvestRevHistory />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
