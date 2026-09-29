"""Run: .venv/Scripts/python check.py — parsing checks for the price server."""
from app import money, parse_gold

assert money(None) is None
assert money({"units": "31", "nanos": 250_000_000}) == 31.25
assert money({"units": 0, "nanos": 0}) == 0

g = parse_gold({"status": "success", "response": {"update_date": "28/09/2569", "update_time": "15:25",
               "price": {"gold": {"buy": "64,536.12", "sell": "66,850.00"}, "gold_bar": {"buy": "65,850.00", "sell": "66,050.00"}}}})
assert g == {"buy": 65850.0, "sell": 66050.0, "announced": "28/09/2569 15:25"}
print("server check: all good")

from app import KEY_RE
for ok in ["GOLD", "SET:PTT", "US:VOO", "US:BRK-B", "FUND:M0234_2537", "CRYPTO:bitcoin", "CRYPTO:shiba-inu"]:
    assert KEY_RE.fullmatch(ok), ok
for bad in ["", "PTT", "SET:ptt", "CRYPTO:BTC", "SET:PTT;rm", "FUND:../x", "GOLDX"]:
    assert not KEY_RE.fullmatch(bad), bad
print("key check: all good")
