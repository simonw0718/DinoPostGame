#!/usr/bin/env python3
"""包裹拼拼樂（dist/pack.html）出題：盤面空地塞滿包裹，每隻恐龍旁邊（上下左右）都要有一封信。

做法：隨機盤面＋恐龍位置 → 把空地隨機切成 2–4 格的包裹、每塊挑一格印信 → 確認恐龍都收得到信
→ 解題器（包裹可旋轉、不可翻面）算所有解法，只留「剛好一種解法」的題目。
同時記錄「只看塞滿、不看信」有幾種塞法：越多代表信的規則越關鍵，排難度用。

用法：python3 tools/gen_pack_levels.py [--seed 7] [--per-tier 12]
輸出：dist/pack_levels.json
"""
import argparse
import json
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'dist' / 'pack_levels.json'
DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))

# 難度：盤面大小、挖掉幾格、恐龍幾隻、包裹大小
TIERS = [
    {'id': 1, 'rows': 3, 'cols': 3, 'holes': (0, 1), 'dinos': (1, 2), 'piece': (2, 3), 'min_fill_ways': 1},
    {'id': 2, 'rows': 3, 'cols': 4, 'holes': (0, 1), 'dinos': (2, 2), 'piece': (2, 4), 'min_fill_ways': 2},
    {'id': 3, 'rows': 4, 'cols': 4, 'holes': (0, 2), 'dinos': (2, 3), 'piece': (3, 4), 'min_fill_ways': 3},
    {'id': 4, 'rows': 4, 'cols': 5, 'holes': (1, 3), 'dinos': (3, 4), 'piece': (3, 4), 'min_fill_ways': 4},
]


def norm(cells):
    r0 = min(r for r, c in cells); c0 = min(c for r, c in cells)
    return tuple(sorted((r - r0, c - c0) for r, c in cells))


def rotations(cells, env):
    """包裹四個方向（去重）；信那格跟著轉。回傳 [(cells, env)]，cells 從 (0,0) 起。"""
    out, seen = [], set()
    cur, e = list(cells), env
    for _ in range(4):
        r0 = min(r for r, c in cur); c0 = min(c for r, c in cur)
        shape = tuple(sorted((r - r0, c - c0) for r, c in cur))
        key = (shape, (e[0] - r0, e[1] - c0))
        if key not in seen:
            seen.add(key); out.append(key)
        cur = [(c, -r) for r, c in cur]; e = (e[1], -e[0])
    return out


def piece_key(cells, env):
    """同形狀＋同信位置（任一旋轉）算同一種包裹，互換不算新解。"""
    return min(rotations(cells, env))


def solve(board, dinos, pieces, check_mail, limit):
    """回傳解法數（最多 limit）。pieces：[(cells, env)]，相同種類只試一次。"""
    empty = sorted(board - dinos)
    kinds = {}
    for cells, env in pieces:
        k = piece_key(cells, env)
        kinds.setdefault(k, [rotations(cells, env), 0])[1] += 1
    kinds = list(kinds.values())
    filled, envs, count = set(), set(), 0

    def mail_ok():
        return all(any((r + dr, c + dc) in envs for dr, dc in DIRS) for r, c in dinos)

    def rec():
        nonlocal count
        if count >= limit:
            return
        free = next((p for p in empty if p not in filled), None)
        if free is None:
            if not check_mail or mail_ok():
                count += 1
            return
        for kind in kinds:
            if kind[1] == 0:
                continue
            for shape, env in kind[0]:
                for ar, ac in shape:   # 讓這塊的某一格對到第一個空位
                    dr, dc = free[0] - ar, free[1] - ac
                    cells = [(r + dr, c + dc) for r, c in shape]
                    if all(p in board and p not in dinos and p not in filled for p in cells):
                        e = (env[0] + dr, env[1] + dc)
                        filled.update(cells); envs.add(e); kind[1] -= 1
                        rec()
                        filled.difference_update(cells); envs.discard(e); kind[1] += 1
                        if count >= limit:
                            return
    rec()
    return count


def connected(cells):
    cells = set(cells)
    if not cells:
        return True
    stack, seen = [next(iter(cells))], set()
    while stack:
        p = stack.pop()
        if p in seen:
            continue
        seen.add(p)
        stack += [(p[0] + dr, p[1] + dc) for dr, dc in DIRS if (p[0] + dr, p[1] + dc) in cells]
    return seen == cells


def partition(free, lo, hi, rng):
    """把空地隨機切成 lo–hi 格的連通塊；失敗回 None。"""
    left, parts = set(free), []
    while left:
        start = min(left)
        part = [start]; left.discard(start)
        want = rng.randint(lo, hi)
        while len(part) < want:
            opts = [(r + dr, c + dc) for r, c in part for dr, dc in DIRS if (r + dr, c + dc) in left]
            if not opts:
                break
            p = rng.choice(opts); part.append(p); left.discard(p)
        if len(part) < lo:
            return None
        parts.append(part)
    return parts


def make_level(tier, rng):
    R, C = tier['rows'], tier['cols']
    board = {(r, c) for r in range(R) for c in range(C)}
    for _ in range(rng.randint(*tier['holes'])):   # 挖邊緣格，盤面不是方塊
        edge = [p for p in board if p[0] in (0, R - 1) or p[1] in (0, C - 1)]
        p = rng.choice(edge)
        if connected(board - {p}):
            board.discard(p)
    dinos = set(rng.sample(sorted(board), rng.randint(*tier['dinos'])))
    free = board - dinos
    if not connected(free):
        return None
    parts = partition(free, *tier['piece'], rng)
    if not parts or len(parts) < 2:
        return None
    pieces = []
    for part in parts:
        env = rng.choice(part)
        pieces.append((part, env))
    envs = {e for _, e in pieces}
    if not all(any((r + dr, c + dc) in envs for dr, dc in DIRS) for r, c in dinos):
        return None
    if solve(board, dinos, pieces, True, 2) != 1:
        return None
    fill_ways = solve(board, dinos, pieces, False, 50)
    if fill_ways < tier['min_fill_ways']:
        return None
    return {
        'tier': tier['id'], 'rows': R, 'cols': C,
        'board': sorted([r, c] for r, c in board),
        'dinos': sorted([r, c] for r, c in dinos),
        # 包裹：cells 從 (0,0) 起、env＝信那格；solution＝答案位置（除錯用，畫面不顯示）
        'pieces': [{'cells': [list(p) for p in norm(cells)],
                    'env': [env[0] - min(r for r, c in cells), env[1] - min(c for r, c in cells)],
                    'solution': [min(r for r, c in cells), min(c for r, c in cells)]} for cells, env in pieces],
        'fill_ways': fill_ways,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--seed', type=int, default=7)
    ap.add_argument('--per-tier', type=int, default=12)
    a = ap.parse_args()
    rng = random.Random(a.seed)
    levels, seen = [], set()
    for tier in TIERS:
        got, tries = 0, 0
        while got < a.per_tier and tries < 200000:
            tries += 1
            lv = make_level(tier, rng)
            if not lv:
                continue
            key = (tuple(map(tuple, lv['board'])), tuple(map(tuple, lv['dinos'])))
            if key in seen:
                continue
            seen.add(key); levels.append(lv); got += 1
        print(f'tier {tier["id"]}: {got} 題（試 {tries} 次）')
    OUT.write_text(json.dumps({'version': 1, 'seed': a.seed, 'levels': levels}, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'寫入 {OUT}（共 {len(levels)} 題）')


if __name__ == '__main__':
    main()
