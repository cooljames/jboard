import fs from 'fs';
import path from 'path';
import { getRealQuote } from './real-market';

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
  }> {
    if (!this.isConfigured()) {
      // Mock Fallback for common tickers
      const mockPrices: Record<string, { name: string; price: number; changeRate: number; volume: number }> = {
        '005930': { name: '삼성전자', price: 61500, changeRate: 1.48, volume: 14205000 },
        '000660': { name: 'SK하이닉스', price: 184500, changeRate: -0.81, volume: 3820000 },
        '035420': { name: 'NAVER', price: 172000, changeRate: 2.14, volume: 980000 },
        '035720': { name: '카카오', price: 38900, changeRate: 0.52, volume: 1450000 },
        '005380': { name: '현대차', price: 234000, changeRate: -1.26, volume: 840000 },
        '068270': { name: '셀트리온', price: 189000, changeRate: 0.80, volume: 620000 },
        '105560': { name: 'KB금융', price: 89400, changeRate: 1.82, volume: 1200000 },
        '051910': { name: 'LG화학', price: 325000, changeRate: -0.45, volume: 310000 },
      };

      const mock = mockPrices[ticker] || {
        name: `종목-${ticker}`,
        price: 50000,
        changeRate: 0.5,
        volume: 500000,
      };

      return {
        ticker,
        name: mock.name,
        price: mock.price,
        changeRate: mock.changeRate,
        volume: mock.volume,
        per: 11.2,
        pbr: 0.95,
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
        };
      }

      const output = data.output;
      return {
        ticker,
        name: output.rprs_mrkt_kor_name || output.hts_kor_isnm || `종목-${ticker}`,
        price: parseFloat(output.stck_prpr || '0'),
        changeRate: parseFloat(output.prdy_ctrt || '0'),
        volume: parseInt(output.acml_vol || '0', 10),
        per: parseFloat(output.per || '0'),
        pbr: parseFloat(output.pbr || '0'),
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

    return {
      orderNo: data.output?.ODNO || `ORD-${Date.now().toString().slice(-6)}`,
      success: true,
      message: data.msg1 || '주문이 성공적으로 접수되었습니다.',
    };
  }

  /**
   * Inquire Account Balance & Positions
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

    const token = await this.getAccessToken();
    if (!token || token === 'MOCK_KIS_TOKEN') {
      return this.getMockBalance();
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
          console.warn(`[KIS Balance Check] API returned non-zero response: [${data.msg_cd}] ${data.msg1 || res.statusText}. Using fallback.`);
          return this.getMockBalance();
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

      return {
        totalAsset: toNum(output2.tot_evlu_amt),
        cashBalance: toNum(output2.dnca_tot_amt),
        stockValuation: toNum(output2.scts_evlu_amt),
        dailyPnl: toNum(output2.evlu_pfls_smtl_amt),
        unsettledAmount: toNum(output2.prvs_rcdl_excc_amt),
        positions,
      };
    } catch (e: any) {
      console.warn(`[KIS Balance Check] Request error: ${e.message}. Using fallback.`);
      return this.getMockBalance();
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
