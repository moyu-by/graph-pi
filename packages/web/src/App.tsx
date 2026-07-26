import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GraphPage from "./pages/GraphPage";
import { AgentProvider } from "@/hooks/useAgentContext";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AgentProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/graph/:id" element={<GraphPage />} />
        </Routes>
      </AgentProvider>
    </ErrorBoundary>
  );
}
