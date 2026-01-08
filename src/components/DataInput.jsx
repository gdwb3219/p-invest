import { useState } from 'react';
import './DataInput.css';

function DataInput({ onDataChange, tableNumber }) {
  const [inputType, setInputType] = useState('csv');
  const [inputValue, setInputValue] = useState('');

  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return { data: [], headers: [] };

    // CSV 파싱 함수 (따옴표 처리)
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++; // 다음 따옴표 건너뛰기
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]);
    const data = lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    return { data, headers };
  };

  const parseJSON = (jsonText) => {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return { data: [], headers: [] };
        const headers = Object.keys(parsed[0]);
        return { data: parsed, headers };
      } else if (parsed.data && Array.isArray(parsed.data)) {
        const headers = parsed.headers || (parsed.data[0] ? Object.keys(parsed.data[0]) : []);
        return { data: parsed.data, headers };
      }
      return { data: [], headers: [] };
    } catch (error) {
      alert('JSON 형식이 올바르지 않습니다.');
      return { data: [], headers: [] };
    }
  };

  const handleInputChange = (value) => {
    setInputValue(value);
    
    if (value.trim() === '') {
      onDataChange([], []);
      return;
    }

    let result;
    if (inputType === 'csv') {
      result = parseCSV(value);
    } else {
      result = parseJSON(value);
    }

    onDataChange(result.data, result.headers);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      handleInputChange(content);
    };
    reader.readAsText(file);
  };

  const sampleCSV = `이름,나이,직업,도시
김철수,25,개발자,서울
이영희,30,디자이너,부산
박민수,28,기획자,대구`;

  const sampleJSON = `[
  {"이름": "김철수", "나이": "25", "직업": "개발자", "도시": "서울"},
  {"이름": "이영희", "나이": "30", "직업": "디자이너", "도시": "부산"},
  {"이름": "박민수", "나이": "28", "직업": "기획자", "도시": "대구"}
]`;

  const loadSample = () => {
    const sample = inputType === 'csv' ? sampleCSV : sampleJSON;
    setInputValue(sample);
    handleInputChange(sample);
  };

  return (
    <div className="data-input">
      <div className="input-controls">
        <div className="input-type-selector">
          <label>
            <input
              type="radio"
              value="csv"
              checked={inputType === 'csv'}
              onChange={(e) => {
                setInputType(e.target.value);
                setInputValue('');
                onDataChange([], []);
              }}
            />
            CSV
          </label>
          <label>
            <input
              type="radio"
              value="json"
              checked={inputType === 'json'}
              onChange={(e) => {
                setInputType(e.target.value);
                setInputValue('');
                onDataChange([], []);
              }}
            />
            JSON
          </label>
        </div>
        <div className="input-actions">
          <button onClick={loadSample} className="sample-btn">
            샘플 데이터 로드
          </button>
          <label className="file-upload-btn">
            파일 업로드
            <input
              type="file"
              accept={inputType === 'csv' ? '.csv' : '.json'}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
      <textarea
        className="data-textarea"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={inputType === 'csv' 
          ? 'CSV 형식으로 데이터를 입력하세요 (첫 줄은 헤더)...'
          : 'JSON 형식으로 데이터를 입력하세요...'}
        rows={10}
      />
    </div>
  );
}

export default DataInput;

