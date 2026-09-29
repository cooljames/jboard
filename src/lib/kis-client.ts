import fs from 'fs';
import path from 'path';
import { getRealQuote, STOCK_NAME_MAP } from './real-market';

export interface KisConfig {
  appKey: string;
  appSecret: string;
  accountNo: string;
  accountPrdtCd: string;
  isPaperTrading: boolean;
  restBaseUrl: string;
}

export interface KisOrderParams {
  ticker: string;
  orderType: '00' | '01'; // 00: 지정가, 01: 시장가
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
}

export interface KisPosition {
  ticker: string;
  tickerName: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  returnPct: number;
}

export interface KisAccountBalance {
  totalAsset: number;
  cashBalance: number;
  stockValuation: number;
  dailyPnl: number;
  /** D+2 미결제금액 (prvs_rcdl_excc_amt, 가수도정산). 당일 회전매매 시 큰 음수 가능 */
  unsettledAmount: number;
  positions: KisPosition[];
}

class KisClient {
  private config: KisConfig;
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private pendingTokenPromise: Promise<string> | null = null;
  private nextAllowedTokenRequestTime: number = 0;

  // In-memory Balance Cache & Safeguard (10s TTL)
  private cachedBalance: KisAccountBalance | null = null;
  private cachedBalanceTime: number = 0;
  private readonly BALANCE_CACHE_TTL_MS = 10000;

  public invalidateBalanceCache() {
    this.cachedBalanceTime = 0;
  }


  private getDiskCachedToken(): { token: string; expiresAt: number } | null {
    try {
      const cachePath = path.resolve(process.cwd(), '.kis_token_cache.json');
      if (fs.existsSync(cachePath)) {
        const raw = fs.readFileSync(cachePath, 'utf-8');
        const data = JSON.parse(raw);
        if (
          data.appKey === this.config.appKey &&
          data.token &&
          typeof data.expiresAt === 'number' &&
          data.expiresAt > Date.now() + 60000
        ) {
          return { token: data.token, expiresAt: data.expiresAt };
        }
      }
    } catch {}
    return null;
  }

  private saveDiskCachedToken(token: string, expiresAt: number): void {
    try {
      const cachePath = path.resolve(process.cwd(), '.kis_token_cache.json');
      fs.writeFileSync(
        cachePath,
        JSON.stringify(
          {
            appKey: this.config.appKey,
            token,
            expiresAt,
            savedAt: new Date().toISOString(),
          },
          null,
          2
        ),
        'utf-8'
      );
    } catch {}
  }

  constructor() {
    let rawAccountNo = process.env.KIS_ACCOUNT_NO || '';
    let accountPrdtCd = process.env.KIS_ACCOUNT_PRDT_CD || '01';
    if (rawAccountNo.includes('-')) {
      const parts = rawAccountNo.split('-');
      rawAccountNo = parts[0];
      accountPrdtCd = parts[1] || accountPrdtCd;
    }

    this.config = {
      appKey: process.env.KIS_APP_KEY || '',
      appSecret: process.env.KIS_APP_SECRET || '',
      accountNo: rawAccountNo,
      accountPrdtCd: accountPrdtCd,
      isPaperTrading: process.env.KIS_IS_PAPER_TRADING !== 'false',
      restBaseUrl:
        process.env.KIS_REST_BASE_URL ||
        (process.env.KIS_IS_PAPER_TRADING !== 'false'
          ? 'https://openapivts.koreainvestment.com:29443'
          : 'https://openapi.koreainvestment.com:9443'),
    };
  }

  public getConfig(): KisConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<KisConfig>): void {
    let accountNo = newConfig.accountNo !== undefined ? newConfig.accountNo : this.config.accountNo;
    let accountPrdtCd = newConfig.accountPrdtCd !== undefined ? newConfig.accountPrdtCd : this.config.accountPrdtCd;

    if (accountNo.includes('-')) {
      const parts = accountNo.split('-');
      accountNo = parts[0];
      accountPrdtCd = parts[1] || accountPrdtCd;
    }

    this.config = {
      ...this.config,
      ...newConfig,
      accountNo,
      accountPrdtCd,
    };
    // Invalidate cached token when credentials change
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
    try {
      const cachePath = path.resolve(process.cwd(), '.kis_token_cache.json');
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
    } catch {}
  }

  public isConfigured(): boolean {
    return !!(this.config.appKey && this.config.appSecret && this.config.accountNo);
  }

  /**
   * Get or refresh OAuth2 Access Token
   */
  async getAccessToken(): Promise<string> {
    if (!this.isConfigured()) {
      return 'MOCK_KIS_TOKEN';
    }

    const now = Date.now();

    // 1. In-memory valid token check (valid for at least 1 more minute)
    if (this.cachedToken && this.tokenExpiresAt > now + 60000) {
      return this.cachedToken;
    }

    // 2. Persistent disk cache check (preserves token across Next.js reloads/compilations)
    const diskCache = this.getDiskCachedToken();
    if (diskCache) {
      this.cachedToken = diskCache.token;
      this.tokenExpiresAt = diskCache.expiresAt;
      return this.cachedToken;
    }

    // 3. Rate-limit cooldown: if KIS recently gave 403 EGW00133 (1분당 1회), wait for cooldown
    if (now < this.nextAllowedTokenRequestTime) {
      if (this.cachedToken) return this.cachedToken;
      return 'MOCK_KIS_TOKEN';
    }

    // 4. In-flight mutex: if another request is already fetching the token, wait for it
    if (this.pendingTokenPromise) {
      return this.pendingTokenPromise;
    }

    this.pendingTokenPromise = (async () => {
      try {
        const res = await fetch(`${this.config.restBaseUrl}/oauth2/tokenP`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'client_credentials',
            appkey: this.config.appKey,
            appsecret: this.config.appSecret,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          if (res.status === 403 || errorText.includes('EGW00133') || errorText.includes('1분당 1회')) {
            this.nextAllowedTokenRequestTime = Date.now() + 65 * 1000;
            console.warn('[KIS] Token issuance rate-limited (1분당 1회). Cooldown activated.');
            if (this.cachedToken) return this.cachedToken;
            return 'MOCK_KIS_TOKEN';
          }
          throw new Error(`Token request failed: ${res.status} ${errorText}`);
        }

        const data = await res.json();
        this.cachedToken = data.access_token;
        this.tokenExpiresAt = Date.now() + (data.expires_in || 86400) * 1000;
        this.saveDiskCachedToken(this.cachedToken!, this.tokenExpiresAt);
        return this.cachedToken!;
      } catch (err: any) {
        console.warn('[KIS] Token issuance warning:', err.message || err);
        return this.cachedToken || 'MOCK_KIS_TOKEN';
      } finally {
        this.pendingTokenPromise = null;
      }
    })();

    return this.pendingTokenPromise;
  }

  /**
   * Generate Hashkey for POST payload verification
   */
  async getHashkey(body: Record<string, any>): Promise<string> {
    if (!this.isConfigured()) return '';

    try {
      const res = await fetch(`${this.config.restBaseUrl}/uapi/hashkey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          appkey: this.config.appKey,
          appsecret: this.config.appSecret,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        return data.HASH || '';
      }
    } catch (e) {
      console.warn('[KIS] Hashkey generation failed:', e);
    }
    return '';
  }

  /**
   * Inquire Stock Current Price and basic stats
   */
  async getStockPrice(ticker: string): Promise<{
    ticker: string;
    name: string;
    price: number;
    changeRate: number;
    volume: number;
    per?: number;
    pbr?: number;
    market?: string;
  }> {
    if (!this.isConfigured()) {
      const real = await getRealQuote(ticker);
      return {
        ticker,
        name: real.name,
        price: real.price,
        changeRate: real.changeRate,
        volume: real.volume,
        per: 11.2,
        pbr: 0.95,
        market: real.market,
      };
    }

    const token = await this.getAccessToken();
    if (!token || token === 'MOCK_KIS_TOKEN') {
      const real = await getRealQuote(ticker);
      return {
        ticker,
        name: real.name,
        price: real.price,
        changeRate: real.changeRate,
        volume: real.volume,
        per: 11.2,
        pbr: 0.95,
        market: real.market,
      };
    }

    try {
      const trId = 'FHKST01010100';
      const res = await fetch(
        `${this.config.restBaseUrl}/uapi/domestic-stock/v1/quotations/inquire-price?fid_cond_mrkt_div_code=J&fid_input_iscd=${ticker}`,
        {
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${token}`,
            appkey: this.config.appKey,
            appsecret: this.config.appSecret,
            tr_id: trId,
          },
        }
      );

      const data = await res.json();
      if (!res.ok || data.rt_cd !== '0' || !data.output) {
        const real = await getRealQuote(ticker);
        return {
          ticker,
          name: real.name,
          price: real.price,
          changeRate: real.changeRate,
          volume: real.volume,
          per: 11.2,
          pbr: 0.95,
          market: real.market,
        };
      }

      const output = data.output;
      const parsedPrice = parseFloat(output.stck_prpr || '0');
      if (parsedPrice <= 0) {
        const real = await getRealQuote(ticker);
        if (real && real.price > 0) {
          return {
            ticker,
            name: real.name || STOCK_NAME_MAP[ticker] || output.hts_kor_isnm || `종목-${ticker}`,
            price: real.price,
            changeRate: real.changeRate,
            volume: real.volume,
            per: 11.2,
            pbr: 0.95,
            market: real.market,
          };
        }
      }

      let detectedMarket = 'KOSPI';
      const nm = (STOCK_NAME_MAP[ticker] || output.hts_kor_isnm || '').toUpperCase();
      if (ticker.startsWith('5') || nm.includes('ETN')) detectedMarket = 'ETN';
      else if (nm.includes('ETF') || nm.includes('KODEX') || nm.includes('TIGER') || nm.includes('ACE') || nm.includes('SOL') || nm.includes('RISE')) detectedMarket = 'ETF';

      return {
        ticker,
        name: STOCK_NAME_MAP[ticker] || output.hts_kor_isnm || `종목-${ticker}`,
        price: parsedPrice,
        changeRate: parseFloat(output.prdy_ctrt || '0'),
        volume: parseInt(output.acml_vol || '0', 10),
        per: parseFloat(output.per || '0'),
        pbr: parseFloat(output.pbr || '0'),
        market: detectedMarket,
      };
    } catch {
      const real = await getRealQuote(ticker);
      return {
        ticker,
        name: real.name,
        price: real.price,
        changeRate: real.changeRate,
        volume: real.volume,
        per: 11.2,
        pbr: 0.95,
        market: real.market,
      };
    }
  }

  /**
   * Submit Buy / Sell Order
   */
  async submitOrder(params: KisOrderParams): Promise<{
    orderNo: string;
    success: boolean;
    message: string;
  }> {
    if (!this.isConfigured()) {
      const mockOrderNo = `OD-${Date.now().toString().slice(-6)}`;
      console.log(`[KIS Mock Order] ${params.side} ${params.ticker} Qty: ${params.quantity} Price: ${params.price}`);
      return {
        orderNo: mockOrderNo,
        success: true,
        message: `[모의/시뮬레이션] ${params.side === 'BUY' ? '매수' : '매도'} 주문이 접수되었습니다. (주문번호: ${mockOrderNo})`,
      };
    }

    const token = await this.getAccessToken();
    const isPaper = this.config.isPaperTrading;

    // TR IDs:
    // Real Buy: TTTC0802U, Real Sell: TTTC0801U
    // Paper Buy: VTTC0802U, Paper Sell: VTTC0801U
    let trId = '';
    if (params.side === 'BUY') {
      trId = isPaper ? 'VTTC0802U' : 'TTTC0802U';
    } else {
      trId = isPaper ? 'VTTC0801U' : 'TTTC0801U';
    }

    const body = {
      CANO: this.config.accountNo,
      ACNT_PRDT_CD: this.config.accountPrdtCd,
      PDNO: params.ticker,
      ORD_DVSN: params.orderType, // '00': 지정가, '01': 시장가
      ORD_QTY: params.quantity.toString(),
      ORD_UNPR: params.orderType === '01' ? '0' : params.price.toString(),
    };

    const hashkey = await this.getHashkey(body);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      authorization: `Bearer ${token}`,
      appkey: this.config.appKey,
      appsecret: this.config.appSecret,
      tr_id: trId,
    };
    if (hashkey) {
      headers.hashkey = hashkey;
    }

    const res = await fetch(`${this.config.restBaseUrl}/uapi/domestic-stock/v1/trading/order-cash`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok || data.rt_cd !== '0') {
      throw new Error(`KIS Order failed: [${data.msg_cd}] ${data.msg1 || res.statusText}`);
    }

    this.invalidateBalanceCache();

    return {
      orderNo: data.output?.ODNO || `ORD-${Date.now().toString().slice(-6)}`,
      success: true,
      message: data.msg1 || '주문이 성공적으로 접수되었습니다.',
    };
  }

  /**
   * Inquire Account Balance & Positions
   * [미연 방지책 핵심 설계]:
   * 1. 10초 TTL 인메모리 캐싱: 대시보드와 트레이딩 루프의 중복 호출 흡수
   * 2. Python Worker(/api/balance) 우선 연동: 단일 프로세스 캐시 공유로 KIS 다중 조회 방지
   * 3. KIS 직접 조회 시 페이지네이션 간 1.1초 간격 강제 (EGW00201/EGW00215 사전 차단)
   * 4. 실패 시 캐시 스냅샷 폴백으로 UI 무중단 보장
   */
  async getAccountBalance(): Promise<KisAccountBalance> {
    if (!this.isConfigured()) {
      return {
        totalAsset: 0,
        cashBalance: 0,
        stockValuation: 0,
        dailyPnl: 0,
        unsettledAmount: 0,
        positions: [],
      };
    }

    const now = Date.now();
    if (this.cachedBalance && (now - this.cachedBalanceTime) < this.BALANCE_CACHE_TTL_MS) {
      return this.cachedBalance;
    }

    // 1순위: 로컬 파이썬 엔진(/api/balance)의 통합 캐시 조회 (중복 조회 원천 차단)
    try {
      const workerUrl = process.env.PYTHON_WORKER_URL || 'http://127.0.0.1:8000';
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 1500);
      const wRes = await fetch(`${workerUrl}/api/balance`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (wRes.ok) {
        const wb = await wRes.json();
        if (wb && typeof wb.total_asset === 'number') {
          const mapped: KisAccountBalance = {
            totalAsset: wb.total_asset,
            cashBalance: wb.cash_balance,
            stockValuation: wb.stock_valuation,
            dailyPnl: wb.daily_pnl,
            unsettledAmount: wb.unsettled_amount || 0,
            positions: (wb.positions || []).map((p: any) => ({
              ticker: p.ticker,
              tickerName: p.ticker_name,
              quantity: p.quantity,
              avgBuyPrice: p.avg_buy_price,
              currentPrice: p.current_price,
              unrealizedPnl: p.unrealized_pnl,
              returnPct: p.return_pct,
            })),
          };
          this.cachedBalance = mapped;
          this.cachedBalanceTime = Date.now();
          return mapped;
        }
      }
    } catch {}

    const token = await this.getAccessToken();
    if (!token || token === 'MOCK_KIS_TOKEN') {
      return this.cachedBalance || this.getMockBalance();
    }
    const isPaper = this.config.isPaperTrading;
    const trId = isPaper ? 'VTTC8434R' : 'TTTC8434R';

    try {
      // KIS는 1회 조회 최대 20종목까지만 반환하므로 CTX_AREA_* 로 전 페이지 순회
      let ctxFk = '';
      let ctxNk = '';
      const allOutput1: any[] = [];
      let output2: any = {};
      for (let page = 0; page < 10; page++) {
        if (page > 0) {
          // KIS 원장 초당 거래건수(EGW00201/EGW00215) 초과 사전 차단
          await new Promise((r) => setTimeout(r, 1100));
        }

        const url = new URL(`${this.config.restBaseUrl}/uapi/domestic-stock/v1/trading/inquire-balance`);
        url.searchParams.append('CANO', this.config.accountNo);
        url.searchParams.append('ACNT_PRDT_CD', this.config.accountPrdtCd);
        url.searchParams.append('AFHR_FLPR_YN', 'N');
        url.searchParams.append('OFL_YN', '');
        url.searchParams.append('INQR_DVSN', '02');
        url.searchParams.append('UNPR_DVSN', '01');
        url.searchParams.append('FUND_STTL_ICLD_YN', 'N');
        url.searchParams.append('FNCG_AMT_AUTO_RDPT_YN', 'N');
        url.searchParams.append('PRCS_DVSN', '00');
        url.searchParams.append('CTX_AREA_FK100', ctxFk);
        url.searchParams.append('CTX_AREA_NK100', ctxNk);

        const res = await fetch(url.toString(), {
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${token}`,
            appkey: this.config.appKey,
            appsecret: this.config.appSecret,
            tr_id: trId,
          },
        });

        const data = await res.json();
        if (!res.ok || data.rt_cd !== '0') {
          console.warn(`[KIS Balance Check 방지책] KIS 응답 한도/상태 감지: [${data.msg_cd}] ${data.msg1 || res.statusText}. 캐시 잔고로 안전 폴백.`);
          return this.cachedBalance || this.getMockBalance();
        }

        const pageOutput1 = Array.isArray(data.output1) ? data.output1 : [];
        allOutput1.push(...pageOutput1);
        if (data.output2 && data.output2[0]) output2 = data.output2[0];

        // 연속조회 키가 비어 있으면 마지막 페이지
        const nextFk = (data.ctx_area_fk100 || '').trim();
        const nextNk = (data.ctx_area_nk100 || '').trim();
        const trCont = res.headers.get('tr_cont');
        if (!nextNk || trCont === 'D' || trCont === 'E') break;
        // FK/NK가 변하지 않으면 무한루프 방지
        if (nextFk === ctxFk && nextNk === ctxNk) break;
        ctxFk = nextFk;
        ctxNk = nextNk;
        // 다음 페이지가 없으면 종료 (첫 페이지에서 키가 비어있는 정상 케이스)
        if (!ctxNk) break;
      }

      const toNum = (v: any): number => {
        if (v === null || v === undefined || v === '') return 0;
        const n = parseFloat(String(v).replace(/,/g, ''));
        return Number.isFinite(n) ? n : 0;
      };

      const positions: KisPosition[] = allOutput1
        .map((p: any) => ({
          ticker: String(p.pdno || '').trim(),
          tickerName: String(p.prdt_name || '').trim(),
          // KIS 공식 필드명은 hldg_qty (보유수량). hld_qty는 오타 폴백용.
          quantity: Math.trunc(toNum(p.hldg_qty ?? p.hld_qty ?? 0)),
          avgBuyPrice: toNum(p.pchs_avg_pric),
          currentPrice: toNum(p.prpr),
          unrealizedPnl: toNum(p.evlu_pfls_amt),
          returnPct: toNum(p.evlu_pfls_rt),
        }))
        .filter((p) => p.ticker && p.quantity > 0);

      const finalBal: KisAccountBalance = {
        totalAsset: toNum(output2.tot_evlu_amt),
        cashBalance: toNum(output2.dnca_tot_amt),
        stockValuation: toNum(output2.scts_evlu_amt),
        dailyPnl: toNum(output2.evlu_pfls_smtl_amt),
        unsettledAmount: toNum(output2.prvs_rcdl_excc_amt),
        positions,
      };

      this.cachedBalance = finalBal;
      this.cachedBalanceTime = Date.now();
      return finalBal;
    } catch (e: any) {
      console.warn(`[KIS Balance Check 방지책] 요청 중 예외 발생 (${e.message}). 캐시 잔고로 안전 폴백.`);
      return this.cachedBalance || this.getMockBalance();
    }
  }

  private getMockBalance(): KisAccountBalance {
    return {
      totalAsset: 0,
      cashBalance: 0,
      stockValuation: 0,
      dailyPnl: 0,
      unsettledAmount: 0,
      positions: [],
    };
  }

  /**
   * Emergency Panic Button: Liquidate ALL currently held positions at market price
   */
  async panicLiquidateAll(): Promise<{
    success: boolean;
    liquidatedCount: number;
    results: Array<{ ticker: string; tickerName?: string; quantity: number; orderNo?: string; success: boolean; error?: string }>;
  }> {
    const balance = await this.getAccountBalance();
    const positionsToSell = balance.positions.filter((p) => p.quantity > 0);

    const results = await Promise.all(
      positionsToSell.map(async (pos) => {
        try {
          const res = await this.submitOrder({
            ticker: pos.ticker,
            orderType: '01', // 시장가 매도
            side: 'SELL',
            price: 0,
            quantity: pos.quantity,
          });
          return { ticker: pos.ticker, tickerName: pos.tickerName, quantity: pos.quantity, orderNo: res.orderNo, success: true };
        } catch (e: any) {
          return { ticker: pos.ticker, tickerName: pos.tickerName, quantity: pos.quantity, success: false, error: e.message };
        }
      })
    );

    return {
      success: true,
      liquidatedCount: results.filter((r) => r.success).length,
      results,
    };
  }
}

export const kisClient = new KisClient();
