import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [host, setHost] = useState("");
  const navigate = useNavigate();

  const onSearch = (e) => {
    e?.preventDefault();
    const trimmed = host.trim();
    if (!trimmed) return;
    navigate(`/ip/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-xl bg-gray-800/60 backdrop-blur-md border border-gray-700 rounded-xl p-8 shadow-lg">
        <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-4">
          Minecraft Server Monitor
        </h1>
        <p className="text-gray-300 mb-6">
          Введите IP или хост сервера, чтобы посмотреть статус.
        </p>

        <form onSubmit={onSearch} className="flex gap-3">
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="example.com или play.example.ru:25565"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            onClick={onSearch}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-md font-medium"
          >
            Искать
          </button>
        </form>

        <p className="text-sm text-gray-400 mt-4">
          Поддерживается домен или IP + порт. Пример: <code>play.example.com</code>
        </p>
      </div>
    </div>
  );
}
