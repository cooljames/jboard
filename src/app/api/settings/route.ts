import { NextResponse } from 'next/server';
import { kisClient } from '@/lib/kis-client';
import { GoogleGenAI } from '@google/genai';

// In-memory runtime settings store (persists across requests in node process)
let currentGeminiConfig = {
  apiKey: process.env.GEMINI_API_KEY || '',
  model: process.env.MODEL || 'gemini-2.0-flash',
};

function maskString(str: string, keepStart = 4, keepEnd = 4): string {
  if (!str || str.length <= keepStart + keepEnd) return '••••••••';
  return `${str.slice(0, keepStart)}••••••••${str.slice(-keepEnd)}`;
}

export async function GET() {
  const kisConfig = kisClient.getConfig();

  return NextResponse.json({
    kis: {
      appKey: kisConfig.appKey ? maskString(kisConfig.appKey, 6, 4) : '',
      appKeyRaw: kisConfig.appKey ? `${kisConfig.appKey.slice(0, 4)}...` : '',
      appSecretSet: !!kisConfig.appSecret,
      accountNo: kisConfig.accountNo || '',
      accountPrdtCd: kisConfig.accountPrdtCd || '01',
      isPaperTrading: kisConfig.isPaperTrading,
      restBaseUrl: kisConfig.restBaseUrl,
      isConfigured: kisClient.isConfigured(),
    },
    gemini: {
      apiKey: currentGeminiConfig.apiKey ? maskString(currentGeminiConfig.apiKey, 6, 4) : '',
      apiKeySet: !!currentGeminiConfig.apiKey,
      model: currentGeminiConfig.model,
      isConfigured: !!currentGeminiConfig.apiKey,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, kis, gemini } = body;

    // Action 1: Test KIS Connection
    if (action === 'test_kis') {
      const startTime = Date.now();
      const testAppKey = kis?.appKey || kisClient.getConfig().appKey;
      const testAppSecret = kis?.appSecret || kisClient.getConfig().appSecret;
      const testAccountNo = kis?.accountNo || kisClient.getConfig().accountNo;
      const testAccountPrdtCd = kis?.accountPrdtCd || kisClient.getConfig().accountPrdtCd;
      const testIsPaper = kis?.isPaperTrading !== undefined ? kis.isPaperTrading : kisClient.getConfig().isPaperTrading;

      if (!testAppKey || !testAppSecret) {
        return NextResponse.json({
          success: false,
          message: 'KIS App Key 및 App Secret을 입력해주세요.',
        });
      }

      const baseUrl = testIsPaper
        ? 'https://openapivts.koreainvestment.com:29443'
        : 'https://openapi.koreainvestment.com:9443';

      try {
        const tokenRes = await fetch(`${baseUrl}/oauth2/tokenP`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'client_credentials',
            appkey: testAppKey,
            appsecret: testAppSecret,
          }),
        });

        const latency = Date.now() - startTime;

        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          return NextResponse.json({
            success: false,
            latency,
            message: `KIS 인증 응답 실패 (${tokenRes.status}): ${errText.slice(0, 150)}`,
          });
        }

        const tokenData = await tokenRes.json();
        return NextResponse.json({
          success: true,
          latency,
          message: `KIS OAuth2 연결 성공! 토큰 발급 완료 (유효시간: ${tokenData.expires_in || 86400}초, 지연시간: ${latency}ms)`,
          expiresIn: tokenData.expires_in,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          latency: Date.now() - startTime,
          message: `KIS 네트워크 연결 오류: ${err.message}`,
        });
      }
    }

    // Action 2: Test Gemini AI Connection
    if (action === 'test_gemini') {
      const startTime = Date.now();
      const testApiKey = gemini?.apiKey || currentGeminiConfig.apiKey;
      const testModel = gemini?.model || currentGeminiConfig.model;

      if (!testApiKey) {
        return NextResponse.json({
          success: false,
          message: 'Gemini API Key를 입력해주세요.',
        });
      }

      try {
        const ai = new GoogleGenAI({ apiKey: testApiKey });
        const response = await ai.models.generateContent({
          model: testModel || 'gemini-2.0-flash',
          contents: '간단히 "안녕하세요! Gemini AI 연결이 정상입니다."라고 한국어로 한 문장만 답해줘.',
        });

        const latency = Date.now() - startTime;
        const text = response.text || '연결 성공';

        return NextResponse.json({
          success: true,
          latency,
          message: `Gemini AI 연결 성공 (${latency}ms)`,
          reply: text.trim(),
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          latency: Date.now() - startTime,
          message: `Gemini AI 요청 실패: ${err.message}`,
        });
      }
    }

    // Action 3: Save Configurations
    if (action === 'save') {
      if (kis) {
        const newKisConfig: any = {};
        if (kis.appKey && !kis.appKey.includes('•')) newKisConfig.appKey = kis.appKey.trim();
        if (kis.appSecret && !kis.appSecret.includes('•')) newKisConfig.appSecret = kis.appSecret.trim();
        if (kis.accountNo) newKisConfig.accountNo = kis.accountNo.trim();
        if (kis.accountPrdtCd) newKisConfig.accountPrdtCd = kis.accountPrdtCd.trim();
        if (kis.isPaperTrading !== undefined) {
          newKisConfig.isPaperTrading = Boolean(kis.isPaperTrading);
          newKisConfig.restBaseUrl = newKisConfig.isPaperTrading
            ? 'https://openapivts.koreainvestment.com:29443'
            : 'https://openapi.koreainvestment.com:9443';
        }
        kisClient.updateConfig(newKisConfig);
      }

      if (gemini) {
        if (gemini.apiKey && !gemini.apiKey.includes('•')) {
          currentGeminiConfig.apiKey = gemini.apiKey.trim();
          process.env.GEMINI_API_KEY = gemini.apiKey.trim();
        }
        if (gemini.model) {
          currentGeminiConfig.model = gemini.model.trim();
          process.env.MODEL = gemini.model.trim();
        }
      }

      return NextResponse.json({
        success: true,
        message: 'KIS 및 Gemini API 설정이 성공적으로 저장 및 적용되었습니다.',
      });
    }

    return NextResponse.json({ error: '알 수 없는 요청 액션입니다.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
