#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
블로그 시리즈 일괄 업로드 스크립트
급여관리 시스템 시리즈 1~5편을 티스토리에 자동 발행
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import time
from pathlib import Path
import subprocess

# 블로그 글 목록
BLOG_POSTS = [
    {
        "file": "payroll-manager/docs/blog/01-problem-definition.md",
        "title": "[1편] 30개 사업장 4대보험 신고, 매달 반복되는 지옥을 자동화하기로 했다",
        "tags": "4대보험,자동화,노무사,급여관리,AI개발",
    },
    {
        "file": "payroll-manager/docs/blog/02-data-design.md",
        "title": "[2편] 근로복지공단 API 까보기 - 데이터 설계의 시작",
        "tags": "API,데이터설계,스키마,근로복지공단,TypeScript",
    },
    {
        "file": "payroll-manager/docs/blog/03-excel-magic.md",
        "title": "[3편] 엑셀의 마법 - xlsx 라이브러리와 컬럼 매핑 시스템",
        "tags": "엑셀,xlsx,JavaScript,자동화,데이터파싱",
    },
    {
        "file": "payroll-manager/docs/blog/04-liquid-glass-ui.md",
        "title": "[4편] 리퀴드 글라스 UI - 애플 감성 다크모드 만들기",
        "tags": "UI,다크모드,CSS,Tailwind,애플디자인",
    },
    {
        "file": "payroll-manager/docs/blog/05-offline-first.md",
        "title": "[5편] 오프라인 우선 설계 - Zustand와 localStorage의 조합",
        "tags": "Zustand,localStorage,React,상태관리,오프라인",
    },
]

CATEGORY = "AI와 노무사가 만드는 4대보험 자동화"  # 티스토리 카테고리 (없으면 빈 문자열)

def main():
    base_path = Path(__file__).parent

    print("=" * 60)
    print("  급여관리 시스템 블로그 시리즈 자동 발행")
    print("  총 5편")
    print("=" * 60)
    print()

    # 쿠키 확인
    cookie_file = base_path / "tistory_cookies.pkl"
    if not cookie_file.exists():
        print("[!] 먼저 로그인이 필요합니다:")
        print("    python tistory_post.py --login")
        return

    for i, post in enumerate(BLOG_POSTS, 1):
        file_path = base_path / post["file"]

        if not file_path.exists():
            print(f"[{i}/5] 파일 없음: {post['file']}")
            continue

        print(f"\n[{i}/5] 발행 중: {post['title'][:40]}...")

        cmd = [
            "python",
            str(base_path / "tistory_post.py"),
            str(file_path),
            "--title", post["title"],
            "--tags", post["tags"],
        ]

        if CATEGORY:
            cmd.extend(["--category", CATEGORY])

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
            if result.returncode == 0:
                print(f"    [OK] 발행 완료!")
            else:
                print(f"    [!] 오류 발생")
                print(f"    {result.stderr[:200] if result.stderr else 'Unknown error'}")
        except Exception as e:
            print(f"    [!] 예외: {e}")

        # 다음 글 발행 전 대기 (서버 부하 방지)
        if i < len(BLOG_POSTS):
            print("    잠시 대기 중... (10초)")
            time.sleep(10)

    print("\n" + "=" * 60)
    print("  발행 완료!")
    print("  https://labor-engineer.tistory.com 에서 확인하세요")
    print("=" * 60)


if __name__ == "__main__":
    main()
