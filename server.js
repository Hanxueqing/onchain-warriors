const path = require('path');
// Resolve .env relative to this file, not the current working directory.
// (PaaS and the Claude Preview launcher both invoke node from various cwds.)
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const { execFile } = require('child_process');
const https = require('https');
const http = require('http');
const os = require('os');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ONCHAINOS = path.join(os.homedir(), '.local/bin/onchainos');
const PORT = process.env.PORT || 3000;

// ── Run onchainos CLI ─────────────────────────────────────────────────────────
function runCLI(args, timeoutMs = 20000) {
  return new Promise((resolve) => {
    const env = { ...process.env, PATH: `${path.join(os.homedir(), '.local/bin')}:${process.env.PATH}` };
    execFile(ONCHAINOS, args, { timeout: timeoutMs, env }, (err, stdout, stderr) => {
      const raw = stdout || stderr || '';
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed);
      } catch {
        resolve({ ok: false, error: err ? err.message : 'parse error' });
      }
    });
  });
}

// ── OKX Web3 DEX API — direct HTTP with HMAC auth ─────────────────────────────
// The bundled `onchainos` CLI has a bug where auth-required endpoints fail
// with code=50111 even with valid credentials. We bypass it entirely and call
// OKX's REST API directly. Auth is HMAC-SHA256 over `ts + METHOD + path + body`.
//
// Returns parsed JSON on success, or null on any error (network/auth/parse).
// All callers must treat null as "fall back to demo data".

// Common chain → OKX chainIndex mapping (OKX uses its own numeric chain IDs).
const OKX_CHAIN_INDEX = {
  ethereum: '1',
  bsc:      '56',
  polygon:  '137',
  base:     '8453',
  arbitrum: '42161',
  solana:   '501',
  sui:      '784',
  optimism: '10',
  avalanche:'43114',
};
function chainIndexOf(name) {
  return OKX_CHAIN_INDEX[String(name || '').toLowerCase()] || '1';
}

function callOkxApi(method, urlPath, body = null, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const apiKey = process.env.OKX_API_KEY;
    const secret = process.env.OKX_SECRET_KEY;
    const pass   = process.env.OKX_PASSPHRASE;
    if (!apiKey || !secret || !pass) return resolve(null);

    const ts      = new Date().toISOString().replace(/\.\d{3}Z$/, '.000Z');
    const bodyStr = body ? JSON.stringify(body) : '';
    const sign    = crypto
      .createHmac('sha256', secret)
      .update(`${ts}${method.toUpperCase()}${urlPath}${bodyStr}`)
      .digest('base64');

    const req = https.request({
      hostname: 'www.okx.com',
      path:     urlPath,
      method:   method.toUpperCase(),
      timeout:  timeoutMs,
      headers: {
        'OK-ACCESS-KEY':        apiKey,
        'OK-ACCESS-SIGN':       sign,
        'OK-ACCESS-PASSPHRASE': pass,
        'OK-ACCESS-TIMESTAMP':  ts,
        'Content-Type':         'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }, (res) => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(chunks);
          // OKX success contract: { code: "0", data: ... }
          if (parsed && (parsed.code === '0' || parsed.code === 0)) {
            resolve(parsed);
          } else {
            // Log non-success codes but never echo the key. The msg is safe.
            if (parsed && parsed.msg) console.warn(`[okx] ${urlPath} → code=${parsed.code} msg=${parsed.msg}`);
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Personality engine ────────────────────────────────────────────────────────
const CLASSES = [
  {
    id: 'SHOGUN',
    name: '巨鯨将軍', subtitle: 'Whale Shogun',
    element: 'GOLD', rarity: 'LEGENDARY',
    gradient: ['#0d0a00', '#1a1200', '#2a1f00'],
    accent: '#ffd700', border: '#f5a623',
    glowColor: 'rgba(245,166,35,0.6)',
    stats: { ATK: 95, DEF: 88, LUCK: 72, SPEED: 45 },
    traits: ['Volume King', 'Market Mover', 'Diamond Hands'],
    description: 'A sovereign of the blockchain seas. Your wallet commands market tides. Few dare to oppose the weight of your positions.',
    threshold: { minValue: 100000 }
  },
  {
    id: 'DEGEN_RONIN',
    name: '退行浪人', subtitle: 'Degen Ronin',
    element: 'FIRE', rarity: 'RARE',
    gradient: ['#1a0505', '#2d0a0a', '#420f0f'],
    accent: '#ff4444', border: '#ef4444',
    glowColor: 'rgba(239,68,68,0.6)',
    stats: { ATK: 90, DEF: 32, LUCK: 95, SPEED: 97 },
    traits: ['Meme Apostle', 'Chaos Agent', 'First Mover'],
    description: 'No master, no mercy. You ride the meme waves to glory or ruin. The blockchain trembles at your recklessness.',
    threshold: { memeRatio: 0.35 }
  },
  {
    id: 'DIAMOND_SAMURAI',
    name: '鑽石武士', subtitle: 'Diamond Samurai',
    element: 'ICE', rarity: 'EPIC',
    gradient: ['#030d1a', '#051829', '#082540'],
    accent: '#60a5fa', border: '#3b82f6',
    glowColor: 'rgba(96,165,250,0.6)',
    stats: { ATK: 72, DEF: 97, LUCK: 65, SPEED: 38 },
    traits: ['Iron Hands', 'Blue Chip Sovereign', 'Patience Master'],
    description: 'Unwavering resolve forged in bear markets. While others panic, you hold. Your patience is your strongest weapon.',
    threshold: { lowTurnover: true, minValue: 5000 }
  },
  {
    id: 'CHAIN_DAIMYO',
    name: '鎖鏈大名', subtitle: 'DeFi Daimyo',
    element: 'NATURE', rarity: 'EPIC',
    gradient: ['#001a0d', '#002b16', '#013d20'],
    accent: '#34d399', border: '#10b981',
    glowColor: 'rgba(52,211,153,0.6)',
    stats: { ATK: 58, DEF: 80, LUCK: 70, SPEED: 60 },
    traits: ['Yield Architect', 'Protocol Insider', 'Liquidity Lord'],
    description: 'Master of protocols. Your yield compounds in silence while others chase pumps. The DeFi landscape bows to your strategy.',
    threshold: { defiActive: true }
  },
  {
    id: 'BRIDGE_WANDERER',
    name: '渡り者', subtitle: 'Bridge Wanderer',
    element: 'STORM', rarity: 'RARE',
    gradient: ['#0a0a1a', '#0f0f2a', '#14143d'],
    accent: '#a78bfa', border: '#7c3aed',
    glowColor: 'rgba(167,139,250,0.6)',
    stats: { ATK: 65, DEF: 58, LUCK: 82, SPEED: 91 },
    traits: ['Multi-Chain Native', 'Bridge Expert', 'Arbitrage Hunter'],
    description: 'No single chain contains your ambitions. You move value across dimensions, leaving traces on every blockchain you touch.',
    threshold: { chainCount: 4 }
  },
  {
    id: 'GHOST_NINJA',
    name: '霊の忍者', subtitle: 'Ghost Ninja',
    element: 'VOID', rarity: 'UNCOMMON',
    gradient: ['#080808', '#111111', '#181818'],
    accent: '#9ca3af', border: '#6b7280',
    glowColor: 'rgba(107,114,128,0.4)',
    stats: { ATK: 40, DEF: 62, LUCK: 55, SPEED: 78 },
    traits: ['Silent Accumulator', 'Stealth Mode', 'Long Game Player'],
    description: 'Invisible to the market. Your wallet sleeps, but it is not dead. The greatest move is knowing when not to move.',
    threshold: {}
  },
  {
    id: 'MEV_PRIEST',
    name: '黒曜祭司', subtitle: 'Obsidian Priest',
    element: 'SHADOW', rarity: 'EPIC',
    gradient: ['#0c001a', '#1a002a', '#2d0040'],
    accent: '#d946ef', border: '#a21caf',
    glowColor: 'rgba(217,70,239,0.5)',
    stats: { ATK: 82, DEF: 55, LUCK: 60, SPEED: 99 },
    traits: ['Front-Runner', 'Sandwich Lord', 'Block Stalker'],
    description: 'You see the mempool before it crystallizes. Every block is your hunting ground. Speed is your only commandment.',
    threshold: { highActivity: true }
  },
  {
    id: 'ORACLE_SEER',
    name: '預言巫女', subtitle: 'Prophecy Miko',
    element: 'COSMIC', rarity: 'LEGENDARY',
    gradient: ['#1a1808', '#2a2210', '#3d3219'],
    accent: '#fef3c7', border: '#fbbf24',
    glowColor: 'rgba(251,191,36,0.5)',
    stats: { ATK: 55, DEF: 92, LUCK: 78, SPEED: 50 },
    traits: ['Long-Term Believer', 'Governance Lord', 'Diamond Visionary'],
    description: 'You read the chain like ancient scripture. While others trade, you wait. Time bows to your conviction.',
    threshold: { concentratedHolding: true }
  }
];

function hashAddress(address) {
  let h = 0x811c9dc5;
  for (let i = 0; i < address.length; i++) {
    h ^= address.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

function determineClassFromData(tokens, totalValue) {
  const tokenCount = tokens.length;
  const chainSet = new Set(tokens.map(t => t.chainIndex || t.chain).filter(Boolean));
  const memeTokens = tokens.filter(t =>
    t.symbol && /moon|inu|pepe|doge|shib|frog|cat|wif|bonk|meme|pump|wojak/i.test(t.symbol)
  );
  const memeRatio = memeTokens.length / Math.max(tokenCount, 1);

  if (totalValue >= 100000) return 'SHOGUN';
  if (memeRatio >= 0.35) return 'DEGEN_RONIN';
  if (chainSet.size >= 4) return 'BRIDGE_WANDERER';
  // ORACLE_SEER: 1-2 tokens but valuable → diamond hand on top picks
  if (tokenCount <= 2 && totalValue >= 20000) return 'ORACLE_SEER';
  // MEV_PRIEST: high token churn (15+) → bot / front-runner pattern
  if (tokenCount >= 15) return 'MEV_PRIEST';
  if (tokenCount <= 4 && totalValue >= 5000) return 'DIAMOND_SAMURAI';
  if (tokenCount >= 8) return 'CHAIN_DAIMYO';
  return 'GHOST_NINJA';
}

function generateDemoPortfolio(address) {
  const h = hashAddress(address);
  const classIds = CLASSES.map(c => c.id);
  const classId = classIds[h % classIds.length];
  const cls = CLASSES.find(c => c.id === classId);

  const baseValue = [350, 2800, 18000, 105000, 45000, 920][(h >> 4) % 6];
  const tokenCount = 2 + ((h >> 8) % 14);
  const chainCount = 1 + ((h >> 12) % 5);

  const sampleTokens = ['ETH', 'USDC', 'WBTC', 'PEPE', 'ARB', 'OP', 'ONDO', 'WIF', 'BONK', 'SOL', 'LINK', 'UNI'];
  const tokens = Array.from({ length: tokenCount }, (_, i) => ({
    symbol: sampleTokens[(h + i * 7) % sampleTokens.length],
    value: (baseValue / tokenCount) * (0.5 + ((h >> (i * 3)) % 100) / 100),
    chain: ['ethereum', 'solana', 'base', 'arbitrum', 'bsc'][((h >> (i * 2)) % chainCount) % 5]
  }));

  // Adjust stats slightly based on real class
  const statVariance = ((h >> 16) % 10) - 5;
  const stats = Object.fromEntries(
    Object.entries(cls.stats).map(([k, v]) => [k, Math.min(99, Math.max(10, v + statVariance))])
  );

  return {
    mode: 'demo',
    classId,
    cls,
    stats,
    totalValue: baseValue,
    tokenCount,
    chainCount,
    tokens,
    address,
    txCount: 12 + ((h >> 20) % 500),
    winRate: 35 + ((h >> 24) % 50),
  };
}

function generateDemoSignals(chain) {
  const tokens = [
    { sym: 'PEPE', addr: '0x6982508145454ce325ddbe47a25d4ec3d2311933' },
    { sym: 'ONDO', addr: '0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3' },
    { sym: 'WIF', addr: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
    { sym: 'BONK', addr: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
    { sym: 'TRUMP', addr: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN' },
    { sym: 'VIRTUALS', addr: '0x44ff8620b8cA187b7A4b32f6C6AF7EB7e9D8b3d2' },
    { sym: 'FWOG', addr: '7bAoVCRCy7NmRaRgVPTvjjsGe6sDJpvhyHZqmMerMSoo' },
    { sym: 'POPCAT', addr: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr' },
  ];
  const walletTypes = ['Smart Money', 'KOL/Influencer', 'Whale'];
  const chains = chain === 'all' ? ['ethereum', 'solana', 'base', 'arbitrum'] : [chain];

  return Array.from({ length: 12 }, (_, i) => {
    const tk = tokens[i % tokens.length];
    const wt = walletTypes[i % walletTypes.length];
    const minutesAgo = 5 + i * 18 + Math.floor(i * 1.7);
    const amount = [12000, 45000, 128000, 380000, 890000][i % 5];
    const triggerCount = 1 + (i % 5);
    const soldRatio = i % 4 === 0 ? 0 : Math.floor(Math.random() * 30);
    return {
      tokenSymbol: tk.sym,
      tokenAddress: tk.addr,
      walletType: wt,
      amountUsd: amount,
      triggerWalletCount: triggerCount,
      soldRatioPercent: soldRatio,
      chain: chains[i % chains.length],
      minutesAgo,
    };
  });
}

// Different address pools per chain — each chain shows its own top wallets
const LEADERBOARD_POOLS = {
  ethereum: [
    '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',  // binance7
    '0x28c6c06298d514db089934071355e5743bf21d60',  // binance14
    '0x21a31ee1afc51d94c2efccaa2092ad1028285549',  // binance15
    '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8',  // binance cold
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',  // vitalik
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',  // uniswap
    '0x6B75d8AF000000e20B7a7DDf000Ba900b4009A80',  // mev bot
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',  // uniswap router
    '0x564286362092D8e7936f0549571a803B203aAceD',  // binance17
    '0x0A4c79cE84202b03e95B7a692E5D728d83C44c76',  // unknown whale
  ],
  solana: [
    '5ZWj7a1f8tWkjBESHKgrLmXshuXxqeY9SYcfbshpAqPG',
    'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
    '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
    'Cb9npGCRTcuyk2u1zRyHRGCXjxmFhvJ5cmRpiKzAQfQR',
    'BC7yMauUgynvDjPv3xQQHGsdAfWXjV7r7Yi8AAB5Yczs',
    '7xWmPaKqWGiyAY7DRNNUhJWApu5dmskRtsBNJxsbDgwy',
    'GHRy7VFh3MEcRkJ6BVxh7CHWvNQNyXEyEFFTzpQhqYRu',
    'EzKqaY8MGwAvuiNUkLF9hKnPHhPwwUk6mZL6NjV8VtFr',
    '4Tcg8bx5jvmBfvfYZJHYC2ufnNRtkrAm5RzaLzs5RVQA',
    'A1nN5Tn1tt7Jxg2cZxRMNRBCSPaDxBpaB9JwYrhT3Lkk',
  ],
  base: [
    '0x4200000000000000000000000000000000000006',  // base wrapped eth
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',  // base usdc
    '0x71Bf95779A66A9Fc6f29bF11d10B7E29bA4FD3eB',  // base whale
    '0xBd1F7d88C76A86C60d41bDDD4819fAe404e7151E',
    '0xCb456b2bFCdC0DD55c11898BC6e0A8b9a90Db8e8',
    '0xa0F4d2c91a4d4c7E36c7c87Fc14a1Ad6F6Bcd1aB',
    '0x39e1bAA8Cf3D1f95c44a2A55A0Bd5d3a4C1bCfFf',
    '0xb6f5b8B17a3B72b8a8C3C7e6e7Ee69b7f4E5B7c8',
    '0xC4a8e2C7e9d11Cf2bD9c2ba74E1F1c2B3D5B4E1F',
    '0xd2A1b4F3E5C8B9c5A6e3d4F2B1c3a5E7d9f8b2A4',
  ],
  arbitrum: [
    '0xF89d7b9c864f589bbF53a82105107622B35EaA40',  // bybit
    '0xb38e8c17e38363aF6EbdCb3dAE12e0243582891D',  // arb whale
    '0x489ee077994B6658eAfA855C308275EAd8097C4A',
    '0xA1c2D3B4e5F6789012345678901234567890ABCD',
    '0x2C6E2c5D9F9a8e0c4D5E6F7a8B9c0D1E2F3a4B5c',
    '0xa9c6E2D3F4B5c6D7e8F9a0B1c2D3e4F5a6B7c8D9',
    '0x7E4F9c8D5e6F7A8b9C0d1E2F3a4B5c6D7E8F9a0B',
    '0x55fF76BFFC3Cdd9D5FdbBC2ece4528ECcE28047b',  // gmx
    '0x3aA4C2e2A9bB7Cd6F4E5C2d8B1A0e9F8b7c6D5e4',
    '0x9a8B7c6D5e4F3a2B1c0D9e8F7a6B5c4D3e2F1a0B',
  ],
  bsc: [
    '0xF977814e90dA44bFA03b6295A0616a897441aceC',  // binance hot
    '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3',  // binance bsc
    '0xe2fc31F816A9b94326492132018C3aEcC4a93aE1',
    '0x73feaa1eE314F8c655E354234017bE2193C9E24E',
    '0xB1Ec548F296270BC96B8A1b3b3C8CA2dBe6caf2E',
    '0x9e0CB7AC6f5F843A6A21fEFf5D14A21f0Bc52e44',
    '0x4982085C9e2F89F2eCb8131Eca71aFAD896e89CB',
    '0xa5f8C5Dbd5F286960b9d90548680aE5ebFf07652',
    '0x21AC7F37D6F4Ac0F71632dA40E40Fdbe98e6E61c',
    '0x12cB7c50F87C2FdaF7eA1Db6A24D4c5d8C9Fbe45',
  ],
};

function generateDemoLeaderboard(chain) {
  const addrs = LEADERBOARD_POOLS[chain] || LEADERBOARD_POOLS.ethereum;
  // PnL + winrate scale by chain so each chain's ranking feels distinct
  const chainSalt = hashAddress(chain || 'ethereum') % 100;
  const basePnl = chain === 'solana' ? 1800000 : chain === 'base' ? 920000 : chain === 'arbitrum' ? 1450000 : chain === 'bsc' ? 1180000 : 2310000;

  // Map address → warrior class via hash for avatar/identity
  const ALL_IDS = ['SHOGUN','DEGEN_RONIN','DIAMOND_SAMURAI','CHAIN_DAIMYO','BRIDGE_WANDERER','GHOST_NINJA','MEV_PRIEST','ORACLE_SEER'];

  return addrs.map((addr, i) => {
    const pnl = Math.round(basePnl * Math.pow(0.78, i) + chainSalt * 1000);
    const winRate = 78 - i * 2 + (chainSalt % 7);
    const h = hashAddress(addr.toLowerCase());
    return {
      rank: i + 1,
      walletAddress: addr,
      pnl,
      winRate: Math.max(35, Math.min(85, winRate)),
      txCount: 340 - i * 28,
      volumeUsd: pnl * 4.2,
      chain,
      classId: ALL_IDS[h % ALL_IDS.length],
    };
  });
}

// ── API Routes ────────────────────────────────────────────────────────────────

app.post('/api/analyze', async (req, res) => {
  const { address, chains = 'ethereum,base,solana' } = req.body;
  if (!address) return res.status(400).json({ error: 'address required' });

  // Live path: hit OKX Web3 DEX API directly. We pull holdings from
  // /balance/all-token-balances-by-address across the requested chains, then
  // total value from /balance/total-value-by-address. Both work with the
  // standard API Key + Secret + Passphrase trio.
  const chainList = String(chains).split(',').map(c => chainIndexOf(c.trim())).filter(Boolean);
  const chainIndexParam = chainList.join(',');

  const [balRes, valRes] = await Promise.all([
    callOkxApi('GET', `/api/v6/dex/balance/all-token-balances-by-address?address=${encodeURIComponent(address)}&chains=${chainIndexParam}`),
    callOkxApi('GET', `/api/v6/dex/balance/total-value-by-address?address=${encodeURIComponent(address)}&chains=${chainIndexParam}`),
  ]);

  if (balRes && balRes.data && Array.isArray(balRes.data)) {
    // OKX returns: data: [{ tokenAssets: [...] }]  (one entry per address)
    const tokens = (balRes.data[0] && balRes.data[0].tokenAssets) || [];
    const totalValue = valRes && valRes.data && valRes.data[0]
      ? parseFloat(valRes.data[0].totalValue || 0)
      : tokens.reduce((sum, t) => sum + (parseFloat(t.balance || 0) * parseFloat(t.tokenPrice || 0)), 0);
    const classId  = determineClassFromData(tokens, totalValue);
    const cls      = CLASSES.find(c => c.id === classId);
    const chainSet = new Set(tokens.map(t => t.chainIndex).filter(Boolean));

    return res.json({
      mode: 'live',
      classId, cls,
      stats: cls.stats,
      totalValue,
      tokenCount: tokens.length,
      chainCount: chainSet.size,
      tokens: tokens.slice(0, 10),
      address,
      txCount: null,
      winRate: null,
    });
  }

  // Demo fallback — deterministic synthetic data from address hash
  res.json(generateDemoPortfolio(address));
});

app.get('/api/signals', async (req, res) => {
  const { chain = 'ethereum', walletType } = req.query;

  // OKX Web3 DEX API: /market/signal/list is POST with chainIndex in body.
  // Returns an array of real smart-money trades within ~minutes of execution.
  const body = { chainIndex: chainIndexOf(chain), limit: '20' };
  if (walletType) body.walletType = walletType;

  const result = await callOkxApi('POST', '/api/v6/dex/market/signal/list', body, 10000);

  if (result && Array.isArray(result.data) && result.data.length) {
    const signals = result.data.map(s => ({
      tokenSymbol:        s.token?.symbol || s.tokenSymbol || s.symbol,
      tokenAddress:       s.token?.tokenAddress || s.tokenAddress,
      walletType:         s.walletType === '1' ? 'Smart Money'
                          : s.walletType === '2' ? 'KOL/Influencer'
                          : 'Whale',
      amountUsd:          parseFloat(s.amountUsd || s.totalAmount || s.amount || 0),
      triggerWalletCount: parseInt(s.triggerWalletCount || 1, 10),
      soldRatioPercent:   parseFloat(s.soldRatioPercent || 0),
      chain,
      minutesAgo:         Math.floor((Date.now() - parseInt(s.timestamp || Date.now() - 600000, 10)) / 60000),
    }));
    return res.json({ mode: 'live', signals });
  }

  res.json({ mode: 'demo', signals: generateDemoSignals(chain) });
});

// Try to fetch real on-chain PnL via the OKX Web3 DEX API directly.
// Returns null on any failure (and the caller falls back to synthetic data).
async function fetchOnchainPnl(address, chain) {
  const ci = chainIndexOf(chain);
  // /market/portfolio/overview gives realizedPnl, winRate, trade counts.
  // timeFrame valid values seem to be '1d' or '7d' (others return param error).
  // We use '7d' for a more representative "smart money" PnL window.
  const r = await callOkxApi(
    'GET',
    `/api/v6/dex/market/portfolio/overview?walletAddress=${encodeURIComponent(address)}&chainIndex=${ci}&timeFrame=7d`,
    null,
    6000
  );
  if (!r || !r.data || typeof r.data !== 'object') return null;
  const d = r.data;
  // OKX's exact field names (confirmed via API probe):
  //   realizedPnlUsd, winRate (string '0'-'100'), buyTxCount, sellTxCount, ...
  const pnl     = parseFloat(d.realizedPnlUsd || d.realizedPnl || d.totalPnl || 0);
  const winRate = parseInt(d.winRate || 0, 10);
  // Many curated leaderboard wallets are cold storage with $0 7-day PnL;
  // callers fall back to synthetic data in that case (intentional behavior).
  if (Math.abs(pnl) < 1) return null;
  return { pnl, winRate };
}

// Deterministic synthesized PnL — used as fallback when on-chain fetch fails.
// Same hash function as everywhere else so a given address ALWAYS gets the
// same numbers (which is how every other "smart money" row is generated too).
function syntheticPnl(address, arenaWinRate) {
  const h = hashAddress(address.toLowerCase());
  // Range $200K – $2.5M, weighted toward higher values for top arena players
  const basePnl = 200000 + (h % 2300000);
  const pnl = Math.round(basePnl + (arenaWinRate || 0) * 4000);
  // Mock win-rate based on arena win-rate (mostly same as arena, slight variance)
  const winRate = Math.max(45, Math.min(88, (arenaWinRate || 60) + ((h >> 8) % 15) - 7));
  return { pnl, winRate };
}

app.get('/api/leaderboard', async (req, res) => {
  const { chain = 'solana' } = req.query;
  const lb = generateDemoLeaderboard(chain);

  // Sprinkle arena stats over the leaderboard so it merges PnL + Arena performance
  const arena = Object.entries(arenaStats)
    .sort((a, b) => (b[1].wins || 0) - (a[1].wins || 0));

  // Inject any real arena-only players at the front if they have a notable record.
  // For each, try real on-chain PnL via the OKX Onchain OS DEX skill;
  // fall back to deterministic synthetic data if CLI isn't authenticated.
  const realPlayers = arena.filter(([, s]) => s.wins >= 1).slice(0, 5);
  const realEntries = await Promise.all(realPlayers.map(async ([addr, s], i) => {
    const arenaTotal = s.wins + s.losses;
    const arenaWinRate = arenaTotal > 0 ? Math.round((s.wins / arenaTotal) * 100) : 0;

    let pnl, winRate;
    const real = await fetchOnchainPnl(addr, chain);
    if (real) {
      pnl = real.pnl;
      winRate = real.winRate;
    } else {
      const synth = syntheticPnl(addr, arenaWinRate);
      pnl = synth.pnl;
      winRate = synth.winRate;
    }

    return {
      rank: i + 1,
      walletAddress: addr,
      pnl,
      winRate,
      txCount: arenaTotal,
      volumeUsd: pnl * 4,
      chain,
      arenaWins: s.wins,
      arenaLosses: s.losses,
      classId: s.classId,
      isArenaChamp: true,
    };
  }));

  // Build a set of arena-champion addresses for dedup
  const champAddrs = new Set(realEntries.map(r => r.walletAddress.toLowerCase()));

  // Augment demo entries with mock arena stats (deterministic from address) —
  // EXCLUDE any address already present as an arena champion (avoids duplicates).
  const demoEntries = lb
    .filter(row => !champAddrs.has(row.walletAddress.toLowerCase()))
    .map(row => ({
      ...row,
      arenaWins: Math.max(0, 50 - row.rank * 4 - (hashAddress(row.walletAddress) % 8)),
      arenaLosses: 8 + (hashAddress(row.walletAddress) % 12),
    }));

  const merged = realEntries
    .concat(demoEntries)
    .slice(0, 10)
    .map((row, i) => ({ ...row, rank: i + 1 }));

  res.json({ mode: 'demo', leaderboard: merged });
});

// ── ARENA — battle record + arena leaderboard ─────────────────────────────────
const arenaStats = {}; // { addr → { wins, losses, classId, lastBattle, totalKO } }

app.post('/api/arena/record', (req, res) => {
  const { address, classId, won, playerKO = 0, oppKO = 0, turns = 0, mode = 'ai', oppAddress = null } = req.body || {};
  if (!address) return res.status(400).json({ error: 'address required' });
  const s = arenaStats[address] || { wins: 0, losses: 0, classId, totalKO: 0, lastBattle: 0 };
  if (won) s.wins++; else s.losses++;
  s.classId = classId || s.classId;
  s.totalKO += playerKO;
  s.lastBattle = Date.now();
  s.lastMode = mode;
  arenaStats[address] = s;

  // Also tally the opponent wallet if it's a wallet challenge
  if (mode === 'wallet' && oppAddress && oppAddress !== address) {
    const o = arenaStats[oppAddress] || { wins: 0, losses: 0, classId: null, totalKO: 0, lastBattle: 0 };
    if (won) o.losses++; else o.wins++;
    o.totalKO += oppKO;
    o.lastBattle = Date.now();
    arenaStats[oppAddress] = o;
  }
  const total = s.wins + s.losses;
  const winRate = total > 0 ? Math.round((s.wins / total) * 100) : 0;
  res.json({ ok: true, stats: { ...s, winRate, total } });
});

app.get('/api/arena/leaderboard', (req, res) => {
  const entries = Object.entries(arenaStats).map(([addr, s]) => ({
    address: addr,
    classId: s.classId,
    wins: s.wins, losses: s.losses,
    total: s.wins + s.losses,
    winRate: (s.wins + s.losses) > 0 ? Math.round(s.wins / (s.wins + s.losses) * 100) : 0,
    totalKO: s.totalKO || 0,
    lastBattle: s.lastBattle,
  }));
  entries.sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);
  res.json({ leaderboard: entries.slice(0, 20) });
});

app.get('/api/arena/stats/:address', (req, res) => {
  const s = arenaStats[req.params.address];
  if (!s) return res.json({ wins: 0, losses: 0, winRate: 0, total: 0 });
  const total = s.wins + s.losses;
  res.json({ wins: s.wins, losses: s.losses, total, winRate: total > 0 ? Math.round(s.wins/total*100) : 0, classId: s.classId });
});

// ── Art proxy (Pollinations.ai → localhost) ───────────────────────────────────
const ART_PROMPTS = {
  SHOGUN:          'legendary+whale+shogun+samurai,+golden+armored+warlord,+dark+ocean,+divine+golden+aura,+anime+fantasy+art,+dramatic+dark+background',
  DEGEN_RONIN:     'ronin+warrior,+wild+hair,+fire+flames,+katana,+anime+fantasy+art,+dark+red+background',
  DIAMOND_SAMURAI: 'samurai+warrior,+crystal+diamond+ice+armor,+blue+glowing+sword,+anime+fantasy+art,+dark+blue+background',
  CHAIN_DAIMYO:    'daimyo+lord,+emerald+green+armor,+glowing+chains+vines,+anime+fantasy+art,+dark+green+background',
  BRIDGE_WANDERER: 'wandering+warrior,+purple+lightning+portals,+dark+cloak,+anime+fantasy+art,+dark+purple+background',
  GHOST_NINJA:     'ghost+ninja,+spectral+silver+body,+stealth+pose,+anime+fantasy+art,+dark+void+background',
};
const ART_SEEDS = { SHOGUN: 1001, DEGEN_RONIN: 2002, DIAMOND_SAMURAI: 3003, CHAIN_DAIMYO: 4004, BRIDGE_WANDERER: 5005, GHOST_NINJA: 6006 };

const SVG_ART = {
  SHOGUN: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 640"><defs>
  <radialGradient id="glow" cx="50%" cy="38%" r="55%"><stop offset="0%" stop-color="#ffd700" stop-opacity="0.45"/><stop offset="100%" stop-color="#0d0a00"/></radialGradient>
  <radialGradient id="halo" cx="50%" cy="35%" r="30%"><stop offset="0%" stop-color="#fff8dc" stop-opacity="0.25"/><stop offset="100%" stop-color="#ffd700" stop-opacity="0"/></radialGradient>
  <filter id="blur"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="glow2"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="512" height="640" fill="#0a0800"/>
  <rect width="512" height="640" fill="url(#glow)"/>
  <ellipse cx="256" cy="230" rx="160" ry="140" fill="#ffd700" opacity="0.12" filter="url(#blur)"/>
  <ellipse cx="256" cy="230" rx="80" ry="70" fill="url(#halo)"/>
  <!-- light rays -->
  <line x1="256" y1="60" x2="100" y2="400" stroke="#ffd700" stroke-width="1.5" opacity="0.08"/>
  <line x1="256" y1="60" x2="160" y2="430" stroke="#ffd700" stroke-width="1.5" opacity="0.12"/>
  <line x1="256" y1="60" x2="256" y2="440" stroke="#ffd700" stroke-width="2" opacity="0.15"/>
  <line x1="256" y1="60" x2="352" y2="430" stroke="#ffd700" stroke-width="1.5" opacity="0.12"/>
  <line x1="256" y1="60" x2="412" y2="400" stroke="#ffd700" stroke-width="1.5" opacity="0.08"/>
  <!-- throne base -->
  <rect x="156" y="380" width="200" height="80" rx="4" fill="#1a1000" stroke="#f5a623" stroke-width="1.5" opacity="0.9"/>
  <rect x="136" y="360" width="240" height="30" rx="3" fill="#2a1800" stroke="#f5a623" stroke-width="1" opacity="0.8"/>
  <!-- body -->
  <rect x="216" y="230" width="80" height="140" rx="8" fill="#c8860a" opacity="0.95" filter="url(#glow2)"/>
  <!-- shoulders -->
  <rect x="166" y="238" width="60" height="28" rx="4" fill="#f5a623" opacity="0.9"/>
  <rect x="286" y="238" width="60" height="28" rx="4" fill="#f5a623" opacity="0.9"/>
  <!-- neck + head -->
  <rect x="240" y="208" width="32" height="28" rx="4" fill="#c8860a" opacity="0.9"/>
  <ellipse cx="256" cy="185" rx="42" ry="48" fill="#d4900e" opacity="0.95"/>
  <!-- helmet -->
  <path d="M214,172 Q220,120 256,108 Q292,120 298,172 L310,192 L202,192 Z" fill="#f5a623" opacity="0.9" filter="url(#glow2)"/>
  <polygon points="256,88 244,120 268,120" fill="#ffd700" opacity="0.95"/>
  <!-- helmet horns -->
  <polygon points="214,172 196,130 220,168" fill="#f5a623" opacity="0.7"/>
  <polygon points="298,172 316,130 292,168" fill="#f5a623" opacity="0.7"/>
  <!-- face mask -->
  <rect x="228" y="178" width="56" height="22" rx="4" fill="#0d0a00" opacity="0.6"/>
  <!-- arms -->
  <rect x="160" y="260" width="56" height="16" rx="6" fill="#c8860a" opacity="0.8"/>
  <rect x="296" y="260" width="56" height="16" rx="6" fill="#c8860a" opacity="0.8"/>
  <!-- ocean waves -->
  <path d="M0,540 Q64,510 128,540 Q192,570 256,540 Q320,510 384,540 Q448,570 512,540 L512,640 L0,640 Z" fill="#1a1200" opacity="0.9"/>
  <path d="M0,570 Q80,545 160,570 Q240,595 320,570 Q400,545 512,570 L512,640 L0,640 Z" fill="#0d0a00" opacity="0.95"/>
  <!-- gold trim -->
  <rect x="156" y="355" width="200" height="3" fill="#ffd700" opacity="0.5"/>
  <text x="256" y="510" text-anchor="middle" font-size="160" font-family="serif" fill="#ffd700" opacity="0.05" transform="rotate(-8,256,510)">将</text>
  <animateTransform attributeName="transform" type="translate" values="0,0;0,-4;0,0" dur="4s" repeatCount="indefinite"/>
</svg>`,

  DEGEN_RONIN: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 640"><defs>
  <radialGradient id="fg" cx="50%" cy="55%" r="65%"><stop offset="0%" stop-color="#ff4444" stop-opacity="0.5"/><stop offset="100%" stop-color="#1a0505"/></radialGradient>
  <filter id="fb"><feGaussianBlur stdDeviation="16"/></filter>
  <filter id="fg2"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="512" height="640" fill="#150404"/>
  <rect width="512" height="640" fill="url(#fg)"/>
  <ellipse cx="256" cy="340" rx="180" ry="200" fill="#ff4444" opacity="0.1" filter="url(#fb)"/>
  <!-- flames background -->
  <path d="M80,640 Q100,560 120,580 Q140,520 160,560 Q180,480 200,540 Q220,460 240,520 Q256,440 272,520 Q292,460 312,540 Q332,480 352,560 Q372,520 392,580 Q412,560 432,640 Z" fill="#3d0a0a" opacity="0.9"/>
  <path d="M120,640 Q140,570 155,600 Q175,530 195,575 Q215,500 235,555 Q250,478 270,555 Q290,500 310,575 Q330,530 350,600 Q370,570 392,640 Z" fill="#6b1515" opacity="0.8"/>
  <path d="M160,640 Q175,590 188,615 Q205,550 220,590 Q240,520 256,570 Q272,520 292,590 Q308,550 325,615 Q340,590 355,640 Z" fill="#aa2020" opacity="0.7"/>
  <!-- body/torso -->
  <path d="M210,250 L180,380 L332,380 L302,250 Z" fill="#8b1a1a" opacity="0.9" filter="url(#fg2)"/>
  <!-- wild hair -->
  <path d="M200,180 Q170,100 200,70 Q220,50 240,80 Q250,40 256,30 Q262,40 272,80 Q292,50 312,70 Q342,100 312,180 Q290,160 256,165 Q222,160 200,180 Z" fill="#cc2222" opacity="0.9" filter="url(#fg2)"/>
  <!-- head -->
  <ellipse cx="256" cy="200" rx="44" ry="50" fill="#bb2020" opacity="0.95"/>
  <!-- eyes glow -->
  <ellipse cx="240" cy="196" rx="8" ry="6" fill="#ff6666" opacity="0.9"/>
  <ellipse cx="272" cy="196" rx="8" ry="6" fill="#ff6666" opacity="0.9"/>
  <ellipse cx="240" cy="196" rx="4" ry="3" fill="#fff" opacity="0.8"/>
  <ellipse cx="272" cy="196" rx="4" ry="3" fill="#fff" opacity="0.8"/>
  <!-- katana -->
  <rect x="290" y="180" width="6" height="200" rx="3" fill="#e0e0e0" opacity="0.9" transform="rotate(25,290,280)"/>
  <rect x="282" y="270" width="22" height="12" rx="2" fill="#cc8800" opacity="0.9" transform="rotate(25,290,280)"/>
  <!-- scar -->
  <line x1="240" y1="185" x2="250" y2="215" stroke="#ff0000" stroke-width="2.5" opacity="0.7"/>
  <!-- arm holding sword -->
  <path d="M290,265 Q310,250 330,240 Q350,230 360,220" fill="none" stroke="#8b1a1a" stroke-width="22" stroke-linecap="round" opacity="0.9"/>
  <text x="256" y="540" text-anchor="middle" font-size="160" font-family="serif" fill="#ff4444" opacity="0.06" transform="rotate(5,256,540)">浪</text>
</svg>`,

  DIAMOND_SAMURAI: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 640"><defs>
  <radialGradient id="ig" cx="50%" cy="38%" r="60%"><stop offset="0%" stop-color="#93c5fd" stop-opacity="0.4"/><stop offset="100%" stop-color="#020b18"/></radialGradient>
  <linearGradient id="blade" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e0f2fe"/><stop offset="100%" stop-color="#60a5fa"/></linearGradient>
  <filter id="ib"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="ig2"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="512" height="640" fill="#020b18"/>
  <rect width="512" height="640" fill="url(#ig)"/>
  <ellipse cx="256" cy="240" rx="140" ry="130" fill="#60a5fa" opacity="0.12" filter="url(#ib)"/>
  <!-- ice floor -->
  <path d="M0,500 L512,500 L512,640 L0,640 Z" fill="#051020" opacity="0.95"/>
  <path d="M60,500 L90,470 L120,500" fill="none" stroke="#60a5fa" stroke-width="1" opacity="0.3"/>
  <path d="M180,500 L200,480 L220,500" fill="none" stroke="#60a5fa" stroke-width="1" opacity="0.3"/>
  <path d="M300,500 L330,465 L360,500" fill="none" stroke="#60a5fa" stroke-width="1" opacity="0.3"/>
  <!-- ice crystals -->
  <polygon points="80,420 92,380 104,420 96,440 84,440" fill="#60a5fa" opacity="0.25"/>
  <polygon points="400,440 410,400 422,440 416,458 406,458" fill="#60a5fa" opacity="0.2"/>
  <polygon points="130,460 138,435 148,460 144,475 136,475" fill="#93c5fd" opacity="0.2"/>
  <!-- body -->
  <path d="M210,260 L196,400 L316,400 L302,260 Q280,240 256,238 Q232,240 210,260 Z" fill="#1e4080" opacity="0.9" filter="url(#ig2)"/>
  <!-- armor plates -->
  <rect x="210" y="265" width="40" height="60" rx="4" fill="#3b82f6" opacity="0.7"/>
  <rect x="262" y="265" width="40" height="60" rx="4" fill="#3b82f6" opacity="0.7"/>
  <line x1="256" y1="265" x2="256" y2="400" stroke="#60a5fa" stroke-width="1.5" opacity="0.4"/>
  <!-- neck -->
  <rect x="240" y="228" width="32" height="34" fill="#1e4080" opacity="0.9"/>
  <!-- head -->
  <ellipse cx="256" cy="200" rx="44" ry="50" fill="#1a3a70" opacity="0.95"/>
  <!-- helmet -->
  <path d="M212,188 Q218,135 256,118 Q294,135 300,188 L312,210 L200,210 Z" fill="#3b82f6" opacity="0.9" filter="url(#ig2)"/>
  <polygon points="256,98 244,128 268,128" fill="#93c5fd" opacity="0.9"/>
  <!-- visor -->
  <rect x="226" y="182" width="60" height="16" rx="3" fill="#020b18" opacity="0.8"/>
  <rect x="226" y="182" width="60" height="6" rx="2" fill="#60a5fa" opacity="0.3"/>
  <!-- katana raised -->
  <rect x="252" y="50" width="8" height="240" rx="4" fill="url(#blade)" opacity="0.95" filter="url(#ig2)"/>
  <rect x="236" y="270" width="40" height="14" rx="3" fill="#93c5fd" opacity="0.8"/>
  <!-- arm up -->
  <path d="M256,270 Q265,220 270,130" fill="none" stroke="#1e4080" stroke-width="28" stroke-linecap="round" opacity="0.9"/>
  <!-- ice aura particles -->
  <circle cx="150" cy="200" r="5" fill="#93c5fd" opacity="0.4"/>
  <circle cx="370" cy="260" r="4" fill="#60a5fa" opacity="0.35"/>
  <circle cx="120" cy="320" r="3" fill="#93c5fd" opacity="0.3"/>
  <circle cx="400" cy="180" r="6" fill="#60a5fa" opacity="0.3"/>
  <text x="256" y="520" text-anchor="middle" font-size="160" font-family="serif" fill="#60a5fa" opacity="0.05">武</text>
</svg>`,

  CHAIN_DAIMYO: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 640"><defs>
  <radialGradient id="ng" cx="50%" cy="45%" r="62%"><stop offset="0%" stop-color="#34d399" stop-opacity="0.4"/><stop offset="100%" stop-color="#001208"/></radialGradient>
  <filter id="nb"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="ng2"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="512" height="640" fill="#001208"/>
  <rect width="512" height="640" fill="url(#ng)"/>
  <ellipse cx="256" cy="270" rx="150" ry="140" fill="#34d399" opacity="0.1" filter="url(#nb)"/>
  <!-- throne -->
  <rect x="176" y="340" width="160" height="180" rx="6" fill="#012214" stroke="#10b981" stroke-width="1.5" opacity="0.9"/>
  <rect x="156" y="320" width="200" height="30" rx="4" fill="#012214" stroke="#34d399" stroke-width="1" opacity="0.85"/>
  <!-- chains left -->
  <circle cx="160" cy="220" r="12" fill="none" stroke="#34d399" stroke-width="3" opacity="0.7"/>
  <circle cx="160" cy="255" r="12" fill="none" stroke="#34d399" stroke-width="3" opacity="0.7"/>
  <circle cx="160" cy="290" r="12" fill="none" stroke="#34d399" stroke-width="3" opacity="0.7"/>
  <line x1="160" y1="232" x2="160" y2="244" stroke="#34d399" stroke-width="3" opacity="0.7"/>
  <line x1="160" y1="267" x2="160" y2="279" stroke="#34d399" stroke-width="3" opacity="0.7"/>
  <!-- chains right -->
  <circle cx="352" cy="220" r="12" fill="none" stroke="#34d399" stroke-width="3" opacity="0.7"/>
  <circle cx="352" cy="255" r="12" fill="none" stroke="#34d399" stroke-width="3" opacity="0.7"/>
  <circle cx="352" cy="290" r="12" fill="none" stroke="#34d399" stroke-width="3" opacity="0.7"/>
  <line x1="352" y1="232" x2="352" y2="244" stroke="#34d399" stroke-width="3" opacity="0.7"/>
  <line x1="352" y1="267" x2="352" y2="279" stroke="#34d399" stroke-width="3" opacity="0.7"/>
  <!-- floating rune hexagons -->
  <polygon points="100,140 116,131 132,140 132,158 116,167 100,158" fill="none" stroke="#34d399" stroke-width="1.5" opacity="0.4"/>
  <polygon points="380,160 394,152 408,160 408,176 394,184 380,176" fill="none" stroke="#34d399" stroke-width="1.5" opacity="0.4"/>
  <polygon points="70,300 82,293 94,300 94,314 82,321 70,314" fill="none" stroke="#10b981" stroke-width="1" opacity="0.35"/>
  <!-- body seated -->
  <path d="M210,260 L200,345 L312,345 L302,260 Q280,245 256,243 Q232,245 210,260 Z" fill="#014a2e" opacity="0.95" filter="url(#ng2)"/>
  <!-- robe details -->
  <line x1="256" y1="260" x2="256" y2="345" stroke="#34d399" stroke-width="1.5" opacity="0.4"/>
  <rect x="210" y="265" width="46" height="30" rx="3" fill="#10b981" opacity="0.3"/>
  <rect x="256" y="265" width="46" height="30" rx="3" fill="#10b981" opacity="0.3"/>
  <!-- neck + head -->
  <rect x="240" y="230" width="32" height="32" fill="#014a2e" opacity="0.9"/>
  <ellipse cx="256" cy="204" rx="44" ry="50" fill="#013d26" opacity="0.95"/>
  <!-- crown/hat -->
  <path d="M212,192 L212,165 L232,155 L256,148 L280,155 L300,165 L300,192 Z" fill="#10b981" opacity="0.9" filter="url(#ng2)"/>
  <rect x="200" y="188" width="112" height="10" rx="3" fill="#34d399" opacity="0.8"/>
  <!-- protocol symbols on chest -->
  <text x="256" y="310" text-anchor="middle" font-size="18" fill="#34d399" opacity="0.5" font-family="monospace">⬡</text>
  <text x="256" y="520" text-anchor="middle" font-size="160" font-family="serif" fill="#34d399" opacity="0.05" transform="rotate(-5,256,520)">名</text>
</svg>`,

  BRIDGE_WANDERER: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 640"><defs>
  <radialGradient id="pg" cx="50%" cy="52%" r="70%"><stop offset="0%" stop-color="#a78bfa" stop-opacity="0.45"/><stop offset="100%" stop-color="#080816"/></radialGradient>
  <filter id="pb"><feGaussianBlur stdDeviation="16"/></filter>
  <filter id="pg2"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="512" height="640" fill="#080816"/>
  <rect width="512" height="640" fill="url(#pg)"/>
  <ellipse cx="256" cy="300" rx="200" ry="200" fill="#7c3aed" opacity="0.1" filter="url(#pb)"/>
  <!-- portal left -->
  <ellipse cx="90" cy="260" rx="58" ry="80" fill="none" stroke="#a78bfa" stroke-width="3" opacity="0.6" filter="url(#pg2)"/>
  <ellipse cx="90" cy="260" rx="42" ry="60" fill="#3d1f8a" opacity="0.4"/>
  <ellipse cx="90" cy="260" rx="28" ry="40" fill="#6d28d9" opacity="0.3"/>
  <!-- portal right -->
  <ellipse cx="422" cy="340" rx="52" ry="72" fill="none" stroke="#a78bfa" stroke-width="3" opacity="0.5" filter="url(#pg2)"/>
  <ellipse cx="422" cy="340" rx="38" ry="54" fill="#3d1f8a" opacity="0.35"/>
  <ellipse cx="422" cy="340" rx="24" ry="36" fill="#6d28d9" opacity="0.25"/>
  <!-- energy bridge -->
  <path d="M130,260 Q200,240 256,255 Q312,270 380,340" fill="none" stroke="#a78bfa" stroke-width="2" stroke-dasharray="12,6" opacity="0.45"/>
  <path d="M130,260 Q200,280 256,265 Q312,250 380,340" fill="none" stroke="#c4b5fd" stroke-width="1.5" stroke-dasharray="8,8" opacity="0.3"/>
  <!-- lightning bolts -->
  <polyline points="140,200 130,230 150,230 138,265" fill="none" stroke="#c4b5fd" stroke-width="2" opacity="0.5"/>
  <polyline points="380,290 368,315 388,315 375,345" fill="none" stroke="#c4b5fd" stroke-width="2" opacity="0.5"/>
  <!-- leaping body -->
  <path d="M220,200 L190,310 L322,310 L292,200 Q272,183 256,182 Q238,183 220,200 Z" fill="#3d1f8a" opacity="0.95" filter="url(#pg2)"/>
  <!-- cloak -->
  <path d="M190,265 Q150,300 160,380 L210,340 L200,310 Z" fill="#2d1560" opacity="0.85"/>
  <path d="M322,265 Q362,300 352,380 L302,340 L312,310 Z" fill="#2d1560" opacity="0.85"/>
  <!-- neck + head -->
  <rect x="240" y="172" width="32" height="32" fill="#3d1f8a" opacity="0.9"/>
  <ellipse cx="256" cy="150" rx="44" ry="48" fill="#2e1575" opacity="0.95"/>
  <!-- hood -->
  <path d="M212,155 Q218,100 256,88 Q294,100 300,155 L312,172 L200,172 Z" fill="#a78bfa" opacity="0.7" filter="url(#pg2)"/>
  <!-- glowing eyes -->
  <ellipse cx="242" cy="148" rx="7" ry="5" fill="#c4b5fd" opacity="0.9"/>
  <ellipse cx="270" cy="148" rx="7" ry="5" fill="#c4b5fd" opacity="0.9"/>
  <!-- chain runes floating -->
  <circle cx="160" cy="150" r="4" fill="#a78bfa" opacity="0.5"/>
  <circle cx="380" cy="200" r="5" fill="#a78bfa" opacity="0.4"/>
  <circle cx="100" cy="380" r="3" fill="#c4b5fd" opacity="0.4"/>
  <text x="256" y="530" text-anchor="middle" font-size="160" font-family="serif" fill="#a78bfa" opacity="0.05" transform="rotate(10,256,530)">渡</text>
</svg>`,

  GHOST_NINJA: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 640"><defs>
  <radialGradient id="vg" cx="50%" cy="46%" r="58%"><stop offset="0%" stop-color="#9ca3af" stop-opacity="0.22"/><stop offset="100%" stop-color="#050505"/></radialGradient>
  <filter id="vb"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="vg2"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="512" height="640" fill="#050505"/>
  <rect width="512" height="640" fill="url(#vg)"/>
  <ellipse cx="256" cy="280" rx="130" ry="160" fill="#6b7280" opacity="0.07" filter="url(#vb)"/>
  <!-- mist wisps -->
  <ellipse cx="100" cy="450" rx="120" ry="30" fill="#1a1a1a" opacity="0.6" filter="url(#vb)"/>
  <ellipse cx="380" cy="490" rx="100" ry="25" fill="#1a1a1a" opacity="0.5" filter="url(#vb)"/>
  <ellipse cx="256" cy="520" rx="150" ry="35" fill="#111" opacity="0.8" filter="url(#vb)"/>
  <!-- shadow on ground -->
  <ellipse cx="256" cy="430" rx="70" ry="16" fill="#000" opacity="0.5"/>
  <!-- crouching body — translucent -->
  <path d="M196,265 L176,370 L336,370 L316,265 Q290,245 256,243 Q222,245 196,265 Z" fill="#374151" opacity="0.55" filter="url(#vg2)"/>
  <!-- legs crouched -->
  <path d="M196,345 Q190,390 210,420 L240,400 L228,360 Z" fill="#374151" opacity="0.5"/>
  <path d="M316,345 Q322,390 302,420 L272,400 L284,360 Z" fill="#374151" opacity="0.5"/>
  <!-- arm + hand throwing shuriken -->
  <path d="M316,280 Q350,260 378,250" fill="none" stroke="#374151" stroke-width="26" stroke-linecap="round" opacity="0.55"/>
  <!-- shuriken -->
  <polygon points="388,240 380,256 396,256" fill="#9ca3af" opacity="0.7" transform="rotate(45,388,248)"/>
  <polygon points="388,240 380,256 396,256" fill="#9ca3af" opacity="0.5" transform="rotate(0,388,248)"/>
  <!-- neck + head -->
  <rect x="238" y="230" width="36" height="16" fill="#374151" opacity="0.55"/>
  <ellipse cx="256" cy="212" rx="44" ry="50" fill="#2d3748" opacity="0.7" filter="url(#vg2)"/>
  <!-- mask -->
  <path d="M212,216 Q218,168 256,154 Q294,168 300,216 L310,232 L202,232 Z" fill="#4b5563" opacity="0.65" filter="url(#vg2)"/>
  <!-- eye slit - glowing -->
  <rect x="228" y="204" width="56" height="8" rx="4" fill="#9ca3af" opacity="0.5"/>
  <rect x="228" y="204" width="56" height="4" rx="2" fill="#d1d5db" opacity="0.4"/>
  <!-- void particles -->
  <circle cx="140" cy="180" r="2.5" fill="#9ca3af" opacity="0.4"/>
  <circle cx="380" cy="220" r="2" fill="#9ca3af" opacity="0.3"/>
  <circle cx="100" cy="320" r="3" fill="#6b7280" opacity="0.35"/>
  <circle cx="420" cy="300" r="2" fill="#9ca3af" opacity="0.3"/>
  <circle cx="180" cy="400" r="2" fill="#6b7280" opacity="0.3"/>
  <circle cx="340" cy="120" r="2.5" fill="#9ca3af" opacity="0.3"/>
  <!-- fading form at bottom -->
  <rect x="200" y="390" width="112" height="40" rx="4" fill="url(#vg)" opacity="0.4"/>
  <text x="256" y="530" text-anchor="middle" font-size="160" font-family="serif" fill="#9ca3af" opacity="0.05">忍</text>
</svg>`,
};

const artCache = {};

function fetchPollinationsArt(classId) {
  return new Promise((resolve, reject) => {
    const prompt = ART_PROMPTS[classId];
    const seed = ART_SEEDS[classId];
    const url = `https://image.pollinations.ai/prompt/${prompt}?width=512&height=640&seed=${seed}&nologo=true&model=turbo`;

    const req = https.get(url, { timeout: 25000 }, (upstream) => {
      if (upstream.statusCode === 301 || upstream.statusCode === 302) {
        const location = upstream.headers.location;
        upstream.resume();
        if (!location) return reject(new Error('redirect without location'));
        https.get(location, { timeout: 25000 }, (r2) => {
          if (r2.statusCode !== 200) { r2.resume(); return reject(new Error(`status ${r2.statusCode}`)); }
          const chunks = [];
          r2.on('data', c => chunks.push(c));
          r2.on('end', () => resolve({ buf: Buffer.concat(chunks), ct: r2.headers['content-type'] || 'image/jpeg' }));
        }).on('error', reject);
        return;
      }
      if (upstream.statusCode !== 200) { upstream.resume(); return reject(new Error(`status ${upstream.statusCode}`)); }
      const chunks = [];
      upstream.on('data', c => chunks.push(c));
      upstream.on('end', () => resolve({ buf: Buffer.concat(chunks), ct: upstream.headers['content-type'] || 'image/jpeg' }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

app.get('/api/art/:classId', async (req, res) => {
  const classId = req.params.classId.toUpperCase();
  if (!ART_PROMPTS[classId]) return res.status(404).json({ error: 'unknown class' });

  if (artCache[classId]) {
    const { buf, ct } = artCache[classId];
    res.set('Content-Type', ct);
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(buf);
  }

  try {
    const { buf, ct } = await fetchPollinationsArt(classId);
    artCache[classId] = { buf, ct };
    res.set('Content-Type', ct);
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(buf);
  } catch {
    // Serve SVG fallback immediately
    const svg = SVG_ART[classId] || SVG_ART.GHOST_NINJA;
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'no-store');
    return res.send(svg);
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    ok: true, version: '1.0.0', onchainos: ONCHAINOS,
    arenaPlayers: Object.keys(arenaStats).length,
    pvpQueued: pvpQueue.length,
    pvpRooms: pvpRooms.size,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PVP — WebSocket matchmaking
// ══════════════════════════════════════════════════════════════════════════════
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/pvp' });

const pvpQueue = [];      // [{ ws, player: { address, hero, deck } }]
const pvpRooms = new Map(); // roomId → { p1, p2, seed }

function genRoomId() { return Math.random().toString(36).slice(2, 10); }
function send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch {} }

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'queue') {
      ws.player = {
        address: msg.address || `guest_${Math.random().toString(36).slice(2,8)}`,
        classId: msg.classId,
        deck: msg.deck || [],
      };
      // Remove dupes
      const idx = pvpQueue.findIndex(q => q.ws === ws);
      if (idx >= 0) pvpQueue.splice(idx, 1);

      // Look for someone else (not same address) in queue
      const otherIdx = pvpQueue.findIndex(q => q.player.address !== ws.player.address);
      if (otherIdx >= 0) {
        const other = pvpQueue.splice(otherIdx, 1)[0];
        const roomId = genRoomId();
        const seed = Math.floor(Math.random() * 1e9);
        pvpRooms.set(roomId, { p1: other.ws, p2: ws, seed });
        other.ws.roomId = ws.roomId = roomId;
        send(other.ws, { type: 'matched', roomId, seed, opponent: ws.player, role: 'host' });
        send(ws, { type: 'matched', roomId, seed, opponent: other.player, role: 'guest' });
      } else {
        pvpQueue.push({ ws, player: ws.player });
        send(ws, { type: 'queued', position: pvpQueue.length });
      }
    }

    if (msg.type === 'leave') {
      const idx = pvpQueue.findIndex(q => q.ws === ws);
      if (idx >= 0) pvpQueue.splice(idx, 1);
      send(ws, { type: 'left' });
    }

    // Battle event relay (host broadcasts events to guest)
    if (msg.type === 'battle-event' && ws.roomId) {
      const room = pvpRooms.get(ws.roomId);
      if (!room) return;
      const peer = room.p1 === ws ? room.p2 : room.p1;
      send(peer, { type: 'battle-event', event: msg.event });
    }

    if (msg.type === 'battle-end' && ws.roomId) {
      const room = pvpRooms.get(ws.roomId);
      if (!room) return;
      const peer = room.p1 === ws ? room.p2 : room.p1;
      send(peer, { type: 'battle-end', won: !msg.won });
      pvpRooms.delete(ws.roomId);
    }
  });

  ws.on('close', () => {
    const idx = pvpQueue.findIndex(q => q.ws === ws);
    if (idx >= 0) pvpQueue.splice(idx, 1);
    if (ws.roomId) {
      const room = pvpRooms.get(ws.roomId);
      if (room) {
        const peer = room.p1 === ws ? room.p2 : room.p1;
        send(peer, { type: 'opponent-left' });
        pvpRooms.delete(ws.roomId);
      }
    }
  });
});

// Keepalive ping every 25s
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  });
}, 25000);

server.listen(PORT, () => {
  console.log(`⛩  Onchain Warriors running at http://localhost:${PORT}`);
  console.log(`   PVP WebSocket: ws://localhost:${PORT}/pvp`);

  // Auth mode detection — reports presence only, never echoes the secret.
  // The CLI binary reads OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE
  // from the inherited process env (see runCLI above).
  const hasApiKey   = !!process.env.OKX_API_KEY;
  const hasSecret   = !!process.env.OKX_SECRET_KEY;
  const hasPass     = !!process.env.OKX_PASSPHRASE;
  const fullyConfigured = hasApiKey && hasSecret && hasPass;
  const partial         = (hasApiKey || hasSecret || hasPass) && !fullyConfigured;

  if (fullyConfigured) {
    console.log(`   Auth mode:    API Key (configured ✓) — live on-chain data enabled`);
  } else if (partial) {
    console.log(`   Auth mode:    ⚠️  PARTIAL — got ${[hasApiKey&&'OKX_API_KEY',hasSecret&&'OKX_SECRET_KEY',hasPass&&'OKX_PASSPHRASE'].filter(Boolean).join(', ')} but need all three. Falling back to demo data.`);
  } else {
    console.log(`   Auth mode:    Demo fallback (no API Key set — see .env.example)`);
  }
});
