import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCountStore, useSessionStorage } from '../../hooks/useCustomHooks';
import axios from 'axios';
import { useApiUrl } from '../../stores';

function Counter() {
  const count = useCountStore((state) => state.count);
  const increment = useCountStore((state) => state.increment);
  const decrement = useCountStore((state) => state.decrement);

  const [formData, setformData] = useSessionStorage('formData', {
    counted: 0,
  });

  const { API_URL } = useApiUrl();
  const SAP_HIS_TEST_PATH = '/sap-his-data/test';

  const LATEST_API_URL = `${API_URL}${SAP_HIS_TEST_PATH}`;

  const getSapData = async () => {
    const response = await axios.get(LATEST_API_URL);
    const raw = response.data;
    const list = Array.isArray(raw)
      ? raw
      : (raw?.data ??
        raw?.results ??
        raw?.sap_his_data ??
        [raw].filter(Boolean));
    return Array.isArray(list) ? list : [];
  };

  const queryClient = useQueryClient();

  // tanstack query 예시
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sap_data'],
    queryFn: getSapData,
  });

  console.log('data', data);

  // Mutation 예시
  const mutation = useMutation({
    mutationFn: getSapData,
    onSuccess: () => {
      // 성공 시에 어떤 걸 할 지? 보통 Invalidate Queries 필요
      queryClient.invalidateQueries({ queryKey: ['sap_data'] });
    },
  });

  const handleChangeCount = () => {
    setformData({
      ...formData,
      counted: formData.counted + 1,
    });
  };

  return (
    <div>
      <p>현재 카운트: {count}</p>
      <button onClick={increment}>증가</button>
      <button onClick={decrement}>감소</button>

      <p>현재 SessionStorage 카운트: {formData.counted}</p>
      <button onClick={handleChangeCount}> SessionStorage 증가</button>
      <div>{isLoading ? '로딩 중...' : '로딩 완료'}</div>
      <div>{isError ? '에러 발생' : '에러 없음'}</div>
      <div>{data ? JSON.stringify(data) : '데이터 없음'}</div>
      <div>하이</div>
    </div>
  );
}

function NavExamplePlaceholder({ variant }) {
  return (
    <div className='invest-rev-page'>
      <header className='invest-rev-header'>
        <h1 className='invest-rev-title'>예시</h1>
      </header>
      <main className='invest-rev-content'>
        <div className='invest-rev-sub-page'>
          <p className='invest-rev-sub-badge invest-rev-sub-badge--active'>
            예시 {variant}
          </p>
          <Counter />
          <p className='invest-rev-sub-desc'>네비게이션용 예시 페이지입니다.</p>
        </div>
      </main>
    </div>
  );
}

export default NavExamplePlaceholder;
