import React, { useEffect, useState } from "react";
import { MovieInfo, KOBISMovieInfoResponse } from "../types";
import { X, Calendar, Clock, Film, Award, Users, Building, ShieldCheck, HelpCircle, Sparkles, Copy, Check, RotateCcw, MessageSquareQuote } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";

interface MovieDetailModalProps {
  movieCd: string;
  movieNm: string;
  onClose: () => void;
}

export default function MovieDetailModal({ movieCd, movieNm, onClose }: MovieDetailModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [movieInfo, setMovieInfo] = useState<MovieInfo | null>(null);

  // AI Movie Review Generator States
  const [userReviewInput, setUserReviewInput] = useState<string>(() => {
    return localStorage.getItem(`draft_brief_${movieCd}`) || "";
  });
  const [generatedReview, setGeneratedReview] = useState<string>(() => {
    return localStorage.getItem(`generated_detail_${movieCd}`) || "";
  });
  const [generating, setGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const quickPresets = [
    "압도적인 배우들의 연기력과 밀도 높은 긴장감!",
    "눈물이 멈추지 않는 감동적인 연출과 대단한 서사",
    "독창적인 장르적 재미와 감각적인 비주얼이 완벽함",
    "깊은 쓸쓸함 끝에 찾아오는 참 따스한 인생 명작"
  ];

  const handleGenerateReview = async () => {
    if (!userReviewInput.trim()) return;
    setGenerating(true);
    setGenerationError(null);
    try {
      const response = await fetch("/api/generate-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieNm,
          userReview: userReviewInput,
          movieInfo: movieInfo,
        }),
      });

      if (!response.ok) {
        throw new Error("AI 상세 감상평 작성 중 서버 오류가 발생하였습니다.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedReview(data.review);
      localStorage.setItem(`draft_brief_${movieCd}`, userReviewInput);
      localStorage.setItem(`generated_detail_${movieCd}`, data.review);
    } catch (err: any) {
      setGenerationError(err.message || "감상평 생성 도중 예상치 못한 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyReview = () => {
    if (!generatedReview) return;
    navigator.clipboard.writeText(generatedReview)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  const handleResetReview = () => {
    if (window.confirm("작성된 감상평과 생성된 상세 평론을 모두 삭제하시겠습니까?")) {
      setUserReviewInput("");
      setGeneratedReview("");
      localStorage.removeItem(`draft_brief_${movieCd}`);
      localStorage.removeItem(`generated_detail_${movieCd}`);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchMovieInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/movieinfo?movieCd=${movieCd}`);
        if (!response.ok) {
          throw new Error("영화 정보를 불러오는 데 실패했습니다.");
        }
        const data: KOBISMovieInfoResponse = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        if (isMounted) {
          if (data.movieInfoResult?.movieInfo) {
            setMovieInfo(data.movieInfoResult.movieInfo);
          } else {
            throw new Error("영화 상세 데이터가 없습니다.");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "오류가 발생했습니다.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMovieInfo();
    return () => {
      isMounted = false;
    };
  }, [movieCd]);

  // Prevent scroll propagation on body when overlay is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Format release date (YYYYMMDD to YYYY.MM.DD)
  const formatReleaseDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return dateStr || "-";
    return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
  };

  // Get audit badge color formatted for dark themes
  const getAuditBadgeClass = (watchGrade: string) => {
    if (!watchGrade) return "bg-zinc-900 text-zinc-400 border-zinc-800";
    if (watchGrade.includes("전체")) return "bg-emerald-950/40 text-emerald-400 border-emerald-900/50";
    if (watchGrade.includes("12")) return "bg-blue-950/40 text-blue-400 border-blue-900/50";
    if (watchGrade.includes("15")) return "bg-amber-950/40 text-amber-450 text-amber-400 border-amber-900/50";
    if (watchGrade.includes("18") || watchGrade.includes("청소년")) return "bg-red-950/40 text-red-400 border-red-900/50";
    return "bg-zinc-900 text-zinc-300 border-zinc-800";
  };

  return (
    <AnimatePresence>
      <div 
        id="modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs transition-opacity duration-300"
        onClick={(e) => {
          if ((e.target as HTMLElement).id === "modal-overlay") {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden bg-zinc-950 rounded-none border border-zinc-800 flex flex-col shadow-2xl font-serif text-zinc-100"
        >
          {/* Header section with minimal high contrast rules */}
          <div className="flex items-start justify-between p-6 sm:p-8 border-b border-zinc-800 bg-zinc-900/30">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2 font-sans text-[10px] font-bold tracking-widest uppercase">
                <span className="px-2 py-0.5 bg-red-600 text-white rounded-none">
                  CODE: {movieCd}
                </span>
                {movieInfo?.typeNm && (
                  <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-none border border-zinc-755 border-zinc-700">
                    {movieInfo.typeNm}
                  </span>
                )}
                {movieInfo?.prdtStatNm && movieInfo.prdtStatNm !== "개봉" && (
                  <span className="px-2 py-0.5 bg-zinc-900 text-amber-500 border border-amber-950 rounded-none">
                    {movieInfo.prdtStatNm}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mr-8 uppercase font-serif">
                {movieNm}
              </h2>
              {movieInfo?.movieNmEn && (
                <p className="text-xs sm:text-sm text-zinc-500 font-mono italic mt-1 pb-1">
                  {movieInfo.movieNmEn}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-zinc-550 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content (Sleek dark custom scrollbar fallback) */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
            {loading ? (
              <div className="space-y-6 py-12">
                <div className="flex items-center justify-center space-x-2 text-zinc-400 font-sans">
                  <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs tracking-widest uppercase font-bold">영화사 데이터 수신 중...</span>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-zinc-900 rounded-none w-1/3 animate-pulse"></div>
                  <div className="h-8 bg-zinc-900 rounded-none animate-pulse"></div>
                  <div className="h-20 bg-zinc-900 rounded-none animate-pulse"></div>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center font-sans">
                <HelpCircle className="text-red-500 w-12 h-12 mb-3" />
                <h3 className="font-semibold text-zinc-200 text-lg mb-1 uppercase tracking-widest">수신 정보 누락</h3>
                <p className="text-xs text-zinc-505 text-zinc-550 text-zinc-500 max-w-md">{error}</p>
                <button
                  onClick={onClose}
                  className="mt-6 px-4 py-2 bg-zinc-905 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition"
                >
                  닫기
                </button>
              </div>
            ) : movieInfo ? (
              <div className="space-y-8">
                
                {/* Meta Highlights Grid with editorial boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-sans">
                  <div className="bg-zinc-900/50 p-3 border border-zinc-850 flex items-center gap-3">
                    <Calendar className="text-red-500 shrink-0" size={16} />
                    <div>
                      <p className="text-[10px] uppercase text-zinc-500 tracking-wider font-bold">개봉일</p>
                      <p className="text-xs sm:text-sm font-semibold text-zinc-250 font-mono mt-0.5">
                        {formatReleaseDate(movieInfo.openDt)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 p-3 border border-zinc-850 flex items-center gap-3">
                    <Clock className="text-amber-500 shrink-0" size={16} />
                    <div>
                      <p className="text-[10px] uppercase text-zinc-500 tracking-wider font-bold">상영시간</p>
                      <p className="text-xs sm:text-sm font-semibold text-zinc-250 font-mono mt-0.5">
                        {movieInfo.showTm ? `${movieInfo.showTm}분` : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 p-3 border border-zinc-850 flex items-center gap-3">
                    <ShieldCheck className="text-emerald-500 shrink-0" size={16} />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase text-zinc-500 tracking-wider font-bold">관람심의</p>
                      <span className={`inline-block text-[10px] sm:text-[11px] font-bold px-2 py-0.5 border ${getAuditBadgeClass(movieInfo.audits?.[0]?.watchGradeNm || "")} truncate max-w-full mt-0.5`}>
                        {movieInfo.audits?.[0]?.watchGradeNm || "심의 대기"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 p-3 border border-zinc-850 flex items-center gap-3">
                    <Film className="text-blue-500 shrink-0" size={16} />
                    <div>
                      <p className="text-[10px] uppercase text-zinc-500 tracking-wider font-bold">제작국가</p>
                      <p className="text-xs sm:text-sm font-semibold text-zinc-250 truncate mt-0.5">
                        {movieInfo.nations?.map(n => n.nationNm).join(", ") || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Genre Badges */}
                {movieInfo.genres?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center font-sans">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-2">GENRES / 장르</span>
                    {movieInfo.genres.map((g, i) => (
                      <span key={i} className="px-2.5 py-1 text-[10px] font-bold bg-zinc-900 text-zinc-300 border border-zinc-850 uppercase tracking-wider">
                        {g.genreNm}
                      </span>
                    ))}
                  </div>
                )}

                {/* AI Review Critic Section */}
                <div id="ai-review-section" className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-none space-y-5 font-sans relative overflow-hidden">
                  <div className="absolute top-0 right-0 py-1.5 px-3 bg-red-600/10 border-l border-b border-zinc-800 text-[9px] uppercase tracking-widest text-red-500 font-extrabold flex items-center gap-1">
                    <Sparkles size={10} className="animate-pulse text-red-500" />
                    <span>A.I. Review Critic</span>
                  </div>

                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/80">
                    <MessageSquareQuote size={18} className="text-red-500" />
                    <h3 className="text-xs font-extrabold tracking-[0.2em] uppercase text-zinc-300">
                      심층 비평 작성기 (A.I. Review Generator)
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold flex justify-between">
                        <span>나의 간단한 감상 키워드 / 한 줄평</span>
                        <span className="text-zinc-500 font-mono font-medium">{userReviewInput.length} / 120자</span>
                      </label>
                      <textarea
                        value={userReviewInput}
                        onChange={(e) => setUserReviewInput(e.target.value.slice(0, 120))}
                        placeholder="이 영화에 대해 느낀 주관적 감상이나 핵심 단어(예: 압권적인 반전, 배우들의 연기 구멍 없음, 우울하지만 힐링되는 명작)를 입력해 주세요. 평론가풍의 화려한 리뷰를 완성합니다."
                        className="w-full h-18 text-xs sm:text-sm bg-zinc-950 border border-zinc-800 p-3 rounded-none text-zinc-100 placeholder-zinc-650 focus:border-red-600 focus:outline-none focus:ring-0 leading-relaxed font-sans resize-none"
                      />
                    </div>

                    {/* Presets Grid */}
                    {!generatedReview && (
                      <div className="space-y-2">
                        <span className="text-[9px] uppercase tracking-widest font-extrabold text-zinc-500 block">쉽고 빠르게 쓰기 권장 키워드</span>
                        <div className="flex flex-wrap gap-1.5">
                          {quickPresets.map((preset, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setUserReviewInput((prev) => {
                                  const trimmed = prev.trim();
                                  let nextText = preset;
                                  if (trimmed) {
                                    if (trimmed.endsWith(".") || trimmed.endsWith("!")) {
                                      nextText = `${trimmed} ${preset}`;
                                    } else {
                                      nextText = `${trimmed}, ${preset}`;
                                    }
                                  }
                                  return nextText.slice(0, 120);
                                });
                              }}
                              className="text-[10px] px-2.5 py-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition font-sans cursor-pointer"
                            >
                              + {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      {generatedReview ? (
                        <button
                          type="button"
                          onClick={handleResetReview}
                          className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-red-500 uppercase tracking-widest font-bold transition duration-200 cursor-pointer"
                        >
                          <RotateCcw size={11} />
                          감상평 초기화
                        </button>
                      ) : (
                        <div />
                      )}

                      <button
                        type="button"
                        onClick={handleGenerateReview}
                        disabled={generating || !userReviewInput.trim()}
                        className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-widest border transition duration-300 cursor-pointer ${
                          !userReviewInput.trim()
                            ? "border-zinc-800 text-zinc-600 bg-zinc-950/20 cursor-not-allowed"
                            : generating
                            ? "border-amber-600 text-amber-500 bg-amber-950/10 cursor-wait"
                            : "border-red-600 text-white bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-950/20"
                        }`}
                      >
                        {generating ? (
                          <>
                            <div className="w-3.5 h-3.5 border border-amber-500 border-t-transparent rounded-full animate-spin" />
                            <span>영화 평론 작성 중...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={12} className="text-white" />
                            <span>상세 평론지 작성 요청</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Rendering the Error */}
                  {generationError && (
                    <div className="bg-red-950/20 border border-red-900/50 p-3 sm:p-4 text-xs font-sans text-red-400">
                      {generationError}
                    </div>
                  )}

                  {/* Generated Card Container */}
                  <AnimatePresence>
                    {generatedReview && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-xl relative space-y-4 mt-2">
                          <div className="flex items-center justify-between pb-3 border-b border-zinc-900 font-sans">
                            <div className="flex items-center gap-1.5 text-zinc-400">
                              <Film size={12} className="text-red-500" />
                              <span className="text-[10px] uppercase tracking-wider font-extrabold sm:block hidden">KOBIS CRITICS UNION REPORT</span>
                              <span className="text-[10px] uppercase tracking-wider font-extrabold sm:hidden block">AI ADVISOR REPORT</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleCopyReview}
                                className={`flex items-center gap-1 px-2.5 py-1 text-[10px] uppercase tracking-wider border rounded-none transition duration-200 font-sans font-bold cursor-pointer ${
                                  copied 
                                    ? "bg-emerald-950/40 border-emerald-900 text-emerald-400 font-bold" 
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                                }`}
                              >
                                {copied ? <Check size={10} /> : <Copy size={10} />}
                                {copied ? "복사 완료" : "평론 복사"}
                              </button>
                            </div>
                          </div>

                          {/* Render Markdown block */}
                          <div className="font-sans text-zinc-300 leading-relaxed text-sm antialiased border-b border-dashed border-zinc-900 pb-4">
                            <Markdown
                              components={{
                                h1: ({node, ...props}) => <h3 className="text-base sm:text-lg font-extrabold text-white mt-5 mb-2 font-serif" {...props} />,
                                h2: ({node, ...props}) => <h4 className="text-sm sm:text-base font-bold text-white mt-4 mb-2 font-serif" {...props} />,
                                p: ({node, ...props}) => <p className="text-zinc-300 leading-relaxed text-xs sm:text-sm mb-4 font-sans" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 mb-4 text-zinc-400 font-sans" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 mb-4 text-zinc-400 font-sans" {...props} />,
                                li: ({node, ...props}) => <li className="text-zinc-300 text-xs sm:text-sm pl-1 font-sans" {...props} />,
                                strong: ({node, ...props}) => <strong className="text-white font-bold" {...props} />,
                                em: ({node, ...props}) => <em className="text-zinc-400 italic" {...props} />,
                                blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-red-600 pl-3.5 italic text-zinc-400 my-3 font-sans bg-zinc-900/40 py-1.5 px-3" {...props} />
                              }}
                            >
                              {generatedReview}
                            </Markdown>
                          </div>

                          <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-[#a1a1aa] text-zinc-500 font-sans pt-1 font-bold select-none col-span-2">
                            <span>CRITIC ASSIST: GEMINI-3.5-FLASH</span>
                            <span>OFFICIAL ARCHIVE</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Directors Block */}
                <div>
                  <h3 className="flex items-center gap-2 text-xs font-bold text-zinc-400 border-b border-zinc-800 pb-2 mb-4 font-sans uppercase tracking-[0.2em]">
                    <Award size={14} className="text-red-500" />
                    감독 (Directors)
                  </h3>
                  {movieInfo.directors?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {movieInfo.directors.map((dir, idx) => (
                        <div key={idx} className="p-3.5 border border-zinc-850 bg-zinc-900/20">
                          <p className="text-sm font-bold text-white uppercase font-sans">{dir.peopleNm}</p>
                          {dir.peopleNmEn && (
                            <p className="text-[11px] text-zinc-500 font-mono italic mt-0.5">{dir.peopleNmEn}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic font-sans uppercase tracking-wider">No director information returned.</p>
                  )}
                </div>

                {/* Actors Block */}
                <div>
                  <h3 className="flex items-center gap-2 text-xs font-bold text-zinc-400 border-b border-zinc-800 pb-2 mb-4 font-sans uppercase tracking-[0.2em]">
                    <Users size={14} className="text-blue-500" />
                    출연 배우 (Cast members)
                  </h3>
                  {movieInfo.actors?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {movieInfo.actors.map((actor, idx) => (
                        <div key={idx} className="p-3.5 border border-zinc-850 bg-zinc-900/30 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] text-zinc-500 font-bold font-sans uppercase tracking-widest block mb-1">
                              ROLE: {actor.cast || "SECRET"}
                            </span>
                            <p className="text-sm font-bold text-white font-sans">{actor.peopleNm}</p>
                          </div>
                          {actor.peopleNmEn && (
                            <p className="text-[10px] text-zinc-500 font-mono italic mt-2 truncate">{actor.peopleNmEn}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic font-sans uppercase tracking-wider">No actor information registered.</p>
                  )}
                </div>

                {/* Companies Section */}
                {movieInfo.companys?.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-bold text-zinc-400 border-b border-zinc-800 pb-2 mb-4 font-sans uppercase tracking-[0.2em]">
                      <Building size={14} className="text-emerald-500" />
                      참여 영화사 (Participating Companies)
                    </h3>
                    <div className="overflow-x-auto min-w-full">
                      <table className="min-w-full divide-y divide-zinc-900 text-left font-sans">
                        <thead>
                          <tr className="bg-zinc-900/40 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                            <th className="px-3 py-2">회사구분</th>
                            <th className="px-3 py-2">회사명</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                          {movieInfo.companys.map((comp, idx) => (
                            <tr key={idx} className="hover:bg-zinc-900/30">
                              <td className="px-3 py-2.5 text-xs font-medium">
                                <span className="inline-block px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-800 text-[10px] uppercase font-bold tracking-wider">
                                  {comp.companyPartNm}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-xs text-zinc-300">
                                <p className="font-bold text-zinc-200">{comp.companyNm}</p>
                                {comp.companyNmEn && (
                                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5 italic">{comp.companyNmEn}</p>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Staff list collapsible */}
                {movieInfo.staffs?.length > 0 && (
                  <div className="font-sans">
                    <button 
                      type="button"
                      className="text-[11px] text-zinc-500 font-bold hover:text-zinc-300 flex items-center gap-1.5 focus:outline-none uppercase tracking-widest border border-zinc-900 p-2.5 w-full bg-zinc-900/10 justify-between transition"
                      onClick={(e) => {
                        const sibling = (e.currentTarget.nextElementSibling as HTMLElement);
                        if (sibling) {
                          sibling.classList.toggle('hidden');
                        }
                      }}
                    >
                      <span>▶ TECHNICAL STAFF DETAILS / 스태프 정보 ({movieInfo.staffs.length}명)</span>
                      <span>COLLAPSE/EXPAND</span>
                    </button>
                    <div className="hidden mt-3 p-4 bg-zinc-900/30 border border-zinc-850 max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {movieInfo.staffs.slice(0, 45).map((stf, idx) => (
                          <div key={idx} className="text-[11px]">
                            <span className="font-bold text-zinc-200">{stf.peopleNm}</span>{" "}
                            <span className="text-zinc-500 font-medium">({stf.staffRoleNm})</span>
                          </div>
                        ))}
                        {movieInfo.staffs.length > 45 && (
                          <div className="text-[11px] text-zinc-500 italic mt-1 font-bold">외 {movieInfo.staffs.length - 45}명 추가 등록됨</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between text-[10px] text-zinc-500 font-sans uppercase tracking-[0.2em] gap-3 font-semibold text-center">
            <span>DATA BY KOREAN FILM COUNCIL (KOBIS API)</span>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-red-650 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] transition rounded-none uppercase tracking-widest shadow-lg shadow-red-950/20"
            >
              Close Detail
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
