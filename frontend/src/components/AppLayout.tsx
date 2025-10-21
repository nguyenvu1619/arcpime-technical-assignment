import React, { useState } from "react";
import TabButton from "./TabButton";
import InventorSubmit from "./InventorSubmit";
import ICTriage from "./ICTriage";

const AppLayout: React.FC = () => {
  const [tab, setTab] = useState<"inventor" | "ic">("inventor");

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <header className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white grid place-items-center font-bold">A</div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">ArcPrime — Invention Disclosure Prototype</h1>
            <p className="text-gray-500 text-sm">Upload → Prefill → Submit • Triage with confidence & similarity</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <TabButton active={tab === "inventor"} onClick={() => setTab("inventor")}>Inventor — Submit</TabButton>
            <TabButton active={tab === "ic"} onClick={() => setTab("ic")}>IC — Triage</TabButton>
          </div>
        </header>

        {tab === "inventor" ? <InventorSubmit /> : <ICTriage />}

      </div>
    </div>
  );
};

export default AppLayout;


