"""檢查 dist/sign_levels.json（伊奇看路牌）每關：送得到嗎（必拿的信有拿）、最少幾塊路牌、不中途換牌最多拿幾封星星信。
規則同 dist/sign.js v6（教學關 hint 照著放要送得到；三階段題庫，每題四種翻轉都要同解）：站的那格有路牌就轉向（J＝跳，不轉向）→ 往前一格；石頭＝撞到停下；沒有地＝掉下去；
小水池（~）不能放路牌，沒踩跳路牌走不過去（滑倒停在池前），踩跳路牌才跳過一格（落點是石頭／水池＝跳不過，落點沒有地＝掉下去）；
必拿的信（*）沒拿就到小恐龍前＝不算；星星信（+）可不拿。起步方向只用關卡 dir（伊奇不能點他轉）。
滑倒／沒拿信會停在原地，等於那格當初就該放別的路牌，所以搜尋時當死路即可。
用法：python3 tools/check_sign_levels.py
"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
DIRS = {'U': (-1, 0), 'D': (1, 0), 'L': (0, -1), 'R': (0, 1)}


def solve(lv):
    rows = lv['rows']
    at = lambda r, c: rows[r][c] if 0 <= r < len(rows) and 0 <= c < len(rows[0]) else '_'
    start = next((r, c) for r, row in enumerate(rows) for c, ch in enumerate(row) if ch == 'S')
    need = sum(row.count('*') for row in rows)
    bonus = sum(row.count('+') for row in rows)
    best = {}   # 路牌數 -> 最多星星信

    def walk(pos, d, signs, left, got, steps):
        if steps > 40:
            return
        k = pos
        options = [signs[k]] if k in signs else [None] + (sorted(set(left)) if at(*k) in '.*+S' else [])
        for s in options:
            ns, nl, nd = signs, left, d
            if s and k not in signs:
                ns = dict(signs); ns[k] = s; nl = list(left); nl.remove(s)
            if s and s != 'J':
                nd = s
            dr, dc = DIRS[nd]
            r, c = pos[0] + dr, pos[1] + dc
            ch = at(r, c)
            if ch == '~':
                if s != 'J' or at(r + dr, c + dc) in '#~':
                    continue                      # 滑倒
                r, c = r + dr, c + dc; ch = at(r, c)
            if ch in '_#':
                continue
            g = got | {(r, c)} if ch in '*+' else got
            if ch == 'H':
                if sum(at(*p) == '*' for p in g) < need:
                    continue                      # 信還沒拿
                n = len(ns); best[n] = max(best.get(n, -1), sum(at(*p) == '+' for p in g)); continue
            walk((r, c), nd, ns, nl, g, steps + 1)

    walk(start, lv['dir'], {}, list(lv['signs']), frozenset(), 0)
    return best, need, bonus


def follow(lv, signs):
    """照固定的路牌（{(r,c): d}）走一遍，回傳送不送得到。給 hint 用。"""
    rows = lv['rows']
    at = lambda r, c: rows[r][c] if 0 <= r < len(rows) and 0 <= c < len(rows[0]) else '_'
    pos = next((r, c) for r, row in enumerate(rows) for c, ch in enumerate(row) if ch == 'S')
    d, got = lv['dir'], False
    for _ in range(60):
        s = signs.get(pos)
        if s and s != 'J':
            d = s
        dr, dc = DIRS[d]
        r, c = pos[0] + dr, pos[1] + dc
        ch = at(r, c)
        if ch == '~':
            if s != 'J' or at(r + dr, c + dc) in '#~':
                return False
            r, c = r + dr, c + dc; ch = at(r, c)
        if ch in '_#':
            return False
        if ch == '*':
            got = True
        if ch == 'H':
            return got
        pos = (r, c)
    return False


FX, FY = {'L': 'R', 'R': 'L'}, {'U': 'D', 'D': 'U'}


def flip(lv, fx, fy):
    """同 sign.js flip()：左右／上下翻轉，方向與路牌跟著翻。"""
    m = lambda d: (fx and FX.get(d)) or (fy and FY.get(d)) or d
    rows = [r[::-1] if fx else r for r in lv['rows']]
    if fy:
        rows = rows[::-1]
    return {'rows': rows, 'dir': m(lv['dir']), 'signs': [m(d) for d in lv['signs']]}


def main():
    data = json.loads((ROOT / 'dist/sign_levels.json').read_text(encoding='utf-8'))
    bad = 0
    for si, st in enumerate(data['stages'], 1):
        print(f'階段 {si}｜{st["name"]}｜{len(st["levels"])} 題 ×4 翻轉')
        if sum(1 for lv in st['levels'] if lv.get('teach')) != 1:
            bad += 1; print('  教學關要剛好 1 題')
        for i, lv in enumerate(st['levels'], 1):
            tag = f'  {si}-{i}'
            assert len({len(r) for r in lv['rows']}) == 1, f'{tag} 每列寬度不同'
            best, need, bonus = solve(lv)
            if need != 1:
                bad += 1; print(f'{tag}: 必拿的信要剛好 1 封（現在 {need}）')
            if bonus != (2 if si == 3 else 0):
                bad += 1; print(f'{tag}: 星星數不對（第三階段每題 2 顆，其他 0；現在 {bonus}）')
            if lv['signs'].count('J') > 2 or (si == 1 and ('J' in lv['signs'] or any('~' in r for r in lv['rows']))):
                bad += 1; print(f'{tag}: 跳路牌最多 2 塊；第一階段不能有水池和跳')
            if lv.get('hint'):
                steps = {tuple(h['at']): h['d'] for h in lv['hint']}
                if any(list(steps.values()).count(x) > lv['signs'].count(x) for x in steps.values()):
                    bad += 1; print(f'{tag}: hint 用了架上沒有的路牌')
                if any(lv['rows'][r][c] not in '.*+S' for r, c in steps):
                    bad += 1; print(f'{tag}: hint 放在不能放路牌的格子')
                if not follow(lv, steps):
                    bad += 1; print(f'{tag}: 照 hint 放送不到')
            if not best:
                bad += 1; print(f'{tag}: 送不到'); continue
            full = min((n for n, b in best.items() if b == bonus), default=None)
            if full is None:
                bad += 1; print(f'{tag}: 星星拿不齊')
            for fx, fy in ((1, 0), (0, 1), (1, 1)):   # 翻轉後答案要一樣
                if solve(flip(lv, fx, fy))[0] != best:
                    bad += 1; print(f'{tag}: 翻轉 x={fx} y={fy} 後結果不同')
            print(f'{tag}{"（教：" + lv["teach"] + "）" if lv.get("teach") else ""}: 最少 {min(best)} 塊路牌送到' + (f'；星星 {max(best.values())}/{bonus}（全拿要 {full} 塊）' if bonus and full else '') + f'；給 {"".join(lv["signs"])}')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
