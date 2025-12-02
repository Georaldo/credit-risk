// components/CustomerDashboard.tsx
export interface CustomerDashboardProps {
  creditDecision: { risk: string; probability?: number };
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ creditDecision }) => {
  return (
    <div>
      <h1 className="text-xl font-bold mb-2">Your Credit Decision</h1>
      <p>Risk Level: <span className={creditDecision.risk === "High" ? "text-red-600" : "text-green-600"}>{creditDecision.risk}</span></p>
      {creditDecision.probability && <p>Probability: {creditDecision.probability}</p>}
    </div>
  );
};

export default CustomerDashboard;
