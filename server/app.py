"""Investor RPG price server — one live price feed for every asset kind.

Quote keys (what the web app subscribes to):
  SET:PTT              Thai stock. Settrade Open API realtime when SETTRADE_* is set,
                       otherwise Yahoo Finance (PTT.BK, ~15 min delayed, no key)
  US:VOO               US/global stock or ETF via Yahoo Finance, converted to THB
  FUND:M0234_2537      Thai mutual fund NAV from SEC Open API (needs SEC_API_KEY)
  CRYPTO:bitcoin       CoinGecko coin id, priced in THB (no key)
  GOLD                 Gold bar 96.5% buy-back price, Gold Traders Association

Prices stream to the browser over Server-Sent Events. Credentials live in server/.env and
never reach the browser. Read-only: this server never places orders.

Run:  .venv/Scripts/python -m uvicorn app:app --port 8787      (Windows)
      .venv/bin/python -m uvicorn app:app --port 8787          (macOS/Linux)
"""
import asyncio
import datetime
import json
import os
import re
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

load_dotenv(Path(__file__).with_name(".env"))  # works whatever the working directory is

# Unofficial JSON mirror of goldtraders.or.th announcements (the official site has no API).
GOLD_URL = os.getenv("GOLD_URL", "https://api.chnwt.dev/thai-gold-api/latest")
SEC_API_KEY = os.getenv("SEC_API_KEY", "")
POLL_SEC = int(os.getenv("POLL_SEC", "60"))  # yfinance / CoinGecko / gold
FUND_POLL_SEC = 3600  # NAV is published once a day
KEY_RE = re.compile(r"GOLD|(SET|US):[A-Z0-9.&\-]{1,20}|FUND:[A-Za-z0-9_\-]{1,40}|CRYPTO:[a-z0-9\-]{1,60}")
MAX_KEYS = 60

prices: dict[str, dict] = {}  # quote key -> latest quote (price in THB)
watched: set[str] = set()  # every key any client has asked for
lock = threading.Lock()  # Settrade MQTT callbacks run on the SDK's own thread
status = {"set": "starting", "us": "idle", "fund": "idle", "crypto": "idle", "gold": "idle"}


def put(key: str, price: float, change: float | None = None, source: str = "", **extra):
    with lock:
        prices[key] = {"symbol": key, "price": price, "change": change, "source": source, "ts": time.time(), **extra}


def money(m: dict | None) -> float | None:
    """google.type.Money dict ({units, nanos}) -> float. int64 units may arrive as a string."""
    if not m:
        return None
    return int(m.get("units") or 0) + int(m.get("nanos") or 0) / 1e9


def parse_gold(payload: dict) -> dict:
    r = payload["response"]
    bar = r["price"]["gold_bar"]
    num = lambda s: float(str(s).replace(",", ""))
    return {"buy": num(bar["buy"]), "sell": num(bar["sell"]), "announced": f'{r["update_date"]} {r["update_time"]}'}


def keys(kind: str) -> list[str]:
    with lock:
        return sorted(k.split(":", 1)[1] for k in watched if k.startswith(kind + ":"))


# ---------- Settrade realtime (Thai stocks) ----------
class SetFeed:
    """Disabled until SETTRADE_* credentials are in .env; Yahoo Finance covers SET:* until then."""

    def __init__(self):
        self.market = self.rt = None
        self.subs: set[str] = set()
        self.sub_lock = threading.Lock()

    @property
    def on(self):
        return self.rt is not None

    def connect(self):
        env = {k: os.getenv(f"SETTRADE_{k.upper()}") for k in ("app_id", "app_secret", "app_code")}
        if not all(env.values()):
            status["set"] = "delayed (Yahoo Finance) — add SETTRADE_* to server/.env for realtime"
            return
        try:
            from settrade_v2 import Investor

            investor = Investor(**env, broker_id=os.getenv("SETTRADE_BROKER_ID", "SANDBOX"), is_auto_queue=False)
            self.market = investor.MarketData()
            self.rt = investor.RealtimeDataConnection()
            status["set"] = "realtime (Settrade)"
        except Exception as e:
            status["set"] = f"Settrade error, using Yahoo Finance: {e}"

    def watch(self, symbol: str):
        with self.sub_lock:
            if symbol in self.subs:
                return
            self.subs.add(symbol)
        key = f"SET:{symbol}"
        try:  # snapshot first, so there's a price outside trading hours too
            q = self.market.get_quote_symbol(symbol)
            if q.get("last") is not None:
                put(key, float(q["last"]), q.get("change"), "settrade")
        except Exception as e:
            status["set"] = f"quote error {symbol}: {e}"

        def on_msg(msg):
            if not msg.get("is_success"):
                status["set"] = f"stream error {symbol}: {msg.get('message')}"
                return
            last = money(msg["data"].get("last"))
            if last:
                put(key, last, money(msg["data"].get("change")), "settrade")

        self.rt.subscribe_price_info(symbol, on_message=on_msg).start()


feed = SetFeed()


# ---------- pollers ----------
def yahoo_last(ticker: str) -> tuple[float, float | None] | None:
    import yfinance as yf

    fi = yf.Ticker(ticker).fast_info  # FastInfo.get() silently returns None — index it instead
    last, prev = fi["last_price"], fi["previous_close"]
    if not last:
        return None
    return float(last), (float(last) - float(prev)) if prev else None


def poll_yahoo():
    """SET:* (when Settrade is off) and US:* — blocking, runs in a thread."""
    set_syms = [] if feed.on else keys("SET")
    us_syms = keys("US")
    for sym in set_syms:
        try:
            if q := yahoo_last(f"{sym}.BK"):
                put(f"SET:{sym}", *q, source="yahoo (delayed)")
        except Exception as e:
            status["set"] = f"yahoo error {sym}: {e}"
    if us_syms:
        try:
            fx = yahoo_last("THB=X")  # THB per 1 USD
            if not fx:
                raise RuntimeError("no USD/THB rate")
            for sym in us_syms:
                if q := yahoo_last(sym):
                    put(f"US:{sym}", q[0] * fx[0], q[1] * fx[0] if q[1] is not None else None,
                        source="yahoo (delayed)", usd=q[0], fx=fx[0])
            status["us"] = "ok"
        except Exception as e:
            status["us"] = f"error: {e}"


async def poll_crypto(client: httpx.AsyncClient):
    ids = keys("CRYPTO")
    if not ids:
        return
    try:
        r = await client.get("https://api.coingecko.com/api/v3/simple/price",
                             params={"ids": ",".join(ids), "vs_currencies": "thb", "include_24hr_change": "true"})
        for coin, d in r.raise_for_status().json().items():
            if "thb" in d:
                pct = d.get("thb_24h_change")
                put(f"CRYPTO:{coin}", float(d["thb"]), float(d["thb"]) * pct / (100 + pct) if pct else None, "coingecko")
        status["crypto"] = "ok"
    except Exception as e:
        status["crypto"] = f"error: {e}"


async def poll_gold(client: httpx.AsyncClient):
    try:
        g = parse_gold((await client.get(GOLD_URL)).raise_for_status().json())
        # Holdings are valued at the buy-back price: what you'd actually get if you sold.
        put("GOLD", g["buy"], source="goldtraders", sell=g["sell"], announced=g["announced"])
        status["gold"] = "ok"
    except Exception as e:  # keep serving the last known price
        status["gold"] = f"error: {e}"


async def poll_funds(client: httpx.AsyncClient):
    funds = keys("FUND")
    if not funds:
        return
    if not SEC_API_KEY:
        status["fund"] = "disabled: add SEC_API_KEY to server/.env (free at api-portal.sec.or.th)"
        return
    for proj in funds:
        day = datetime.date.today()
        for _ in range(7):  # weekends / holidays have no NAV (204) — walk back
            r = await client.get(f"https://api.sec.or.th/FundDailyInfo/{proj}/dailynav/{day:%Y-%m-%d}",
                                 headers={"Ocp-Apim-Subscription-Key": SEC_API_KEY})
            if r.status_code == 200 and r.content:
                d = r.json()
                if (nav := d.get("last_val") or d.get("lastVal")) is not None:
                    put(f"FUND:{proj}", float(nav), source="sec", announced=f"{day:%Y-%m-%d}")
                    break
            day -= datetime.timedelta(days=1)
    status["fund"] = "ok"


async def poll_loop():
    async with httpx.AsyncClient(timeout=20, headers={"User-Agent": "investor-rpg/1.0"}) as client:
        last_fund = 0.0
        while True:
            await asyncio.gather(poll_gold(client), poll_crypto(client), asyncio.to_thread(poll_yahoo),
                                 return_exceptions=True)
            if time.time() - last_fund > FUND_POLL_SEC:
                last_fund = time.time()
                await poll_funds(client)
            await asyncio.sleep(POLL_SEC)


async def fetch_now(new: list[str]):
    """Price newly watched keys right away instead of waiting for the next poll."""
    async with httpx.AsyncClient(timeout=20, headers={"User-Agent": "investor-rpg/1.0"}) as client:
        jobs = []
        if any(k.startswith("CRYPTO:") for k in new):
            jobs.append(poll_crypto(client))
        if any(k.startswith("FUND:") for k in new):
            jobs.append(poll_funds(client))
        if any(k.startswith(("US:", "SET:")) for k in new):
            jobs.append(asyncio.to_thread(poll_yahoo))
        await asyncio.gather(*jobs, return_exceptions=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    task = asyncio.create_task(poll_loop())
    await asyncio.to_thread(feed.connect)
    yield
    task.cancel()


app = FastAPI(title="Investor RPG price server", lifespan=lifespan)
# Only public market prices are served (no account data), so any origin may read them.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"])


@app.get("/status")
def get_status():
    with lock:
        return {"status": status, "watched": sorted(watched), "priced": sorted(prices)}


@app.get("/stream")
async def stream(symbols: str = ""):
    wanted = sorted({k for k in (x.strip() for x in symbols.split(",")) if KEY_RE.fullmatch(k)})[:MAX_KEYS]
    with lock:
        new = [k for k in wanted if k not in watched]
        watched.update(wanted)
    if feed.on:
        for k in new:
            if k.startswith("SET:"):
                await asyncio.to_thread(feed.watch, k[4:])
    if new:
        asyncio.create_task(fetch_now(new))

    async def events():
        sent: dict[str, float] = {}
        tick = 0
        while True:
            with lock:
                fresh = [q for k in wanted if (q := prices.get(k)) and sent.get(k) != q["ts"]]
            if fresh or tick == 0:
                sent.update({q["symbol"]: q["ts"] for q in fresh})
                yield f"data: {json.dumps({'prices': fresh, 'status': status}, ensure_ascii=False)}\n\n"
            elif tick % 15 == 0:
                yield ": keep-alive\n\n"
            tick += 1
            await asyncio.sleep(1)

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})
