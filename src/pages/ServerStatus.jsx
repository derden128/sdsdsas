import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import DOMPurify from "dompurify";

// ============ КОНСТАНТЫ ============
const API_BASE_URL = "https://api.mcsrvstat.us/3";
const AVATAR_API_URL = "https://api.mineatar.io/face";
const REQUEST_TIMEOUT = 10000;
const COPY_NOTIFICATION_DURATION = 1500;
const AUTO_REFRESH_INTERVAL = 10000;

// ============ ИКОНКИ ============
const Icons = {
  Users: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),

  Copy: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  ),

  Check: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),

  Play: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  ),

  Refresh: ({ spinning }) => (
    <svg className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  ),

  Signal: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="14" width="4" height="8" rx="1" />
      <rect x="10" y="10" width="4" height="12" rx="1" />
      <rect x="16" y="6" width="4" height="16" rx="1" />
    </svg>
  ),

  Cpu: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2" />
    </svg>
  ),

  Pulse: () => (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
};

// ============ УТИЛИТЫ ============
const calculatePlayerPercent = (online = 0, max = 0) => {
  if (!max || max <= 0) return 0;
  return Math.min(100, Math.round((online / max) * 100));
};

const parseMotdToHtml = (motd) => {
  if (!motd) return null;
  if (motd.html) return Array.isArray(motd.html) ? motd.html.join(" ") : String(motd.html);
  if (motd.clean) return Array.isArray(motd.clean) ? motd.clean.join(" ") : String(motd.clean);
  if (motd.raw) return (Array.isArray(motd.raw) ? motd.raw.join(" ") : String(motd.raw)).replace(/\n/g, " ");
  return String(motd);
};

const formatTime = (date) => {
  return date.toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
};

// ============ КОМПОНЕНТЫ ============

const LoadingScreen = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--tg-theme-bg-color)]">
    <div className="relative">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 animate-pulse" />
      <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 animate-ping opacity-20" />
    </div>
    <p className="text-[var(--tg-theme-hint-color)] text-sm font-medium">Загрузка...</p>
  </div>
);

const ErrorScreen = ({ error, onRetry, isRefreshing }) => (
  <div className="fixed inset-0 flex flex-col items-center justify-center px-8 bg-[var(--tg-theme-bg-color)]">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mb-4">
      <span className="text-white text-2xl font-bold">!</span>
    </div>
    <h2 className="text-[var(--tg-theme-text-color)] font-bold text-lg text-center">Ошибка загрузки</h2>
    <p className="text-[var(--tg-theme-hint-color)] text-sm mt-1 text-center">{error}</p>
    <button
      onClick={onRetry}
      disabled={isRefreshing}
      className="mt-5 flex items-center gap-2 bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] px-5 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50"
    >
      <Icons.Refresh spinning={isRefreshing} />
      Повторить
    </button>
  </div>
);

const LiveTimer = ({ lastUpdate, countdown, isRefreshing }) => {
  const getCountdownColor = () => {
    if (countdown <= 3) return 'text-emerald-400';
    if (countdown <= 5) return 'text-cyan-400';
    return 'text-[var(--tg-theme-hint-color)]';
  };

  const getCountdownEmoji = () => {
    if (isRefreshing) return '↻';
    if (countdown <= 2) return '⚡';
    if (countdown <= 4) return '◉';
    return '○';
  };

  return (
    <div className="flex items-center gap-3">
      {/* Live indicator */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Live</span>
      </div>

      {/* Timer pill */}
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--tg-theme-secondary-bg-color)] border border-white/5">
        {/* Countdown */}
        <div className="flex items-center gap-1">
          <span className={`text-xs font-mono transition-colors duration-300 ${getCountdownColor()}`}>
            {getCountdownEmoji()}
          </span>
          <span className={`text-xs font-bold font-mono tabular-nums transition-colors duration-300 ${getCountdownColor()}`}>
            {isRefreshing ? '...' : `${countdown}s`}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-3 bg-white/10" />

        {/* Last update */}
        <div className="flex items-center gap-1">
          <Icons.Pulse />
          <span className="text-[var(--tg-theme-hint-color)] text-[10px] font-medium font-mono">
            {formatTime(lastUpdate)}
          </span>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ isOnline }) => (
  <span className={`
    inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
    ${isOnline ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}
  `}>
    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
    {isOnline ? "Online" : "Offline"}
  </span>
);

const StatCard = ({ icon, value, label, gradient }) => (
  <div className="bg-[var(--tg-theme-secondary-bg-color)] rounded-xl p-3 flex-1">
    <div className={`inline-flex p-1.5 rounded-lg bg-gradient-to-br ${gradient} mb-2`}>
      {icon}
    </div>
    <p className="text-[var(--tg-theme-text-color)] font-bold text-base leading-none">{value}</p>
    <p className="text-[var(--tg-theme-hint-color)] text-[10px] font-medium mt-0.5 uppercase tracking-wide">{label}</p>
  </div>
);

const PlayerChip = ({ player }) => (
  <div className="flex items-center gap-1.5 bg-[var(--tg-theme-secondary-bg-color)] pl-1 pr-2 py-1 rounded-full">
    <img
      src={`${AVATAR_API_URL}/${player.uuid}?scale=4`}
      alt=""
      className="w-5 h-5 rounded-full"
      loading="lazy"
    />
    <span className="text-[var(--tg-theme-text-color)] text-xs font-medium truncate max-w-[60px]">
      {player.name}
    </span>
  </div>
);

// ============ ОСНОВНОЙ КОМПОНЕНТ ============
export default function ServerStatus() {
  const { host } = useParams();
  const [state, setState] = useState({ loading: true, error: null, info: null });
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const countdownRef = useRef(null);

  const startCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(10);
    
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return 10;
        return prev - 1;
      });
    }, 1000);
  }, []);

  const fetchServerData = useCallback(async (showSpinner = false) => {
    if (!host) return;

    if (showSpinner) {
      setState({ loading: true, error: null, info: null });
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/${encodeURIComponent(host)}`, { timeout: REQUEST_TIMEOUT });

      if (!response?.data || Object.keys(response.data).length === 0) {
        setState({ loading: false, error: "Сервер не найден", info: null });
      } else {
        setState({ loading: false, error: null, info: response.data });
        setLastUpdate(new Date());
      }
    } catch {
      setState(prev => ({
        ...prev,
        loading: false,
        error: prev.info ? null : "Ошибка подключения",
      }));
    } finally {
      setIsRefreshing(false);
      setCountdown(10);
    }
  }, [host]);

  useEffect(() => {
    fetchServerData(true);
    startCountdown();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchServerData, startCountdown]);

  useEffect(() => {
    const interval = setInterval(() => fetchServerData(false), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchServerData]);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.setHeaderColor('bg_color');
      tg.setBackgroundColor('bg_color');
      tg.disableVerticalSwipes?.();
    }
  }, []);

  const handleCopyIp = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(host);
      setCopied(true);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setTimeout(() => setCopied(false), COPY_NOTIFICATION_DURATION);
    } catch {}
  }, [host]);

  const handleRefresh = useCallback(() => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    fetchServerData(false);
  }, [fetchServerData]);

  const { loading, error, info } = state;

  if (loading) return <LoadingScreen />;
  if (error && !info) return <ErrorScreen error={error} onRetry={() => fetchServerData(true)} isRefreshing={isRefreshing} />;
  if (!info) return null;

  const online = info.players?.online ?? 0;
  const max = info.players?.max ?? 0;
  const percent = calculatePlayerPercent(online, max);
  const playerList = info.players?.list?.slice(0, 6) ?? [];
  const motdHtml = parseMotdToHtml(info.motd);

  return (
    <div 
      className="fixed inset-0 bg-[var(--tg-theme-bg-color)] flex flex-col overflow-hidden select-none"
      style={{
        '--tg-theme-bg-color': 'var(--tg-theme-bg-color, #0a0a0b)',
        '--tg-theme-secondary-bg-color': 'var(--tg-theme-secondary-bg-color, #18181b)',
        '--tg-theme-text-color': 'var(--tg-theme-text-color, #ffffff)',
        '--tg-theme-hint-color': 'var(--tg-theme-hint-color, #71717a)',
        '--tg-theme-button-color': 'var(--tg-theme-button-color, #3b82f6)',
        '--tg-theme-button-text-color': 'var(--tg-theme-button-text-color, #ffffff)',
      }}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2">
        {/* Live Timer Row */}
        <div className="flex items-center justify-between mb-3">
          <LiveTimer 
            lastUpdate={lastUpdate} 
            countdown={countdown} 
            isRefreshing={isRefreshing}
          />
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] flex items-center justify-center text-[var(--tg-theme-hint-color)] active:scale-90 transition-transform disabled:opacity-50 border border-white/5"
          >
            <Icons.Refresh spinning={isRefreshing} />
          </button>
        </div>

        {/* Server Info Row */}
        <div className="flex items-center gap-3">
          {/* Server Icon */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] overflow-hidden ring-2 ring-white/5">
              {info.icon ? (
                <img src={info.icon} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{String(host).slice(0, 2).toUpperCase()}</span>
                </div>
              )}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--tg-theme-bg-color)] ${info.online ? 'bg-emerald-400' : 'bg-red-400'}`} />
          </div>

          {/* Server Text */}
          <div className="flex-1 min-w-0">
            <h1 className="text-[var(--tg-theme-text-color)] font-bold text-base truncate leading-tight">{host}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge isOnline={info.online} />
              {info.version && (
                <span className="text-[var(--tg-theme-hint-color)] text-[10px] font-medium truncate">{info.version}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-3 min-h-0">
        {/* Stats */}
        <div className="flex gap-2 flex-shrink-0">
          <StatCard icon={<Icons.Users />} value={online} label="Онлайн" gradient="from-emerald-400 to-cyan-400 text-white" />
          <StatCard icon={<Icons.Signal />} value={max} label="Макс." gradient="from-violet-400 to-purple-400 text-white" />
          <StatCard icon={<Icons.Cpu />} value={`${percent}%`} label="Нагрузка" gradient="from-orange-400 to-pink-400 text-white" />
        </div>

        {/* Players */}
        {playerList.length > 0 && (
          <div className="flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--tg-theme-text-color)] text-xs font-semibold">Игроки</span>
              <span className="text-[var(--tg-theme-hint-color)] text-[10px]">{playerList.length} из {online}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {playerList.map((player) => (
                <PlayerChip key={player.uuid} player={player} />
              ))}
              {online > 6 && (
                <div className="flex items-center px-2 py-1 bg-[var(--tg-theme-secondary-bg-color)] rounded-full">
                  <span className="text-[var(--tg-theme-hint-color)] text-xs">+{online - 6}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MOTD */}
        {motdHtml && (
          <div className="flex-1 min-h-0 flex flex-col">
            <span className="text-[var(--tg-theme-text-color)] text-xs font-semibold mb-2 flex-shrink-0">Описание</span>
            <div className="bg-[var(--tg-theme-secondary-bg-color)] rounded-xl p-3 flex-1 min-h-0 overflow-hidden border border-white/5">
              <div
                className="text-[var(--tg-theme-text-color)] text-xs leading-relaxed font-mono line-clamp-3"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(motdHtml) }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2">
        <div className="flex gap-2">
          <button
            onClick={handleCopyIp}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm
              active:scale-[0.98] transition-all
              ${copied 
                ? "bg-emerald-500 text-white" 
                : "bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]"
              }
            `}
          >
            {copied ? <Icons.Check /> : <Icons.Copy />}
            {copied ? "Скопировано" : "Копировать"}
          </button>
          
          <a
            href={`minecraft://${host}`}
            className="flex-1 flex items-center justify-center gap-2 bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform border border-white/5"
          >
            <Icons.Play />
            Играть
          </a>
        </div>
      </div>
    </div>
  );
}