import { useCountStore, useSessionStorage } from '../../hooks/useCustomHooks';

function Counter() {
  const count = useCountStore((state) => state.count);
  const increment = useCountStore((state) => state.increment);
  const decrement = useCountStore((state) => state.decrement);

  const [formData, setformData] = useSessionStorage('formData', {
    counted: 0,
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
