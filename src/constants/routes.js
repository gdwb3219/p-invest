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
};

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
  [ROUTES.INVEST_REV]: {
    label: "투자 변경 요청",
    icon: "📝",
  },
};
