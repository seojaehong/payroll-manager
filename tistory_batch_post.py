#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
티스토리 일괄 발행 스크립트
- 한 번 로그인 후 여러 글을 연속 발행
- Part 1~8 블로그 시리즈 업로드용
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import time
from pathlib import Path
import markdown

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# ============ 설정 ============
BLOG_URL = "https://labor-engineer.tistory.com"
WRITE_URL = f"{BLOG_URL}/manage/newpost"
LOGIN_URL = "https://www.tistory.com/auth/login"

# 블로그 글 목록 (제목, 파일경로, 태그)
BLOG_POSTS = [
    {
        "title": "30개 사업장 엑셀 노가다 탈출기: 노무사가 Claude Code로 4대보험 자동화 시스템을 만들다",
        "file": r"C:\Users\iceam\.claude-worktrees\payroll-manager\agitated-edison\docs\refined-blog\part-01.md",
        "tags": ["4대보험", "Claude Code", "노무사", "급여관리", "엑셀자동화"]
    },
    {
        "title": "근로복지공단 API 분석: 데이터 설계의 시작점",
        "file": r"C:\Users\iceam\.claude-worktrees\payroll-manager\agitated-edison\docs\refined-blog\part-02.md",
        "tags": ["4대보험", "API분석", "데이터모델", "근로복지공단", "역설계"]
    },
    {
        "title": "엑셀 매핑 시스템: 30개 사업장, 30개의 다른 양식을 정복하다",
        "file": r"C:\Users\iceam\.claude-worktrees\payroll-manager\agitated-edison\docs\refined-blog\part-03.md",
        "tags": ["4대보험", "엑셀매핑", "xlsx", "급여대장", "데이터변환"]
    },
    {
        "title": "상실신고 보수 자동 계산: 노무사의 암묵지를 코드로",
        "file": r"C:\Users\iceam\.claude-worktrees\payroll-manager\agitated-edison\docs\refined-blog\part-04.md",
        "tags": ["4대보험", "상실신고", "보수계산", "노무사", "자동화"]
    },
    {
        "title": "사업장 중심 UI 설계: 한눈에 보는 30개 사업장",
        "file": r"C:\Users\iceam\.claude-worktrees\payroll-manager\agitated-edison\docs\refined-blog\part-05.md",
        "tags": ["UI설계", "대시보드", "React", "Zustand", "상태관리"]
    },
    {
        "title": "Liquid Glass UI: 디자인 시스템 구축기",
        "file": r"C:\Users\iceam\.claude-worktrees\payroll-manager\agitated-edison\docs\refined-blog\part-06.md",
        "tags": ["LiquidGlass", "다크모드", "TailwindCSS", "UI디자인", "애니메이션"]
    },
    {
        "title": "Offline-First 전략: 인터넷 없이도 작동하는 앱",
        "file": r"C:\Users\iceam\.claude-worktrees\payroll-manager\agitated-edison\docs\refined-blog\part-07.md",
        "tags": ["OfflineFirst", "localStorage", "PWA", "데이터백업", "웹앱"]
    },
    {
        "title": "Firebase 하이브리드 시스템: 로컬과 클라우드의 완벽한 조화",
        "file": r"C:\Users\iceam\.claude-worktrees\payroll-manager\agitated-edison\docs\refined-blog\part-08.md",
        "tags": ["Firebase", "Firestore", "클라우드동기화", "하이브리드앱", "실시간DB"]
    },
]

def convert_md_to_html(md_content):
    """마크다운 → HTML 변환"""
    extensions = [
        "markdown.extensions.fenced_code",
        "markdown.extensions.tables",
        "markdown.extensions.nl2br",
    ]
    return markdown.markdown(md_content, extensions=extensions)


def wait_for_login(driver):
    """수동 로그인 대기"""
    print("\n" + "="*60)
    print("🔐 카카오 로그인이 필요합니다")
    print("="*60)
    print("1. 브라우저에서 카카오 로그인을 완료해주세요")
    print("2. 로그인 완료 후 자동으로 감지됩니다")
    print("="*60)

    driver.get(LOGIN_URL)
    time.sleep(2)

    # 카카오 버튼 클릭
    try:
        kakao_btn = driver.find_element(By.CSS_SELECTOR, "a.link_kakao_id")
        kakao_btn.click()
        time.sleep(2)
    except:
        pass

    # 로그인 완료 대기
    print("⏳ 로그인 대기 중...")
    for i in range(90):
        time.sleep(2)
        try:
            url = driver.current_url.lower()
            if "tistory.com" in url and "auth/login" not in url and "kakao" not in url:
                print(f"✅ 로그인 성공! ({i*2}초)")
                return True
        except:
            pass
        if i > 0 and i % 10 == 0:
            print(f"   ... 대기 중 ({i*2}초)")

    return False


def post_article(driver, title, html_content, tags, private=True):
    """글 발행"""
    print(f"\n📝 발행: {title[:40]}...")

    driver.get(WRITE_URL)
    time.sleep(3)

    # 임시저장 알림 처리
    try:
        from selenium.webdriver.common.alert import Alert
        alert = Alert(driver)
        alert.dismiss()  # 새로 작성
        time.sleep(1)
    except:
        pass

    time.sleep(2)
    wait = WebDriverWait(driver, 20)

    try:
        # 제목 입력
        title_inp = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#post-title-inp")))
        title_inp.clear()
        title_inp.send_keys(title)
        time.sleep(1)

        # 본문 입력 (iframe)
        iframe = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#editor-tistory_ifr")))
        driver.switch_to.frame(iframe)
        body = wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        driver.execute_script("arguments[0].innerHTML = arguments[1];", body, html_content)
        driver.switch_to.default_content()
        time.sleep(1)

        # 태그 입력
        tag_input = driver.find_element(By.CSS_SELECTOR, "#tagText")
        for tag in tags:
            tag_input.clear()
            tag_input.send_keys(tag)
            tag_input.send_keys(Keys.ENTER)
            time.sleep(0.3)

        time.sleep(1)

        # 완료 버튼
        complete_btn = driver.find_element(By.XPATH, "//button[contains(text(), '완료')]")
        complete_btn.click()
        time.sleep(2)

        # 비공개 발행
        if private:
            try:
                private_btn = driver.find_element(By.XPATH, "//button[contains(text(), '비공개')]")
                private_btn.click()
                time.sleep(2)
            except:
                try:
                    publish_btn = driver.find_element(By.XPATH, "//button[contains(text(), '발행')]")
                    publish_btn.click()
                    time.sleep(2)
                except:
                    pass
        else:
            try:
                public_btn = driver.find_element(By.XPATH, "//button[contains(text(), '공개발행')]")
                public_btn.click()
                time.sleep(2)
            except:
                pass

        print(f"   ✅ 발행 완료")
        return True

    except Exception as e:
        print(f"   ❌ 오류: {e}")
        return False


def main():
    print("\n🚀 티스토리 일괄 발행 시작")
    print(f"   총 {len(BLOG_POSTS)}개 글 예정")

    # 브라우저 시작
    options = uc.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    driver = uc.Chrome(options=options, version_main=144)

    try:
        # 로그인
        if not wait_for_login(driver):
            print("❌ 로그인 실패")
            return

        time.sleep(2)

        # 글 발행
        success_count = 0
        for i, post in enumerate(BLOG_POSTS, 1):
            print(f"\n[{i}/{len(BLOG_POSTS)}] {post['title'][:30]}...")

            # 파일 읽기
            file_path = Path(post['file'])
            if not file_path.exists():
                print(f"   ⚠️ 파일 없음: {file_path}")
                continue

            with open(file_path, 'r', encoding='utf-8') as f:
                md_content = f.read()

            html_content = convert_md_to_html(md_content)

            # 발행
            if post_article(driver, post['title'], html_content, post['tags'], private=True):
                success_count += 1

            # 쿨다운
            time.sleep(3)

        print(f"\n" + "="*60)
        print(f"🎉 완료! {success_count}/{len(BLOG_POSTS)}개 발행 성공")
        print(f"   블로그: {BLOG_URL}/manage/posts/")
        print("="*60)

    finally:
        time.sleep(3)
        driver.quit()


if __name__ == "__main__":
    main()
