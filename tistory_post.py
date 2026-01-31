#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
티스토리 자동 발행 스크립트 (v3.0)
- undetected-chromedriver로 봇 탐지 우회
- 2024년 티스토리 새 에디터 UI 지원
- 카카오 로그인 (쿠키 재사용)
- 마크다운 → HTML 변환
- 자동 글 발행

사용법:
    python tistory_post.py --login                    # 첫 실행 시 로그인 및 쿠키 저장
    python tistory_post.py post.md --title "제목"     # 기본 발행
    python tistory_post.py post.md -t "제목" --private # 비공개 발행
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import argparse
import json
import os
import pickle
import time
from pathlib import Path

import markdown

# undetected-chromedriver 사용 (봇 탐지 우회)
try:
    import undetected_chromedriver as uc
    USE_UNDETECTED = True
    print("✅ undetected-chromedriver 사용")
except ImportError:
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    from webdriver_manager.chrome import ChromeDriverManager
    USE_UNDETECTED = False
    print("⚠️ undetected-chromedriver 없음. 일반 selenium 사용")
    print("   설치 권장: pip install undetected-chromedriver")

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException


# ============ 설정 ============
BLOG_NAME = "labor-engineer"
BLOG_URL = f"https://{BLOG_NAME}.tistory.com"
TISTORY_WRITE_URL = f"{BLOG_URL}/manage/newpost"
TISTORY_LOGIN_URL = "https://www.tistory.com/auth/login"

COOKIE_FILE = Path(__file__).parent / "tistory_cookies.pkl"
CONFIG_FILE = Path(__file__).parent / "config.json"

# 크롬 프로필 경로 (Windows 기본)
CHROME_PROFILE_PATH = Path.home() / "AppData" / "Local" / "Google" / "Chrome" / "User Data"

# 기본 설정
DEFAULT_CONFIG = {
    "default_category": "",
    "default_tags": [],
    "default_private": False,
    "headless": False,
    "use_profile": False,
}


def load_config():
    """설정 파일 로드"""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            config = DEFAULT_CONFIG.copy()
            config.update(json.load(f))
            return config
    return DEFAULT_CONFIG.copy()


def save_config(config):
    """설정 파일 저장"""
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def get_driver(headless=False, use_profile=False):
    """Chrome WebDriver 생성 (undetected-chromedriver 우선)"""

    if USE_UNDETECTED:
        options = uc.ChromeOptions()

        if headless:
            options.add_argument("--headless")

        options.add_argument("--window-size=1920,1080")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")

        if use_profile and CHROME_PROFILE_PATH.exists():
            print(f"📂 크롬 프로필 사용: {CHROME_PROFILE_PATH}")
            options.add_argument(f"--user-data-dir={CHROME_PROFILE_PATH}")
            options.add_argument("--profile-directory=Default")

        driver = uc.Chrome(options=options, version_main=144)

    else:
        options = Options()

        if headless:
            options.add_argument("--headless")

        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)

        if use_profile and CHROME_PROFILE_PATH.exists():
            print(f"📂 크롬 프로필 사용: {CHROME_PROFILE_PATH}")
            options.add_argument(f"--user-data-dir={CHROME_PROFILE_PATH}")
            options.add_argument("--profile-directory=Default")

        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

    return driver


def save_cookies(driver):
    """쿠키 저장"""
    cookies = driver.get_cookies()
    with open(COOKIE_FILE, "wb") as f:
        pickle.dump(cookies, f)
    print(f"✅ 쿠키 저장 완료: {COOKIE_FILE}")


def load_cookies(driver):
    """쿠키 로드"""
    if not COOKIE_FILE.exists():
        return False

    try:
        with open(COOKIE_FILE, "rb") as f:
            cookies = pickle.load(f)

        driver.get(BLOG_URL)
        time.sleep(2)

        for cookie in cookies:
            try:
                cookie.pop("sameSite", None)
                cookie.pop("expiry", None)
                driver.add_cookie(cookie)
            except Exception:
                pass

        driver.refresh()
        time.sleep(2)
        return True
    except Exception as e:
        print(f"⚠️ 쿠키 로드 실패: {e}")
        return False


def is_logged_in(driver):
    """로그인 상태 확인"""
    try:
        driver.get(TISTORY_WRITE_URL)
        time.sleep(3)

        current_url = driver.current_url.lower()
        if "newpost" in current_url or "write" in current_url:
            return True

        if "auth/login" in current_url or "accounts.kakao.com" in current_url:
            return False

        return False
    except Exception:
        return False


def do_login(driver, auto_wait=True):
    """카카오 로그인 수행"""
    print("\n" + "="*50)
    print("🔐 카카오 로그인이 필요합니다")
    print("="*50)
    print("1. 브라우저에서 카카오 로그인을 완료해주세요")
    print("2. 로그인 완료 후 자동으로 감지됩니다")
    print("="*50 + "\n")

    driver.get(TISTORY_LOGIN_URL)
    time.sleep(2)

    try:
        kakao_btn = driver.find_element(By.CSS_SELECTOR, "a.link_kakao_id")
        kakao_btn.click()
        print("📱 카카오 로그인 페이지로 이동...")
        time.sleep(2)
    except NoSuchElementException:
        print("ℹ️ 이미 카카오 로그인 페이지입니다.")

    if auto_wait:
        print("⏳ 로그인 대기 중... (최대 180초)")
        for i in range(90):
            time.sleep(2)
            try:
                current_url = driver.current_url.lower()
                if "tistory.com" in current_url and "auth/login" not in current_url and "accounts.kakao.com" not in current_url:
                    print(f"\n✅ 로그인 성공! ({i*2}초)")
                    break
            except:
                pass

            if i > 0 and i % 15 == 0:
                print(f"   ... 아직 대기 중 ({i*2}초)")
        else:
            print("\n⚠️ 타임아웃. 쿠키 저장을 시도합니다...")
    else:
        input("\n로그인 완료 후 Enter를 누르세요...")

    time.sleep(2)
    save_cookies(driver)

    return is_logged_in(driver)


def convert_markdown_to_html(md_content):
    """마크다운 → HTML 변환"""
    extensions = [
        "markdown.extensions.fenced_code",
        "markdown.extensions.codehilite",
        "markdown.extensions.tables",
        "markdown.extensions.toc",
        "markdown.extensions.nl2br",
    ]

    html = markdown.markdown(md_content, extensions=extensions)
    return html


def post_article(driver, title, html_content, category="", tags=None, private=False):
    """글 발행 (2024 새 에디터 UI 대응)"""
    tags = tags or []

    print(f"\n📝 글 발행 시작: {title[:50]}...")

    # 글쓰기 페이지 이동
    driver.get(TISTORY_WRITE_URL)
    time.sleep(3)

    # 임시저장 알림 처리 ("이어 작성하시겠습니까?")
    try:
        from selenium.webdriver.common.alert import Alert
        alert = Alert(driver)
        alert_text = alert.text
        print(f"  ℹ️ 알림 발견: {alert_text[:50]}...")
        # "아니오" 선택 (새로 작성)
        alert.dismiss()
        print("  ✅ 새로 작성 선택")
        time.sleep(2)
    except:
        pass  # 알림이 없으면 무시

    time.sleep(2)

    wait = WebDriverWait(driver, 20)

    try:
        # 1. 제목 입력 (textarea#post-title-inp)
        print("  - 제목 입력 중...")
        title_textarea = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#post-title-inp"))
        )
        title_textarea.clear()
        title_textarea.send_keys(title)
        time.sleep(1)

        # 2. 본문 입력 (TinyMCE iframe 방식)
        print("  - 본문 입력 중...")

        # iframe으로 전환 시도
        try:
            iframe = wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "#editor-tistory_ifr"))
            )
            driver.switch_to.frame(iframe)

            # iframe 내부의 body에 HTML 삽입
            body = wait.until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            driver.execute_script("arguments[0].innerHTML = arguments[1];", body, html_content)

            driver.switch_to.default_content()
            print("  ✅ 본문 입력 완료 (iframe 방식)")
        except Exception as e1:
            print(f"  ⚠️ iframe 방식 실패: {e1}")

            # textarea 직접 입력 시도
            try:
                driver.switch_to.default_content()
                editor_textarea = driver.find_element(By.CSS_SELECTOR, "#editor-tistory")
                editor_textarea.clear()
                driver.execute_script("arguments[0].value = arguments[1];", editor_textarea, html_content)
                print("  ✅ 본문 입력 완료 (textarea 방식)")
            except Exception as e2:
                print(f"  ❌ 본문 입력 실패: {e2}")
                return False

        time.sleep(2)

        # 3. 태그 입력 (#tagText)
        if tags:
            print(f"  - 태그 입력: {', '.join(tags)}")
            try:
                tag_input = driver.find_element(By.CSS_SELECTOR, "#tagText")
                for tag in tags:
                    tag_input.clear()
                    tag_input.send_keys(tag)
                    tag_input.send_keys(Keys.ENTER)
                    time.sleep(0.5)
            except NoSuchElementException:
                print("  ⚠️ 태그 입력란을 찾을 수 없습니다.")

        # 4. 비공개 설정
        if private:
            print("  - 비공개 설정 중...")
            try:
                # 공개설정 영역 찾기
                visibility_btns = driver.find_elements(By.CSS_SELECTOR, "label.lab_g")
                for btn in visibility_btns:
                    if "비공개" in btn.text:
                        btn.click()
                        print("  ✅ 비공개 설정 완료")
                        time.sleep(1)
                        break
            except Exception as e:
                print(f"  ⚠️ 비공개 설정 실패: {e}")

        time.sleep(2)

        # 5. 발행 버튼 클릭 (완료 버튼)
        print("  - 발행 중...")

        publish_selectors = [
            "button.btn.btn-default",  # "완료" 버튼
            "button.btn-publish",
            "#publish-btn",
        ]

        published = False
        for selector in publish_selectors:
            try:
                publish_btn = driver.find_element(By.CSS_SELECTOR, selector)
                if publish_btn.text.strip() in ["완료", "발행", "저장", "Publish"]:
                    publish_btn.click()
                    published = True
                    print(f"  ✅ '{publish_btn.text.strip()}' 버튼 클릭")
                    break
            except NoSuchElementException:
                continue

        if not published:
            # XPath로 "완료" 텍스트 버튼 찾기
            try:
                complete_btn = driver.find_element(By.XPATH, "//button[contains(text(), '완료')]")
                complete_btn.click()
                published = True
                print("  ✅ '완료' 버튼 클릭 (XPath)")
            except NoSuchElementException:
                pass

        if not published:
            print("  ❌ 발행 버튼을 찾을 수 없습니다!")
            print("  💡 수동으로 '완료' 버튼을 클릭해주세요.")
            input("  발행 완료 후 Enter를 누르세요...")

        time.sleep(3)

        # 발행 옵션 레이어에서 실제 발행 버튼 클릭
        # "완료" 버튼 클릭 후 발행 옵션 레이어가 열림
        try:
            # 비공개/공개 선택 후 실제 발행 버튼 클릭
            if private:
                # 비공개 발행 버튼 찾기
                try:
                    private_publish = driver.find_element(By.XPATH, "//button[contains(text(), '비공개')]")
                    private_publish.click()
                    print("  ✅ 비공개 발행 버튼 클릭")
                except:
                    # 또는 발행 버튼 클릭
                    publish_final = driver.find_element(By.XPATH, "//button[contains(text(), '발행')]")
                    publish_final.click()
                    print("  ✅ 발행 버튼 클릭")
            else:
                # 공개 발행 버튼
                try:
                    public_publish = driver.find_element(By.XPATH, "//button[contains(text(), '공개발행')]")
                    public_publish.click()
                    print("  ✅ 공개발행 버튼 클릭")
                except:
                    publish_final = driver.find_element(By.XPATH, "//button[contains(text(), '발행')]")
                    publish_final.click()
                    print("  ✅ 발행 버튼 클릭")
            time.sleep(3)
        except Exception as e:
            print(f"  ⚠️ 최종 발행 버튼 없음 (이미 발행됨?): {e}")

        # 발행 후 URL 확인
        current_url = driver.current_url
        if "newpost" not in current_url.lower():
            print(f"\n✅ 발행 완료!")
            print(f"   URL: {current_url}")
        else:
            print(f"\n⚠️ 발행 확인 필요")
            print(f"   현재 URL: {current_url}")

        return True

    except TimeoutException as e:
        print(f"❌ 시간 초과: {e}")
        return False
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="티스토리 자동 발행 스크립트 (v3.0 - 2024 새 에디터 대응)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
사용 예시:
  python tistory_post.py --login                    # 로그인 및 쿠키 저장
  python tistory_post.py --login --profile          # 크롬 프로필로 로그인 (권장)
  python tistory_post.py post.md --title "제목"     # 기본 발행
  python tistory_post.py post.md -t "제목" --private  # 비공개 발행
  python tistory_post.py post.md -t "제목" --tags "AI,자동화"

첫 사용 시:
  1. pip install undetected-chromedriver markdown
  2. python tistory_post.py --login
  3. 브라우저에서 카카오 로그인 완료
        """
    )

    parser.add_argument("file", nargs="?", help="마크다운 파일 경로")
    parser.add_argument("-t", "--title", help="글 제목 (생략 시 파일명 사용)")
    parser.add_argument("-c", "--category", default="", help="카테고리")
    parser.add_argument("--tags", default="", help="태그 (쉼표로 구분)")
    parser.add_argument("--private", action="store_true", help="비공개 발행")
    parser.add_argument("--login", action="store_true", help="로그인만 수행 (쿠키 저장)")
    parser.add_argument("--profile", action="store_true", help="크롬 프로필 사용 (로그인 정보 유지)")
    parser.add_argument("--headless", action="store_true", help="헤드리스 모드 (화면 없이)")

    args = parser.parse_args()

    config = load_config()

    use_profile = args.profile or config.get("use_profile", False)

    # 로그인만 수행
    if args.login:
        print("\n🚀 티스토리 로그인 시작...")
        print(f"   undetected-chromedriver: {'✅ 사용' if USE_UNDETECTED else '❌ 미설치'}")
        print(f"   크롬 프로필: {'✅ 사용' if use_profile else '❌ 미사용'}")

        driver = get_driver(headless=False, use_profile=use_profile)
        try:
            if use_profile and is_logged_in(driver):
                print("\n✅ 이미 로그인되어 있습니다! (크롬 프로필)")
                save_cookies(driver)
            elif do_login(driver, auto_wait=True):
                print("\n🎉 로그인 성공! 쿠키가 저장되었습니다.")
            else:
                print("\n❌ 로그인 실패. 다시 시도해주세요.")
        finally:
            driver.quit()
        return

    # 파일 필수 확인
    if not args.file:
        parser.print_help()
        print("\n❌ 마크다운 파일을 지정해주세요.")
        return

    # 파일 읽기
    file_path = Path(args.file)
    if not file_path.exists():
        print(f"❌ 파일을 찾을 수 없습니다: {file_path}")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        md_content = f.read()

    # 제목 설정
    title = args.title or file_path.stem

    # 태그 파싱
    tags = [t.strip() for t in args.tags.split(",") if t.strip()] if args.tags else []

    # HTML 변환
    html_content = convert_markdown_to_html(md_content)

    # 브라우저 시작
    print("\n🚀 브라우저 시작...")
    driver = get_driver(headless=args.headless, use_profile=use_profile)

    try:
        # 로그인 확인
        print("🔐 로그인 확인 중...")

        if use_profile and is_logged_in(driver):
            print("✅ 크롬 프로필로 로그인됨")
        elif load_cookies(driver) and is_logged_in(driver):
            print("✅ 쿠키로 로그인 성공")
        else:
            print("⚠️ 로그인 필요. 수동 로그인을 진행합니다.")
            if not do_login(driver, auto_wait=True):
                print("로그인 실패")
                return

        # 글 발행
        success = post_article(
            driver,
            title=title,
            html_content=html_content,
            category=args.category or config.get("default_category", ""),
            tags=tags or config.get("default_tags", []),
            private=args.private or config.get("default_private", False),
        )

        if success:
            print("\n🎉 작업 완료!")

    finally:
        time.sleep(2)
        driver.quit()


if __name__ == "__main__":
    main()
