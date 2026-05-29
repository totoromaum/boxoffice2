import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Box Office proxy
  app.get("/api/boxoffice", async (req, res) => {
    try {
      const date = req.query.date as string;
      if (!date || !/^\d{8}$/.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Expected YYYYMMDD." });
      }
      
      const key = process.env.KOBIS_API_KEY;
      if (!key) {
        return res.status(500).json({ error: "KOBIS API key is missing from environment secrets." });
      }
      
      const url = `http://kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json?key=${key}&targetDt=${date}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`KOBIS API returned status ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Box office fetch error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch box office data." });
    }
  });

  // API Route: Movie Info proxy
  app.get("/api/movieinfo", async (req, res) => {
    try {
      const movieCd = req.query.movieCd as string;
      if (!movieCd) {
        return res.status(400).json({ error: "movieCd parameter is required." });
      }

      const key = process.env.KOBIS_API_KEY;
      if (!key) {
        return res.status(500).json({ error: "KOBIS API key is missing from environment secrets." });
      }

      const url = `http://www.kobis.or.kr/kobisopenapi/webservice/rest/movie/searchMovieInfo.json?key=${key}&movieCd=${movieCd}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`KOBIS API returned status ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Movie info fetch error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch movie info." });
    }
  });

  // Lazy-initialize GoogleGenAI to prevent startup crash if GEMINI_API_KEY is missing
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required but is missing.");
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  // API Route: AI Movie Review Generator
  app.post("/api/generate-review", async (req, res) => {
    try {
      const { movieNm, userReview, movieInfo } = req.body;
      if (!movieNm) {
        return res.status(400).json({ error: "movieNm parameter is required." });
      }
      if (!userReview || !userReview.trim()) {
        return res.status(400).json({ error: "userReview text is required." });
      }

      const ai = getGeminiClient();

      const genres = movieInfo?.genres?.map((g: any) => g.genreNm).join(", ") || "미지정";
      const nations = movieInfo?.nations?.map((n: any) => n.nationNm).join(", ") || "미지정";
      const directors = movieInfo?.directors?.map((d: any) => d.peopleNm).join(", ") || "미지정";
      const actors = movieInfo?.actors?.slice(0, 5).map((a: any) => `${a.peopleNm}(${a.cast || "출연"})`).join(", ") || "미정";
      const openDt = movieInfo?.openDt || "미정";

      const prompt = `당신은 국내외에서 아주 명망 높은 전문 영화 평론가이자 감성적인 스토리텔러입니다. 
다음 제공된 실제 영화 스키마 정보와 사용자가 가볍게 남긴 '간단한 한 줄 감상평'을 논리적이고 미학적인 시선으로 완벽하게 풀어낸, 웰메이드 '상세 감상평(전문 영화 큐레이팅 평론)'을 격조 높게 작성해 주세요.

[영화 정보]
- 작품명: ${movieNm}
- 개봉 및 제작년도: ${openDt}
- 장르: ${genres}
- 국가: ${nations}
- 감독: ${directors}
- 주요 출연 배우: ${actors}

[사용자의 간단 요약 감상평]
"${userReview}"

[작성 가이드라인]
1. 단순한 영화 내용 요약을 탈피하여, 사용자가 남긴 짧은 감상평 속 '진짜 의미와 감정적 동기'를 꿰뚫어 보고 이를 학술적, 예술적 수준의 평론 언어로 유려하게 증폭해 서술해 주세요.
2. 장르 특유의 매력, 감독의 연출력, 배우들의 유기적인 호흡(전달된 데이터에서 발췌)을 비평에 구체적으로 녹여 신뢰도를 가득 확보해 주세요.
3. 글의 흐름은 가로 세로 배치 및 모바일에 모두 어울리게, 정돈된 단락 구분을 사용해 주세요. (가독성 높은 문단 구성)
4. 격식 있고 지적이지만 차갑지 않고 가슴을 울리는 정갈한 한국어 문체를 유지해 주세요.
5. 리뷰의 완성도를 최상으로 높여 소장하고 싶게 만드는 평론가 추천 지수(★ 5개 만점 기준), 추천 한 줄 요약 카피, 핵심 영화 미학 키워드 요약을 매력적인 서식으로 함께 표시해 주세요.
6. 응답은 마크다운(Markdown) 문법을 준수하여 작성해 주세요. (소제목에 적절한 샵(#) 기호, 강조 기호 등을 미학적으로 활용)`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const text = response.text;
      if (!text) {
        throw new Error("AI가 영화 감상평을 생성하지 못했습니다. 응답이 비어있습니다.");
      }

      res.json({ review: text });
    } catch (error: any) {
      console.error("Gemini review generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI movie review." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
