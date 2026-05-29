import React, { useState, useEffect } from "react";
import { DailyBoxOffice, KOBISBoxOfficeResponse } from "./types";
import MovieDetailModal from "./components/MovieDetailModal";
import { 
  Calendar, 
  Search, 
  TrendingUp, 
  Users, 
  Film, 
  Award, 
  ChevronRight, 
  Sparkles, 
  Eye, 
  RefreshCw, 
  ArrowUp, 
  ArrowDown, 
  Minus,
  HelpCircle,
  Clock,
  Tv
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Get helper dates in KST
const getKstYesterday = (): Date => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (3600000 * 9));
  kst.setDate(kst.getDate() - 1);
  return kst;
};

const formatDateToInputString = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateToYYYYMMDD = (dateStr: string): string => {
  return dateStr.replace(/-/g, "");
};

const formatPrettyDate = (dateStr: string): string => {
  if (!dateStr || dateStr.length !== 10) return dateStr;
  const parts = dateStr.split("-");
  return `${parts[0]}. ${parts[1]}. ${parts[2]}`;
};

// Numeric formats
const formatNumberWithCommas = (numStr: string | number): string => {
  const num = typeof numStr === "string" ? parseInt(numStr, 10) : numStr;
  if (isNaN(num)) return "0";
  return num.toLocaleString("ko-KR");
};

const formatWonCurrency = (wonStr: string): string => {
  const won = parseInt(wonStr, 10);
  if (isNaN(won)) return "0원";
  if (won >= 100000000) {
    return `${(won / 100000000).toFixed(1)}억원`;
  }
  if (won >= 10000) {
    return `${(won / 10000).toFixed(0)}만원`;
  }
  return `${won.toLocaleString("ko-KR")}원`;
};

export default function App() {
  const yesterday = getKstYesterday();
  const maxDateString = formatDateToInputString(yesterday);

  // States
  const [selectedDate, setSelectedDate] = useState<string>(maxDateString);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [boxOfficeList, setBoxOfficeList] = useState<DailyBoxOffice[]>([]);
  const [showRange, setShowRange] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeMovieId, setActiveMovieId] = useState<string | null>(null);
  const [activeMovieName, setActiveMovieName] = useState<string>("");

  // Statistics
  const [stats, setStats] = useState({
    topMovie: "",
    totalAudience: 0,
    maxShare: 0,
    totalShowCount: 0,
  });

  const loadBoxOfficeData = async (dateStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const yyyymmdd = formatDateToYYYYMMDD(dateStr);
      const response = await fetch(`/api/boxoffice?date=${yyyymmdd}`);
      if (!response.ok) {
        throw new Error("서버에서 정보를 불러오는데 실패했습니다.");
      }
      const data: KOBISBoxOfficeResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const list = data.boxOfficeResult?.dailyBoxOfficeList || [];
      setBoxOfficeList(list);
      setShowRange(data.boxOfficeResult?.showRange || "");

      // Aggregate Stats
      if (list.length > 0) {
        const top = list[0].movieNm;
        const totalAud = list.reduce((sum, item) => sum + parseInt(item.audiCnt || "0", 10), 0);
        const maxS = Math.max(...list.map(item => parseFloat(item.salesShare || "0")));
        const totalShow = list.reduce((sum, item) => sum + parseInt(item.showCnt || "0", 10), 0);

        setStats({
          topMovie: top,
          totalAudience: totalAud,
          maxShare: maxS,
          totalShowCount: totalShow,
        });
      } else {
        setStats({
          topMovie: "정보 없음",
          totalAudience: 0,
          maxShare: 0,
          totalShowCount: 0,
        });
      }
    } catch (err: any) {
      setError(err.message || "데이터 로딩 동안 에러가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoxOfficeData(selectedDate);
  }, [selectedDate]);

  const handlePreset = (offsetDays: number) => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const kst = new Date(utc + (3600000 * 9));
    kst.setDate(kst.getDate() - offsetDays);
    setSelectedDate(formatDateToInputString(kst));
  };

  // Live filter box office list
  const filteredList = boxOfficeList.filter((movie) => 
    movie.movieNm.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Divide filtered items for editorial rendering
  const spotlightMovie = filteredList[0];
  const runnerUpTwo = filteredList[1];
  const runnerUpThree = filteredList[2];
  const otherRunners = filteredList.slice(3);

  return (
    <div 
      id="content-root" 
      className="min-h-screen bg-[#0a0a0a] text-[#f2f2f2] flex flex-col font-serif antialiased selection:bg-red-600 selection:text-white"
    >
      {/* Editorial Header */}
      <header className="h-auto sm:h-28 flex flex-col sm:flex-row items-stretch sm:items-end justify-between px-6 sm:px-10 pb-6 pt-6 sm:pt-0 border-b border-zinc-800 gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-sans mb-1 font-semibold">
            KOBIS DAILY ARCHIVE
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter uppercase text-white font-serif">
            BOX OFFICE
          </h1>
        </div>

        {/* Dynamic Interactive Date Picker & controls */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-sans">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-semibold">
              Selected Date
            </span>
            <div className="relative flex items-center gap-2 border-b border-zinc-700 pb-1 hover:border-white transition-colors">
              <span className="text-sm sm:text-base font-bold text-white font-mono pointer-events-none">
                {formatPrettyDate(selectedDate)}
              </span>
              <input
                type="date"
                value={selectedDate}
                max={maxDateString}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                title="날짜 바꾸기"
              />
              <Calendar size={14} className="text-zinc-400" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end">
            <button
              onClick={() => handlePreset(1)}
              className={`text-[11px] font-bold px-3 py-1.5 uppercase transition-all duration-200 border ${
                selectedDate === formatDateToInputString(yesterday)
                  ? "bg-red-650 bg-red-600 text-white border-red-600"
                  : "bg-zinc-900 text-zinc-450 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              YESTERDAY
            </button>
            <button
              onClick={() => loadBoxOfficeData(selectedDate)}
              className="w-8 h-8 bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition"
              title="새로고침"
              aria-label="새로고침"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      {/* Filter / Navigation Belt */}
      <section className="bg-zinc-950 px-6 sm:px-10 py-3 border-b border-zinc-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-sans">
        {/* Quick Date Shortcuts Belt */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Presets:</span>
          {[
            { label: "3 Days ago", val: 3 },
            { label: "1 Week ago", val: 7 },
            { label: "1 Month ago", val: 30 }
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handlePreset(preset.val)}
              className="text-[10px] uppercase tracking-wider px-2 py-1 bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 transition"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Live Filter Input */}
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-500 pointer-events-none">
            <Search size={12} />
          </span>
          <input
            type="text"
            placeholder="제목 필터 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 focus:outline-none rounded-none text-xs pl-8 pr-3 py-1 text-white placeholder-zinc-500 font-sans"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 hover:text-white"
            >
              CLEAR
            </button>
          )}
        </div>
      </section>

      {/* Main Container */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-visible lg:overflow-hidden min-h-0">
        
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center font-sans space-y-4">
            <div className="w-10 h-10 border-2 border-red-650 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="text-sm tracking-widest text-zinc-400 uppercase font-bold">KOBIS 데이터 전송 수신 중</p>
              <p className="text-xs text-zinc-650 text-zinc-500 mt-1">영화진흥위원회의 데이터 스트림에 접속하였습니다.</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 py-24 text-center font-sans space-y-5">
            <div className="w-12 h-12 rounded-full border border-red-900 bg-red-950/30 flex items-center justify-center text-red-500">
              <HelpCircle size={24} />
            </div>
            <div>
              <p className="text-sm tracking-widest text-zinc-300 uppercase font-semibold">데이터 동기화 실패</p>
              <p className="text-xs text-red-400 max-w-md mx-auto mt-2 font-mono bg-zinc-950 p-3 border border-red-950 rounded">
                {error}
              </p>
            </div>
            <button
              onClick={() => loadBoxOfficeData(selectedDate)}
              className="bg-red-600 hover:bg-red-700 text-white font-sans font-bold text-xs px-5 py-2.5 transition"
            >
              다시 시도
            </button>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 py-24 text-center font-sans space-y-4">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <Search size={20} />
            </div>
            <div>
              <p className="text-sm text-zinc-300 uppercase tracking-widest font-bold">결과 없음</p>
              <p className="text-xs text-zinc-500 max-w-xs mt-1">
                {searchQuery ? `"${searchQuery}" 검색 조건에 일치하는 박스오피스 상위 영화가 존재하지 않습니다.` : "해당 날짜의 데이터 스키마가 아직 산출되지 않았습니다."}
              </p>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-zinc-400 border-b border-zinc-500 hover:text-white transition"
              >
                필터 지우기
              </button>
            )}
          </div>
        ) : (
          <>
            {/* LEFT COLUMN: Spotlight movie, plus #2 and #3 cards */}
            <section className="w-full lg:w-[60%] flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800 p-6 sm:p-10 justify-between gap-12 overflow-y-auto">
              
              {/* spotlight Rank 1 */}
              {spotlightMovie && (
                <div 
                  className="relative flex-1 flex flex-col justify-center py-6 cursor-pointer group"
                  onClick={() => {
                    setActiveMovieId(spotlightMovie.movieCd);
                    setActiveMovieName(spotlightMovie.movieNm);
                  }}
                >
                  <span className="absolute -left-2 sm:-left-6 top-0 text-[180px] sm:text-[240px] font-black leading-none text-zinc-900/40 -z-10 select-none font-sans tracking-tighter">
                    {spotlightMovie.rank.padStart(2, "0")}
                  </span>
                  
                  <div className="pl-6 sm:pl-20">
                    <span className="inline-block bg-red-650 bg-red-600 text-white text-[9px] sm:text-[10px] px-2.5 py-0.5 mb-4 font-sans font-bold tracking-widest uppercase">
                      {spotlightMovie.rankOldAndNew === "NEW" ? "NEW ARRIVAL" : "BOX OFFICE SPOTLIGHT"}
                    </span>
                    
                    <h2 className="text-4xl sm:text-7xl font-sans font-black leading-[0.9] tracking-tight mb-6 text-white group-hover:text-red-500 transition-colors uppercase break-words pr-2 line-clamp-3">
                      {spotlightMovie.movieNm}
                    </h2>
                    
                    <div className="flex flex-wrap gap-8 font-sans">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-zinc-500 tracking-widest font-bold">Daily Audience</span>
                        <span className="text-xl sm:text-2xl font-light font-mono text-zinc-100">
                          {formatNumberWithCommas(spotlightMovie.audiCnt)}명
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-zinc-500 tracking-widest font-bold">Rank Change</span>
                        {spotlightMovie.rankOldAndNew === "NEW" ? (
                          <span className="text-xl sm:text-2xl font-bold font-mono text-red-500">NEW</span>
                        ) : parseInt(spotlightMovie.rankInten, 10) > 0 ? (
                          <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-500">
                            ▲{spotlightMovie.rankInten}
                          </span>
                        ) : parseInt(spotlightMovie.rankInten, 10) < 0 ? (
                          <span className="text-xl sm:text-2xl font-bold font-mono text-zinc-500">
                            ▼{Math.abs(parseInt(spotlightMovie.rankInten, 10))}
                          </span>
                        ) : (
                          <span className="text-xl sm:text-2xl font-light font-mono text-zinc-400">0</span>
                        )}
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-zinc-500 tracking-widest font-bold">Total Audience</span>
                        <span className="text-xl sm:text-2xl font-light font-mono text-zinc-100">
                          {formatNumberWithCommas(spotlightMovie.audiAcc)}명
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition font-sans">
                      <span>영화 상세 정보 및 출연 배우 보기</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              )}

              {/* Ranks 2 and 3 blocks */}
              <div className="border-t border-zinc-800 pt-8 flex flex-col sm:flex-row gap-8">
                {/* Runner 02 */}
                {runnerUpTwo ? (
                  <div 
                    className="flex-1 group cursor-pointer"
                    onClick={() => {
                      setActiveMovieId(runnerUpTwo.movieCd);
                      setActiveMovieName(runnerUpTwo.movieNm);
                    }}
                  >
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-3xl sm:text-4xl font-extrabold font-sans text-zinc-700">02</span>
                      <h3 className="text-lg sm:text-xl font-bold truncate tracking-tight text-white group-hover:text-red-500 transition-colors uppercase">
                        {runnerUpTwo.movieNm}
                      </h3>
                    </div>
                    <div className="h-1 bg-zinc-850 bg-zinc-900 w-full overflow-hidden">
                      <div 
                        className="h-full bg-red-650 bg-red-600 transition-all duration-300" 
                        style={{ width: `${Math.max(10, parseFloat(runnerUpTwo.salesShare) || 20)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[11px] font-sans mt-2 uppercase text-zinc-500 font-bold">
                      <span className="font-mono">점유율 {runnerUpTwo.salesShare}%</span>
                      {parseInt(runnerUpTwo.rankInten, 10) > 0 ? (
                        <span className="text-emerald-500 font-mono">▲ {runnerUpTwo.rankInten}</span>
                      ) : parseInt(runnerUpTwo.rankInten, 10) < 0 ? (
                        <span className="text-zinc-500 font-mono">▼ {Math.abs(parseInt(runnerUpTwo.rankInten, 10))}</span>
                      ) : (
                        <span className="text-zinc-500 font-mono">- 0</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 bg-zinc-950/10 p-4 border border-zinc-900 text-center text-zinc-600 text-xs italic">
                    대기중인 영화 데이터가 없습니다.
                  </div>
                )}

                {/* Runner 03 */}
                {runnerUpThree ? (
                  <div 
                    className="flex-1 group cursor-pointer"
                    onClick={() => {
                      setActiveMovieId(runnerUpThree.movieCd);
                      setActiveMovieName(runnerUpThree.movieNm);
                    }}
                  >
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-3xl sm:text-4xl font-extrabold font-sans text-zinc-700">03</span>
                      <h3 className="text-lg sm:text-xl font-bold truncate tracking-tight text-white group-hover:text-red-500 transition-colors uppercase">
                        {runnerUpThree.movieNm}
                      </h3>
                    </div>
                    <div className="h-1 bg-zinc-850 bg-zinc-900 w-full overflow-hidden">
                      <div 
                        className="h-full bg-zinc-400 transition-all duration-300" 
                        style={{ width: `${Math.max(10, parseFloat(runnerUpThree.salesShare) || 20)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[11px] font-sans mt-2 uppercase text-zinc-500 font-bold">
                      <span className="font-mono">점유율 {runnerUpThree.salesShare}%</span>
                      {parseInt(runnerUpThree.rankInten, 10) > 0 ? (
                        <span className="text-emerald-500 font-mono">▲ {runnerUpThree.rankInten}</span>
                      ) : parseInt(runnerUpThree.rankInten, 10) < 0 ? (
                        <span className="text-zinc-500 font-mono">▼ {Math.abs(parseInt(runnerUpThree.rankInten, 10))}</span>
                      ) : (
                        <span className="text-zinc-500 font-mono">- 0</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 bg-zinc-950/10 p-4 border border-zinc-900 text-center text-zinc-600 text-xs italic">
                    대기중인 영화 데이터가 없습니다.
                  </div>
                )}
              </div>

            </section>

            {/* RIGHT COLUMN: Runners Up 04-10 in beautiful vertical list */}
            <section className="w-full lg:w-[40%] flex flex-col p-6 sm:p-10 justify-between overflow-y-auto">
              
              <div className="space-y-6">
                <div className="flex justify-between items-baseline pb-2 border-b border-zinc-805 border-zinc-800">
                  <h4 className="text-[10px] uppercase tracking-[0.4em] text-zinc-400 font-sans font-extrabold">
                    Runner Ups 04-10
                  </h4>
                  <span className="text-[10px] text-zinc-650 text-zinc-500 font-sans italic">
                    Sorted by Rank
                  </span>
                </div>

                <div className="flex flex-col">
                  {otherRunners.length > 0 ? (
                    otherRunners.map((movie) => {
                      const rankIntenNum = parseInt(movie.rankInten, 10);
                      const isNew = movie.rankOldAndNew === "NEW";

                      return (
                        <div
                          key={movie.movieCd}
                          onClick={() => {
                            setActiveMovieId(movie.movieCd);
                            setActiveMovieName(movie.movieNm);
                          }}
                          className="group flex items-center justify-between py-3.5 border-b border-zinc-900 hover:bg-zinc-900/50 transition-colors px-2 cursor-pointer"
                        >
                          <div className="flex items-center gap-4 min-w-0 pr-2">
                            <span className="font-sans text-zinc-600 font-extrabold w-5 text-sm sm:text-base">
                              {movie.rank.padStart(2, "0")}
                            </span>
                            <span className="font-semibold text-sm sm:text-base text-zinc-100 group-hover:text-red-500 transition-colors truncate">
                              {movie.movieNm}
                            </span>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <div className="text-xs sm:text-sm font-mono text-zinc-200">
                              {formatNumberWithCommas(movie.audiCnt)}명
                            </div>
                            <div className="text-[10px] uppercase tracking-wider font-sans font-bold flex justify-end">
                              {isNew ? (
                                <span className="text-red-500">NEW</span>
                              ) : rankIntenNum > 0 ? (
                                <span className="text-emerald-500">▲ {rankIntenNum}</span>
                              ) : rankIntenNum < 0 ? (
                                <span className="text-zinc-500">▼ {Math.abs(rankIntenNum)}</span>
                              ) : (
                                <span className="text-zinc-600">- 0</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-zinc-500 text-xs italic font-sans">
                      추가 상위 목록이 존재하지 않습니다.
                    </div>
                  )}
                </div>
              </div>

              {/* Aggregated Daily Quick stats bottom metadata block */}
              <div className="mt-8 pt-6 border-t border-zinc-800 grid grid-cols-2 gap-4 font-sans">
                <div className="bg-zinc-950 p-3.5 border border-zinc-900">
                  <span className="text-[9px] uppercase tracking-widest text-[#f03e3e]">TOP PICKS SHARE</span>
                  <p className="text-lg sm:text-xl font-bold font-mono text-white mt-1">{stats.maxShare}%</p>
                </div>
                <div className="bg-zinc-950 p-3.5 border border-zinc-900">
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500">TOTAL CAPTURE</span>
                  <p className="text-lg sm:text-xl font-bold font-mono text-white mt-1">
                    {formatNumberWithCommas(stats.totalAudience)}
                  </p>
                </div>
              </div>

            </section>
          </>
        )}

      </main>

      {/* Styled Footnote */}
      <footer className="h-auto sm:h-12 bg-zinc-900 border-t border-zinc-850 flex flex-col sm:flex-row items-center justify-between px-6 sm:px-10 py-4 sm:py-0 text-[10px] font-sans uppercase tracking-[0.2em] text-zinc-500 gap-2 text-center">
        <div>KOREN FILM COUNCIL / KOBIS OPEN API DATA VISUALIZATION</div>
        <div>STABLE CONTEXT ENGINE (© 2026)</div>
      </footer>

      {/* Detail Movie Info overlay dialog */}
      {activeMovieId && (
        <MovieDetailModal
          movieCd={activeMovieId}
          movieNm={activeMovieName}
          onClose={() => {
            setActiveMovieId(null);
            setActiveMovieName("");
          }}
        />
      )}

    </div>
  );
}
