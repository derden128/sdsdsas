import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ServerStatus from "./pages/ServerStatus";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ip/:host" element={<ServerStatus />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
