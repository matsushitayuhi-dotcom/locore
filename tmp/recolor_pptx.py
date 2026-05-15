#!/usr/bin/env python3
"""
PowerPoint テンプレート (説明資料テンプレ.pptx = Deloitte Template) の
色を Locore ブランドキットに一括置換するスクリプト。

設計方針:
  - Deloitte の緑 (Deloitte Green, accent1-4) → Locore Terracotta 系
  - Deloitte の青 / 紺 → Locore Ink (deep navy)
  - Deloitte のティール → Locore Coffee / Sand 系
  - Deloitte のオレンジ・赤 → Locore Terracotta
  - Deloitte の黄 → Locore Amber
  - グレー系は微調整のみ（クリーム背景に合うよう少し温かく）

Run: python3 recolor_pptx.py
"""

import os
import re
import sys
import shutil
import zipfile

import tempfile

# 引数または CWD 相対パスで .pptx を探す
SRC = sys.argv[1] if len(sys.argv) > 1 else "説明資料テンプレ.pptx"
DST = sys.argv[2] if len(sys.argv) > 2 else "説明資料テンプレ_locore.pptx"
WORK = os.path.join(tempfile.gettempdir(), "pptx_work_locore")

# ============================================================================
# 色マッピング (Deloitte → Locore)
# ============================================================================
# 大文字 6 桁の hex で揃える。.pptx XML 内の表記もすべて大文字。

COLOR_MAP = {
    # --- Deloitte Green family → Locore Terracotta family ----------------
    "86BC25": "B5453A",  # Deloitte Green (main accent1) → Terracotta
    "43B02A": "D26954",  # Green 4 → Terracotta Soft
    "26890D": "B5453A",  # Green 3 → Terracotta
    "046A38": "7A4A33",  # Green 6 → Coffee
    "2C5234": "5C3A2E",  # Green 7 (darkest) → Deep Brown
    "009A44": "C45444",  # Green 5 → Terracotta variant
    "C4D600": "E58D3B",  # Green 2 (lime) → Amber
    "E3E48D": "F4D9A8",  # Green 1 (light) → Light Amber

    # --- Deloitte Teal family → Coffee / Sand ----------------------------
    "0D8390": "B58563",  # Teal accent5 → Taupe
    "004F59": "5C3A2E",  # Teal 7 → Deep Brown
    "007680": "7A4A33",  # Teal 6 → Coffee
    "0097A9": "B58563",  # Teal 5 → Taupe
    "00ABAB": "D26954",  # Teal 4 → Terracotta Soft
    "6FC2B4": "E8D9C2",  # Teal 3 → Sand
    "9DD4CF": "F3E9D2",  # Teal 2 → Cream Deep
    "DDEFE8": "FAF5EB",  # Teal 1 → Cream

    # --- Deloitte Blue family → Ink Navy ---------------------------------
    "007CB0": "1B2330",  # Blue accent6 → Ink
    "041E42": "1B2330",  # Blue 7 → Ink
    "012169": "1B2330",  # Blue 6 → Ink
    "005587": "2D3540",  # Blue 5 → Ink slightly lighter
    "0076A8": "5C6470",  # Blue 4 → Ink Muted
    "00A3E0": "B5453A",  # Blue 3 (= hyperlink color) → Terracotta
    "62B5E5": "D26954",  # Blue 2 → Terracotta Soft
    "A0DCFF": "F4D9A8",  # Blue 1 → Light Amber

    # --- Accent reds / oranges / yellows --------------------------------
    "DA291C": "B5453A",  # Red → Terracotta
    "ED8B00": "B5453A",  # Orange (68 places! big accent) → Terracotta
    "FFCD00": "E58D3B",  # Yellow → Amber

    # --- Hyperlink / followed link --------------------------------------
    "7F7F7F": "5C6470",  # folHlink → Ink Muted

    # --- Grays — slightly warmer to match cream base --------------------
    "53565A": "1B2330",  # Cool Gray 11 → Ink (deepest gray = ink)
    "63666A": "5C6470",  # Cool Gray 10 → Ink Muted
    "75787B": "7A8290",  # Cool Gray 9 → keep gray but slightly lighter
    "97999B": "A0A6AE",  # Cool Gray 7 → keep gray
    "A7A8AA": "B8BDC4",  # Cool Gray 6
    "BBBCBC": "C8CDD2",  # Cool Gray 4
    "A4A3A4": "A0A6AE",  # Misc gray
    "D0D0CE": "E8D9C2",  # Cool Gray 2 → Sand (warm)

    # 黒・白・透明色などはそのまま (000000, FFFFFF) → 変換マップに含めない
}


def patch_xml(content: bytes) -> bytes:
    """XML 文字列の中の hex 値を一括置換"""
    text = content.decode("utf-8")
    for old, new in COLOR_MAP.items():
        # 大文字
        text = text.replace(old, new)
        # 小文字でも書かれている可能性
        text = text.replace(old.lower(), new)
    return text.encode("utf-8")


def main():
    if not os.path.exists(SRC):
        print(f"Source not found: {SRC}", file=sys.stderr)
        sys.exit(1)

    # 作業ディレクトリを再作成
    if os.path.exists(WORK):
        shutil.rmtree(WORK)
    os.makedirs(WORK)

    # 展開
    with zipfile.ZipFile(SRC, "r") as z:
        z.extractall(WORK)

    # 全ての XML ファイルを書き換え
    changed = 0
    for root, _dirs, files in os.walk(WORK):
        for name in files:
            if not name.endswith((".xml", ".rels")):
                continue
            path = os.path.join(root, name)
            with open(path, "rb") as f:
                original = f.read()
            patched = patch_xml(original)
            if patched != original:
                with open(path, "wb") as f:
                    f.write(patched)
                changed += 1

    # テーマ名 "DT" → "Locore" にも変更（任意、見つけやすさのため）
    # theme1.xml には name="DT" がある
    for theme_file in ["theme1.xml", "theme2.xml", "theme3.xml"]:
        path = os.path.join(WORK, "ppt", "theme", theme_file)
        if not os.path.exists(path):
            continue
        with open(path, "rb") as f:
            txt = f.read().decode("utf-8")
        txt = txt.replace('name="DT"', 'name="Locore"')
        txt = re.sub(
            r'name="DT Template_A4_J_\d+"',
            'name="Locore Template A4 Portrait"',
            txt,
        )
        with open(path, "wb") as f:
            f.write(txt.encode("utf-8"))

    print(f"Patched {changed} files.")

    # 再パッケージ (.pptx として保存)
    if os.path.exists(DST):
        os.remove(DST)
    with zipfile.ZipFile(DST, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _dirs, files in os.walk(WORK):
            for name in files:
                full = os.path.join(root, name)
                rel = os.path.relpath(full, WORK)
                # .pptx の内部パスは forward slash 必須
                arcname = rel.replace("\\", "/")
                z.write(full, arcname)

    print(f"Saved: {DST}")
    print(f"Size:  {os.path.getsize(DST)} bytes")


if __name__ == "__main__":
    main()
