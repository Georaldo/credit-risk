export type OfficerTab =
  | "overview"
  | "models"
  | "predict"
  | "shap";

export type CustomerTab =
  | "credit_decision"
  | "risk_factors";

export type ManagerTab =
  | "dashboard_overview"
  | "portfolio_kpis"
  | "applications_processed";

// Full union for sidebar
export type TabType = OfficerTab | CustomerTab | ManagerTab;
