import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import "../../styles/pages/invest-rev/InvestRevRequest.css";

/** 최신 시트(행 배열) — HistoryPage와 동일 소스 */
const LATEST_SHEET_URL = "http://127.0.0.1:8080/api/sap-his-data/test";

/**
 * 변경 요청 저장 API (백엔드 구현 시 맞춰 조정)
 * 기대 본문: rowKey, columnKey, valueBefore, valueAfter, requestedBy, comment?, clientRequestId?
 */
const CHANGE_REQUEST_POST_URL =
  "http://127.0.0.1:8080/api/invest-rev/change-requests";

const PRIMEKEY_COLUMN = "prime-key";

const KEY_FIRST = ["구분0 (사업명)", "구분0 순번"];

function getOrderedHeaders(headers) {
  if (!headers || headers.length === 0) return headers || [];
  const first = KEY_FIRST.filter((k) => headers.includes(k));
  const rest = headers.filter((k) => !KEY_FIRST.includes(k));
  return [...first, ...rest];
}

function normalizeRows(raw) {
  const list = Array.isArray(raw)
    ? raw
    : (raw?.data ?? raw?.results ?? raw?.sap_his_data ?? [raw].filter(Boolean));
  return Array.isArray(list) ? list : [];
}

function getRowKey(row, index) {
  const pk = row?.[PRIMEKEY_COLUMN];
  if (pk != null && String(pk).trim() !== "") return String(pk);
  return `__idx_${index}`;
}

function displayCell(v) {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function InvestRevRequest() {
  const [rows, setRows] = useState([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [sheetError, setSheetError] = useState(null);

  const [selectedIndex, setSelectedIndex] = useState(null);
  const [columnKey, setColumnKey] = useState("");
  const [valueAfterDraft, setValueAfterDraft] = useState("");
  const [requestedBy, setRequestedBy] = useState("user1");
  const [comment, setComment] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitMessage, setSubmitMessage] = useState(null);

  /** 제출 직후 UI용: 해당 행을 "요청 중"으로 표시 (서버 플래그와 동기화는 재조회로 대체 가능) */
  const [localPendingKeys, setLocalPendingKeys] = useState(() => new Set());

  const fetchLatestSheet = useCallback(async () => {
    setLoadingSheet(true);
    setSheetError(null);
    try {
      const res = await axios.get(LATEST_SHEET_URL);
      const list = normalizeRows(res.data);
      setRows(list);
      setSelectedIndex((prev) => {
        if (list.length === 0) return null;
        if (prev == null || prev >= list.length) return 0;
        return prev;
      });
    } catch (err) {
      console.error("최신 시트 로드 오류:", err);
      setSheetError(
        err.response?.data?.message ??
          err.message ??
          "최신 데이터를 불러오지 못했습니다.",
      );
      setRows([]);
      setSelectedIndex(null);
    } finally {
      setLoadingSheet(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestSheet();
  }, [fetchLatestSheet]);

  const headers = useMemo(() => {
    if (rows.length === 0) return [];
    return getOrderedHeaders(Object.keys(rows[0]));
  }, [rows]);

  const displayHeaders = useMemo(
    () => headers.filter((h) => h !== PRIMEKEY_COLUMN),
    [headers],
  );

  const selectedRow = selectedIndex != null ? rows[selectedIndex] : null;

  const valueBefore = selectedRow && columnKey ? selectedRow[columnKey] : null;

  useEffect(() => {
    if (!selectedRow || !columnKey) {
      setValueAfterDraft("");
      return;
    }
    setValueAfterDraft(displayCell(valueBefore));
  }, [selectedRow, columnKey, valueBefore]);

  useEffect(() => {
    if (displayHeaders.length === 0) {
      setColumnKey("");
      return;
    }
    setColumnKey((prev) =>
      prev && displayHeaders.includes(prev) ? prev : displayHeaders[0],
    );
  }, [displayHeaders]);

  const payloadPreview = useMemo(() => {
    if (!selectedRow || selectedIndex == null || !columnKey) return null;
    const rowKey = getRowKey(selectedRow, selectedIndex);
    return {
      rowKey,
      columnKey,
      valueBefore: displayCell(valueBefore),
      valueAfter: valueAfterDraft,
      requestedBy: requestedBy.trim() || null,
      comment: comment.trim() || null,
    };
  }, [
    selectedRow,
    selectedIndex,
    columnKey,
    valueBefore,
    valueAfterDraft,
    requestedBy,
    comment,
  ]);

  const hasChange =
    payloadPreview &&
    displayCell(valueBefore) !== String(valueAfterDraft ?? "");

  const canSubmit =
    Boolean(payloadPreview) &&
    hasChange &&
    requestedBy.trim() !== "" &&
    !submitting;

  const handleSubmit = async () => {
    if (!payloadPreview || !canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitMessage(null);
    const clientRequestId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${payloadPreview.rowKey}-${payloadPreview.columnKey}`;
    const body = {
      ...payloadPreview,
      clientRequestId,
      /** 서버가 기대하는 스키마 예시 — 필드명은 API에 맞게 변경 */
      statusHint: "요청 중",
    };
    try {
      await axios.post(CHANGE_REQUEST_POST_URL, body, {
        headers: { "Content-Type": "application/json" },
      });
      const rk = payloadPreview.rowKey;
      setLocalPendingKeys((prev) => new Set(prev).add(rk));
      setSubmitMessage(
        "변경 요청이 서버에 전달되었습니다. 담당자 승인 시 본문의 valueAfter가 반영되고 플래그는 승인 완료로 바뀌도록 백엔드를 구성하면 됩니다.",
      );
    } catch (err) {
      console.error("변경 요청 전송 오류:", err);
      setSubmitError(
        err.response?.data?.message ??
          err.message ??
          "변경 요청 API 호출에 실패했습니다. 엔드포인트를 확인하세요.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='invest-rev-sub-page invest-rev-request'>
      <p className='invest-rev-sub-badge invest-rev-sub-badge--active'>
        현재 탭: 변경 요청
      </p>
      <p className='invest-rev-sub-desc' style={{ marginBottom: "1rem" }}>
        DB에서 가져온 최신 시트 행을 고른 뒤, 특정 컬럼의 변경 후 값만 로컬에
        두었다가 &quot;변경 요청 제출&quot; 시 서버로 보냅니다. 승인·플래그(요청
        중 / 승인 완료)는 백엔드에서 처리합니다.
      </p>

      <div className='invest-rev-request__toolbar'>
        <button
          type='button'
          className='invest-rev-request__btn invest-rev-request__btn--secondary'
          onClick={fetchLatestSheet}
          disabled={loadingSheet}
        >
          {loadingSheet ? "불러오는 중…" : "최신 시트 다시 불러오기"}
        </button>
        <p className='invest-rev-request__hint'>
          POST URL: <code>{CHANGE_REQUEST_POST_URL}</code>
        </p>
      </div>

      {sheetError && (
        <div className='invest-rev-request__error' role='alert'>
          {sheetError}
        </div>
      )}
      {submitError && (
        <div className='invest-rev-request__error' role='alert'>
          {submitError}
        </div>
      )}
      {submitMessage && (
        <div className='invest-rev-request__success' role='status'>
          {submitMessage}
        </div>
      )}

      {loadingSheet && rows.length === 0 && !sheetError ? (
        <p className='invest-rev-request__loading'>
          데이터를 불러오는 중입니다…
        </p>
      ) : rows.length === 0 ? (
        <p className='invest-rev-request__empty'>
          표시할 행이 없습니다. API 응답 형식을 확인하세요.
        </p>
      ) : (
        <div className='invest-rev-request__layout'>
          <div className='invest-rev-request__panel'>
            <h2 className='invest-rev-request__panel-title'>
              최신 시트 (행 선택)
            </h2>
            <div className='invest-rev-request__table-wrap'>
              <table className='invest-rev-request__table'>
                <thead>
                  <tr>
                    <th aria-label='선택' />
                    <th>상태</th>
                    {displayHeaders.slice(0, 8).map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                    {displayHeaders.length > 8 && <th>…</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const rk = getRowKey(row, idx);
                    const pending = localPendingKeys.has(rk);
                    const selected = selectedIndex === idx;
                    return (
                      <tr
                        key={rk}
                        className={
                          selected ? "invest-rev-request__row--selected" : ""
                        }
                      >
                        <td>
                          <input
                            type='radio'
                            name='invest-rev-row'
                            className='invest-rev-request__row-radio'
                            checked={selected}
                            onChange={() => setSelectedIndex(idx)}
                            aria-label={`행 ${idx + 1} 선택`}
                          />
                        </td>
                        <td>
                          {pending ? (
                            <span className='invest-rev-request__badge invest-rev-request__badge--pending'>
                              요청 중
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        {displayHeaders.slice(0, 8).map((h) => (
                          <td key={h}>{displayCell(row[h])}</td>
                        ))}
                        {displayHeaders.length > 8 && <td>…</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className='invest-rev-request__panel'>
            <h2 className='invest-rev-request__panel-title'>
              변경 내용 (로컬 초안)
            </h2>
            {!selectedRow ? (
              <p className='invest-rev-request__empty'>행을 선택하세요.</p>
            ) : (
              <>
                <div className='invest-rev-request__form-group'>
                  <label
                    className='invest-rev-request__label'
                    htmlFor='irr-col'
                  >
                    변경할 컬럼
                  </label>
                  <select
                    id='irr-col'
                    className='invest-rev-request__select'
                    value={columnKey}
                    onChange={(e) => setColumnKey(e.target.value)}
                  >
                    {displayHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='invest-rev-request__form-group'>
                  <span className='invest-rev-request__label'>
                    현재 값 (DB)
                  </span>
                  <div className='invest-rev-request__readonly'>
                    {displayCell(valueBefore)}
                  </div>
                </div>
                <div className='invest-rev-request__form-group'>
                  <label
                    className='invest-rev-request__label'
                    htmlFor='irr-after'
                  >
                    변경 요청 값 (서버 전송 전까지 로컬만 수정)
                  </label>
                  <textarea
                    id='irr-after'
                    className='invest-rev-request__textarea'
                    value={valueAfterDraft}
                    onChange={(e) => setValueAfterDraft(e.target.value)}
                    rows={4}
                    placeholder='요청할 새 값을 입력하세요'
                  />
                </div>
                <div className='invest-rev-request__form-group'>
                  <label
                    className='invest-rev-request__label'
                    htmlFor='irr-user'
                  >
                    요청자 (user1)
                  </label>
                  <input
                    id='irr-user'
                    className='invest-rev-request__input'
                    value={requestedBy}
                    onChange={(e) => setRequestedBy(e.target.value)}
                    autoComplete='username'
                  />
                </div>
                <div className='invest-rev-request__form-group'>
                  <label
                    className='invest-rev-request__label'
                    htmlFor='irr-note'
                  >
                    비고 (선택)
                  </label>
                  <input
                    id='irr-note'
                    className='invest-rev-request__input'
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder='담당자 참고용 메모'
                  />
                </div>

                <button
                  type='button'
                  className='invest-rev-request__btn invest-rev-request__btn--primary'
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                >
                  {submitting ? "전송 중…" : "변경 요청 제출"}
                </button>
                {!hasChange && columnKey && (
                  <p
                    className='invest-rev-request__hint'
                    style={{ marginTop: "0.75rem" }}
                  >
                    현재 값과 동일하면 제출할 수 없습니다.
                  </p>
                )}

                {payloadPreview && (
                  <div className='invest-rev-request__preview'>
                    <p className='invest-rev-request__preview-title'>
                      서버로 보낼 JSON 미리보기
                    </p>
                    <pre className='invest-rev-request__preview-pre'>
                      {JSON.stringify(
                        {
                          rowKey: payloadPreview.rowKey,
                          columnKey: payloadPreview.columnKey,
                          valueBefore: payloadPreview.valueBefore,
                          valueAfter: payloadPreview.valueAfter,
                          requestedBy: payloadPreview.requestedBy,
                          comment: payloadPreview.comment,
                          clientRequestId: "(제출 시 자동 부여)",
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default InvestRevRequest;
