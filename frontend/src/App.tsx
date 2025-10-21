import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DisclosureDetail from "./components/DisclosureDetail";
import AppLayout from "./components/AppLayout";

export default function ArcPrimeIDFUI() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />} />
        <Route path="/disclosure/:id" element={<DisclosureDetail />} />
      </Routes>
    </Router>
  );
}


