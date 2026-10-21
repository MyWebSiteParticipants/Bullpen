import { useState } from "react";
import { useBroker } from "../../app/BrokerContext";
import { ErrorBanner } from "../../components/ErrorBanner";
import { usePolling } from "../../hooks/usePolling";
import { fmtMoney, fmtPct, fmtQty, fmtSigned, fmtTime, signClass } from "../../lib/format";
import { env } from "../../config/env";
import { OrderPipeline } from "../../pipeline/orderPipeline";

const OPEN_STATUSES = new Set(["new", "accepted", "pending_new", "partially_filled", "held"]);

export function AccountPanel({ onSelect }: { onSelect: (symbol: string) => void }) {
  const { broker } = useBroker();
  const pipeline = new OrderPipeline(broker);

  const account = usePolling(() => broker.getAccount(), 20_000, "account");
  const positions = usePolling(() => broker.getPositions(), 15_000, "positions");
  const orders = usePolling(() => broker.getOrders({ status: "all", limit: 50 }), 15_000, "orders");
  const clock = usePolling(() => broker.getClock(), 60_000, "clock");

  // State for two-tap cancel confirmation & inline order replacement
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<string>("");
  const [editLimitPrice, setEditLimitPrice] = useState<string>("");
  const [editStopPrice, setEditStopPrice] = useState<string>("");

  const a = account.data;
  const dayPl = a ? a.equity - a.lastEquity : undefined;
  const dayPlPct = a && a.lastEquity ? ((a.equity - a.lastEquity) / a.lastEquity) * 100 : undefined;

  const handleCancelClick = async (id: string) => {
    if (confirmCancelId !== id) {
      setConfirmCancelId(id);
      return;
    }
    try {
      await broker.cancelOrder(id);
      setConfirmCancelId(null);
      await orders.refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const startEditing = (o: any) => {
    setEditingOrderId(o.id);
    setEditQty(String(o.qty));
    setEditLimitPrice(o.limitPrice ? String(o.limitPrice) : "");
    setEditStopPrice(o.stopPrice ? String(o.stopPrice) : "");
  };

  const submitReplace = async (id: string) => {
    try {
      const result = await pipeline.replace(id, {
        qty: editQty ? Number(editQty) : undefined,
        limit_price: editLimitPrice ? Number(editLimitPrice) : undefined,
        stop_price: editStopPrice ? Number(editStopPrice) : undefined,
      });

      if (result.verdict && !result.verdict.ok) {
        alert(`Risk guard blocked replacement: ${result.verdict.violations.join(", ")}`);
        return;
      }

      setEditingOrderId(null);
      await orders.refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const open = (orders.data ?? []).filter((o) => OPEN_STATUSES.has(o.status));
  const recent = (orders.data ?? []).filter((o) => !OPEN_STATUSES.has(o.status)).slice(0, 15);

  return (
    <>
      <ErrorBanner error={account.error ?? positions.error ?? orders.error} />

      <div className="card">
        <div className="card__title">
          <span>{env.paper ? "Paper account" : "LIVE ACCOUNT"}</span>
          <span className={`pill ${clock.data?.isOpen ? "pill--ok" : "pill--muted"}`}>
            {clock.data ? (clock.data.isOpen ? "Market open" : "Market closed") : "…"}
          </span>
        </div>
        <div className="stat-grid">
          <div className="stat">
            <div className="stat__label">Equity</div>
            <div className="stat__value">{fmtMoney(a?.equity, 0)}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Today</div>
            <div className={`stat__value ${signClass(dayPl)}`}>
              {fmtSigned(dayPl, 0)} <span style={{ fontSize: 12 }}>{fmtPct(dayPlPct)}</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat__label">Cash</div>
            <div className="stat__value">{fmtMoney(a?.cash, 0)}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Buying power</div>
            <div className="stat__value">{fmtMoney(a?.buyingPower, 0)}</div>
          </div>
        </div>
        {a && a.dayTradeCount > 0 && (
          <div className="sub" style={{ marginTop: 8 }}>
            Day trades (5-day window): {a.dayTradeCount}
            {a.patternDayTrader ? " · flagged PDT" : ""}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card__title">Positions</div>
        {positions.data?.length === 0 && <div className="empty">No open positions.</div>}
        {positions.data?.map((p) => (
          <div key={p.symbol} className="row row--tap" onClick={() => onSelect(p.symbol)}>
            <div>
              <div className="sym">{p.symbol}</div>
              <div className="sub">
                {fmtQty(p.qty)} @ {fmtMoney(p.avgEntryPrice)} · now {fmtMoney(p.currentPrice)}
              </div>
            </div>
            <div className="num">
              <div style={{ fontWeight: 600 }}>{fmtMoney(p.marketValue, 0)}</div>
              <div className={`sub ${signClass(p.unrealizedPl)}`}>
                {fmtSigned(p.unrealizedPl)} ({fmtPct(p.unrealizedPlPct)})
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card__title">Open orders</div>
        {open.length === 0 && <div className="empty">No open orders.</div>}
        {open.map((o) => {
          const isEditing = editingOrderId === o.id;
          const isConfirmingCancel = confirmCancelId === o.id;

          return (
            <div key={o.id} className="row" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div>
                    <span className={`sym ${o.side === "buy" ? "up" : "down"}`}>{o.side.toUpperCase()}</span>{" "}
                    <span className="sym">
                      {fmtQty(o.qty)} {o.symbol}
                    </span>{" "}
                    <span className="pill pill--muted">{o.source}</span>
                  </div>
                  <div className="sub">
                    {o.type}
                    {o.limitPrice ? ` @ ${fmtMoney(o.limitPrice)}` : ""}
                    {o.stopPrice ? ` stop ${fmtMoney(o.stopPrice)}` : ""} · {o.timeInForce} · {o.status} · {fmtTime(o.submittedAt)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {!isEditing && (
                    <button className="btn btn--secondary" onClick={() => startEditing(o)}>
                      Replace
                    </button>
                  )}
                  <button
                    className={`btn ${isConfirmingCancel ? "btn--danger" : "btn--secondary"}`}
                    onClick={() => handleCancelClick(o.id)}
                  >
                    {isConfirmingCancel ? "Confirm Cancel?" : "Cancel"}
                  </button>
                </div>
              </div>

              {isEditing && (
                <div style={{ marginTop: "10px", padding: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <label style={{ fontSize: "12px", flex: 1 }}>
                      Qty:
                      <input
                        type="number"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                        style={{ width: "100%", padding: "4px", marginTop: "2px" }}
                      />
                    </label>
                    {o.limitPrice !== undefined && (
                      <label style={{ fontSize: "12px", flex: 1 }}>
                        Limit Price:
                        <input
                          type="number"
                          step="0.01"
                          value={editLimitPrice}
                          onChange={(e) => setEditLimitPrice(e.target.value)}
                          style={{ width: "100%", padding: "4px", marginTop: "2px" }}
                        />
                      </label>
                    )}
                    {o.stopPrice !== undefined && (
                      <label style={{ fontSize: "12px", flex: 1 }}>
                        Stop Price:
                        <input
                          type="number"
                          step="0.01"
                          value={editStopPrice}
                          onChange={(e) => setEditStopPrice(e.target.value)}
                          style={{ width: "100%", padding: "4px", marginTop: "2px" }}
                        />
                      </label>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                    <button className="btn btn--secondary" onClick={() => setEditingOrderId(null)}>
                      Cancel Edit
                    </button>
                    <button className="btn" onClick={() => submitReplace(o.id)}>
                      Submit Replace
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card__title">Recent orders</div>
        {recent.length === 0 && <div className="empty">Nothing yet.</div>}
        {recent.map((o) => (
          <div key={o.id} className="row">
            <div>
              <div>
                <span className={`sym ${o.side === "buy" ? "up" : "down"}`}>{o.side.toUpperCase()}</span>{" "}
                <span className="sym">
                  {fmtQty(o.filledQty || o.qty)} {o.symbol}
                </span>{" "}
                <span className="pill pill--muted">{o.source}</span>
              </div>
              <div className="sub">
                {o.status}
                {o.filledAvgPrice ? ` @ ${fmtMoney(o.filledAvgPrice)}` : ""} · {fmtTime(o.filledAt ?? o.submittedAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}