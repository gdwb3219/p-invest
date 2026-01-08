# 프로젝트 구조 가이드

이 문서는 P-Invest System 프로젝트의 폴더 구조와 각 폴더의 역할을 설명합니다.

## 📁 전체 구조

```
src/
├── assets/              # 정적 파일
├── components/          # 재사용 가능한 UI 컴포넌트
│   ├── NavigationBar.jsx
│   ├── TableComparator.jsx
│   └── ...
├── constants/           # 상수 정의
│   ├── routes.js        # 라우트 경로 상수
│   └── index.js         # 상수 통합 export
├── data/                # Mock 데이터
│   └── mockData.js
├── hooks/               # 커스텀 React 훅
│   ├── useTableData.js
│   └── useChangeReasons.js
├── layouts/             # 레이아웃 컴포넌트
│   ├── MainLayout.jsx
│   └── MainLayout.css
├── pages/               # 페이지 컴포넌트
│   ├── ComparePage.jsx
│   └── TestPage.jsx
├── routes/              # 라우팅 설정
│   └── AppRoutes.jsx
├── services/            # API 서비스
│   └── tableService.js
├── styles/              # 전역 스타일
│   └── global.css
├── utils/               # 유틸리티 함수
│   └── tableComparison.js
├── App.jsx              # 메인 App 컴포넌트
└── main.jsx             # 애플리케이션 진입점
```

## 📂 각 폴더 상세 설명

### 🎨 `assets/`

**역할**: 정적 파일 저장

- 이미지, 아이콘, 폰트 등
- 예: `react.svg`, `logo.png`

### 🧩 `components/`

**역할**: 재사용 가능한 UI 컴포넌트

- 여러 페이지에서 공통으로 사용되는 컴포넌트
- 각 컴포넌트는 자신의 CSS 파일을 가짐
- 예: `NavigationBar`, `TableComparator`, `ComparisonTable`

**규칙**:

- 컴포넌트명은 PascalCase
- 파일명은 컴포넌트명과 동일
- 관련 CSS 파일은 같은 폴더에 위치

### 📌 `constants/`

**역할**: 상수 정의

- 라우트 경로, API 엔드포인트, 설정값 등
- 하드코딩된 문자열을 상수로 관리하여 오타 방지
- 예: `routes.js` - 라우트 경로 상수

**사용 예시**:

```javascript
import { ROUTES } from "../constants/routes";
// ROUTES.COMPARE 사용
```

### 💾 `data/`

**역할**: Mock 데이터 (개발/테스트용)

- 실제 서버가 없을 때 사용하는 더미 데이터
- 프로덕션에서는 `services/`의 실제 API로 대체

### 🎣 `hooks/`

**역할**: 커스텀 React 훅

- 재사용 가능한 로직을 훅으로 추출
- 예: `useTableData`, `useChangeReasons`

**사용 예시**:

```javascript
import { useTableData } from "../hooks/useTableData";

function MyComponent() {
  const { data, loading, error } = useTableData(1);
  // ...
}
```

### 🏗️ `layouts/`

**역할**: 레이아웃 컴포넌트

- 페이지의 공통 구조를 정의
- 예: `MainLayout` - 네비게이션 바와 메인 콘텐츠 영역

**특징**:

- `children` prop을 통해 페이지 컴포넌트를 렌더링
- 여러 레이아웃을 만들어 다양한 페이지 구조 지원 가능

### 📄 `pages/`

**역할**: 페이지 컴포넌트

- 각 라우트에 대응하는 페이지
- 예: `ComparePage`, `TestPage`

**규칙**:

- 페이지 컴포넌트는 `pages/` 폴더에만 위치
- 페이지별 CSS 파일도 함께 관리

### 🛣️ `routes/`

**역할**: 라우팅 설정

- React Router 설정을 중앙에서 관리
- 예: `AppRoutes.jsx` - 모든 라우트 정의

**장점**:

- 라우트 추가/수정이 한 곳에서 가능
- 라우트 구조를 한눈에 파악 가능

### 🔌 `services/`

**역할**: API 서비스 및 비즈니스 로직

- 서버와의 통신 로직
- 데이터 가져오기, 저장하기 등의 함수
- 예: `tableService.js` - 테이블 데이터 관련 API

**특징**:

- 실제 API 호출과 Mock 데이터를 쉽게 전환 가능
- 에러 처리, 로딩 상태 등을 중앙에서 관리

### 🎨 `styles/`

**역할**: 전역 스타일

- 모든 페이지에 공통으로 적용되는 CSS
- 예: `global.css` - 기본 스타일, 리셋 CSS

### 🛠️ `utils/`

**역할**: 유틸리티 함수

- 순수 함수 (입력에 대해 항상 같은 출력)
- 예: `tableComparison.js` - 테이블 비교 로직

**특징**:

- 컴포넌트와 독립적인 순수 함수
- 테스트하기 쉬운 구조

## 🔄 파일 간 의존성 규칙

```
pages/ → components/ → hooks/ → services/
     ↓        ↓          ↓
  layouts/  utils/   constants/
```

**규칙**:

- 상위 레벨이 하위 레벨을 import
- 같은 레벨 간에는 import 가능
- 하위 레벨이 상위 레벨을 import하면 안 됨 (순환 참조 방지)

## 📝 파일 생성 가이드

### 새 페이지 추가하기

1. `pages/` 폴더에 새 파일 생성: `NewPage.jsx`
2. `constants/routes.js`에 라우트 경로 추가
3. `routes/AppRoutes.jsx`에 Route 추가
4. `components/NavigationBar.jsx`에 메뉴 항목 추가 (필요시)

### 새 컴포넌트 추가하기

1. `components/` 폴더에 새 파일 생성: `NewComponent.jsx`
2. 같은 폴더에 CSS 파일 생성: `NewComponent.css`
3. 필요한 곳에서 import하여 사용

### 새 훅 추가하기

1. `hooks/` 폴더에 새 파일 생성: `useNewHook.js`
2. `use`로 시작하는 함수 export
3. 컴포넌트에서 import하여 사용

### 새 서비스 추가하기

1. `services/` 폴더에 새 파일 생성: `newService.js`
2. API 호출 함수들을 export
3. 훅이나 컴포넌트에서 import하여 사용

## 🎯 초보자를 위한 팁

1. **컴포넌트 vs 페이지**

   - 컴포넌트: 여러 곳에서 재사용되는 작은 단위
   - 페이지: 라우트에 직접 연결되는 큰 단위

2. **훅 사용 시기**

   - 같은 로직을 여러 컴포넌트에서 사용할 때
   - 상태 관리와 부수 효과를 분리하고 싶을 때

3. **서비스 사용 시기**

   - 서버와 통신하는 로직
   - 데이터를 가져오거나 저장하는 로직

4. **상수 사용 시기**
   - 하드코딩된 문자열이 여러 곳에서 사용될 때
   - 오타를 방지하고 싶을 때

## 📚 추가 학습 자료

- [React 공식 문서](https://react.dev)
- [React Router 문서](https://reactrouter.com)
- [React Hooks 문서](https://react.dev/reference/react)

