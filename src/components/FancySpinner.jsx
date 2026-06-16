import '../styles/components/FancySpinner.css';

const FancySpinner = () => {
  return (
    <div className='fancy-spinner-container'>
      <div className='spinner-orbit orbit-1'></div>
      <div className='spinner-orbit orbit-2'></div>
      <div className='spinner-orbit orbit-3'></div>
      <div className='spinner-core'></div>
    </div>
  );
};

export default FancySpinner;
