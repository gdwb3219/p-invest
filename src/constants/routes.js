/**
 * 라우트 경로 상수
 * 모든 라우트 경로를 한 곳에서 관리하여 오타 방지 및 유지보수 용이
 */
export const ROUTES = {
  HOME: "/",
  COMPARE: "/compare",
  TEST: "/test",
  HISTORY: "/history",
  DASHBOARD: "/dashboard",
  SETTINGS: "/settings",
  INVEST_REV: "/invest-rev",
  INVEST_REV_COMMITTEE_CHANGE: "/invest-rev/committee-change",
  INVEST_REV_EXAMPLE_2: "/invest-rev/example-2",
};

/** 네비에서 "투자 변경 요청" 그룹을 펼칠 때 사용하는 경로 접두사 */
export const INVEST_CHANGE_REQUEST_NAV_PREFIX = "/invest-rev";

/**
 * 사이드바: 투자 변경 요청 — 메인(아이콘) + 서브(아이콘 없음)
 */
export const CHANGE_REQUEST_NAV_GROUP = {
  label: "투자 변경 요청",
  pathPrefix: INVEST_CHANGE_REQUEST_NAV_PREFIX,
  children: [
    { path: ROUTES.INVEST_REV_COMMITTEE_CHANGE, label: "투심위 변경" },
    { path: ROUTES.INVEST_REV, label: "투자 변경 요청" },
    { path: ROUTES.INVEST_REV_EXAMPLE_2, label: "예시" },
  ],
};

/** 서브 메뉴「투자 변경 요청」— list / request / history (및 /invest-rev 인덱스) */
export function isInvestRevLegacySubActive(pathname) {
  if (pathname === ROUTES.INVEST_REV) return true;
  const base = ROUTES.INVEST_REV;
  return (
    pathname === `${base}/list` ||
    pathname === `${base}/request` ||
    pathname === `${base}/history`
  );
}

/** 변경 요청 그룹 서브 중 하나가 현재 경로와 일치하는지 */
export function isChangeRequestNavSubActive(pathname) {
  if (pathname === ROUTES.INVEST_REV_COMMITTEE_CHANGE) return true;
  if (pathname === ROUTES.INVEST_REV_EXAMPLE_2) return true;
  return isInvestRevLegacySubActive(pathname);
}

/**
 * 라우트 메타 정보
 * 네비게이션 메뉴 구성에 사용
 */
export const ROUTE_META = {
  [ROUTES.COMPARE]: {
    label: "비교 페이지",
    icon: "📊",
  },
  [ROUTES.TEST]: {
    label: "투자 비교",
    icon: "🧪",
  },
  [ROUTES.HISTORY]: {
    label: "이력",
    icon: "📜",
  },
  [ROUTES.DASHBOARD]: {
    label: "대시보드",
    icon: "📈",
  },
  [ROUTES.SETTINGS]: {
    label: "설정",
    icon: "⚙️",
  },
};
