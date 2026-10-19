import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { BrokerAdapter } from "../broker/BrokerAdapter";
import { AlpacaAdapter } from "../broker/alpaca/AlpacaAdapter";
import type { RiskLimits } from "../config/risk";
import { useRiskLimits } from "../hooks/useRiskLimits";
import { OrderPipeline } from "../pipeline/orderPipeline";

interface BrokerCtx {
  broker: BrokerAdapter;
  /** Enforces the effective risk limits; replaced when they change in Settings. */
  pipeline: OrderPipeline;
  /** The limits `pipeline` enforces. */
  limits: RiskLimits;
}

const Ctx = createContext<BrokerCtx | null>(null);

export function BrokerProvider({ children }: { children: ReactNode }) {
  const { limits } = useRiskLimits();
  const broker = useMemo<BrokerAdapter>(() => new AlpacaAdapter(), []);
  const pipeline = useMemo(() => new OrderPipeline(broker, limits), [broker, limits]);
  const value = useMemo(() => ({ broker, pipeline, limits }), [broker, pipeline, limits]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBroker(): BrokerCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBroker must be used inside BrokerProvider");
  return v;
}
