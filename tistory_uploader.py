#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
티스토리 블로그 업로더 GUI
- 폴더 선택하면 .md 파일 자동 탐지
- 카카오 아이디/비밀번호 저장
- 일괄 업로드 (공개/비공개 선택)

사용법:
    python tistory_uploader.py
"""

import sys
import io
import os
import json
import time
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
from pathlib import Path

# UTF-8 설정
if sys.stdout:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr:
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import markdown

try:
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    SELENIUM_OK = True
except ImportError:
    SELENIUM_OK = False

# ============ 설정 ============
CONFIG_FILE = Path(__file__).parent / "tistory_config.json"
ICON_FILE = Path(__file__).parent / "tistory_uploader.ico"
BLOG_URL = "https://labor-engineer.tistory.com"
WRITE_URL = f"{BLOG_URL}/manage/newpost"
LOGIN_URL = "https://www.tistory.com/auth/login"
KAKAO_LOGIN_URL = "https://accounts.kakao.com"


class TistoryUploader:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("티스토리 블로그 업로더")
        self.root.geometry("700x600")
        self.root.resizable(True, True)

        # 아이콘 설정
        if ICON_FILE.exists():
            try:
                self.root.iconbitmap(str(ICON_FILE))
            except:
                pass

        self.config = self.load_config()
        self.md_files = []
        self.driver = None
        self.is_uploading = False

        self.setup_ui()

    def load_config(self):
        """설정 파일 로드"""
        default = {
            "folder": "",
            "kakao_id": "",
            "kakao_pw": "",  # 실제로는 암호화 권장
            "private": True,
            "blog_name": "labor-engineer"
        }
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    saved = json.load(f)
                    default.update(saved)
            except:
                pass
        return default

    def save_config(self):
        """설정 저장"""
        self.config["folder"] = self.folder_var.get()
        self.config["kakao_id"] = self.kakao_id_var.get()
        self.config["kakao_pw"] = self.kakao_pw_var.get()
        self.config["private"] = self.private_var.get()
        self.config["blog_name"] = self.blog_name_var.get()

        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, ensure_ascii=False, indent=2)

    def setup_ui(self):
        """UI 구성"""
        # 메인 프레임
        main = ttk.Frame(self.root, padding=10)
        main.pack(fill=tk.BOTH, expand=True)

        # === 블로그 설정 ===
        blog_frame = ttk.LabelFrame(main, text="블로그 설정", padding=5)
        blog_frame.pack(fill=tk.X, pady=5)

        ttk.Label(blog_frame, text="블로그명:").grid(row=0, column=0, sticky=tk.W)
        self.blog_name_var = tk.StringVar(value=self.config.get("blog_name", "labor-engineer"))
        ttk.Entry(blog_frame, textvariable=self.blog_name_var, width=30).grid(row=0, column=1, sticky=tk.W, padx=5)
        ttk.Label(blog_frame, text=".tistory.com").grid(row=0, column=2, sticky=tk.W)

        # === 카카오 로그인 ===
        login_frame = ttk.LabelFrame(main, text="카카오 로그인", padding=5)
        login_frame.pack(fill=tk.X, pady=5)

        ttk.Label(login_frame, text="아이디:").grid(row=0, column=0, sticky=tk.W)
        self.kakao_id_var = tk.StringVar(value=self.config.get("kakao_id", ""))
        ttk.Entry(login_frame, textvariable=self.kakao_id_var, width=30).grid(row=0, column=1, sticky=tk.W, padx=5)

        ttk.Label(login_frame, text="비밀번호:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.kakao_pw_var = tk.StringVar(value=self.config.get("kakao_pw", ""))
        ttk.Entry(login_frame, textvariable=self.kakao_pw_var, width=30, show="*").grid(row=1, column=1, sticky=tk.W, padx=5)

        ttk.Label(login_frame, text="※ 2차인증 필요시 브라우저에서 직접 입력", foreground="gray").grid(row=2, column=0, columnspan=3, sticky=tk.W)

        # === 폴더 선택 ===
        folder_frame = ttk.LabelFrame(main, text="업로드 폴더", padding=5)
        folder_frame.pack(fill=tk.X, pady=5)

        self.folder_var = tk.StringVar(value=self.config.get("folder", ""))
        ttk.Entry(folder_frame, textvariable=self.folder_var, width=60).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(folder_frame, text="찾아보기", command=self.browse_folder).pack(side=tk.LEFT, padx=5)
        ttk.Button(folder_frame, text="새로고침", command=self.refresh_files).pack(side=tk.LEFT)

        # === 파일 목록 ===
        files_frame = ttk.LabelFrame(main, text="마크다운 파일 목록", padding=5)
        files_frame.pack(fill=tk.BOTH, expand=True, pady=5)

        # 체크박스 리스트
        self.files_listbox = tk.Listbox(files_frame, selectmode=tk.MULTIPLE, height=8)
        self.files_listbox.pack(fill=tk.BOTH, expand=True, side=tk.LEFT)

        scrollbar = ttk.Scrollbar(files_frame, orient=tk.VERTICAL, command=self.files_listbox.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.files_listbox.config(yscrollcommand=scrollbar.set)

        # === 옵션 ===
        options_frame = ttk.Frame(main)
        options_frame.pack(fill=tk.X, pady=5)

        self.private_var = tk.BooleanVar(value=self.config.get("private", True))
        ttk.Checkbutton(options_frame, text="비공개로 발행", variable=self.private_var).pack(side=tk.LEFT)

        self.select_all_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(options_frame, text="전체 선택", variable=self.select_all_var,
                       command=self.toggle_select_all).pack(side=tk.LEFT, padx=20)

        # === 버튼 ===
        btn_frame = ttk.Frame(main)
        btn_frame.pack(fill=tk.X, pady=5)

        self.upload_btn = ttk.Button(btn_frame, text="🚀 업로드 시작", command=self.start_upload)
        self.upload_btn.pack(side=tk.LEFT, padx=5)

        ttk.Button(btn_frame, text="💾 설정 저장", command=self.save_config).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="❌ 종료", command=self.on_close).pack(side=tk.RIGHT, padx=5)

        # === 로그 ===
        log_frame = ttk.LabelFrame(main, text="로그", padding=5)
        log_frame.pack(fill=tk.BOTH, expand=True, pady=5)

        self.log_text = scrolledtext.ScrolledText(log_frame, height=8, state=tk.DISABLED)
        self.log_text.pack(fill=tk.BOTH, expand=True)

        # 초기 파일 로드
        if self.folder_var.get():
            self.refresh_files()

    def log(self, message):
        """로그 출력"""
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, f"{message}\n")
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)
        self.root.update()

    def browse_folder(self):
        """폴더 선택"""
        folder = filedialog.askdirectory(initialdir=self.folder_var.get() or str(Path.home()))
        if folder:
            self.folder_var.set(folder)
            self.refresh_files()

    def refresh_files(self):
        """폴더 내 .md 파일 목록 갱신"""
        self.files_listbox.delete(0, tk.END)
        self.md_files = []

        folder = self.folder_var.get()
        if not folder or not Path(folder).exists():
            return

        for f in sorted(Path(folder).glob("*.md")):
            if f.name.startswith("_") or f.name.upper().startswith("README"):
                continue
            self.md_files.append(f)
            self.files_listbox.insert(tk.END, f.name)

        self.log(f"📂 {len(self.md_files)}개 마크다운 파일 발견")

    def toggle_select_all(self):
        """전체 선택/해제"""
        if self.select_all_var.get():
            self.files_listbox.select_set(0, tk.END)
        else:
            self.files_listbox.select_clear(0, tk.END)

    def get_selected_files(self):
        """선택된 파일 목록"""
        indices = self.files_listbox.curselection()
        return [self.md_files[i] for i in indices]

    def convert_md_to_html(self, md_content):
        """마크다운 → HTML"""
        extensions = [
            "markdown.extensions.fenced_code",
            "markdown.extensions.tables",
            "markdown.extensions.nl2br",
        ]
        return markdown.markdown(md_content, extensions=extensions)

    def extract_title_from_md(self, md_content, filename):
        """마크다운에서 제목 추출 (첫 번째 # 헤더)"""
        for line in md_content.split('\n'):
            line = line.strip()
            if line.startswith('# '):
                return line[2:].strip()
        # 헤더 없으면 파일명 사용
        return filename.stem

    def start_upload(self):
        """업로드 시작"""
        if self.is_uploading:
            messagebox.showwarning("경고", "이미 업로드 중입니다!")
            return

        selected = self.get_selected_files()
        if not selected:
            messagebox.showwarning("경고", "업로드할 파일을 선택해주세요!")
            return

        if not SELENIUM_OK:
            messagebox.showerror("오류", "selenium/undetected-chromedriver가 설치되지 않았습니다!")
            return

        self.save_config()

        # 백그라운드 스레드에서 실행
        self.is_uploading = True
        self.upload_btn.config(state=tk.DISABLED)

        thread = threading.Thread(target=self.upload_files, args=(selected,), daemon=True)
        thread.start()

    def upload_files(self, files):
        """파일 업로드 (백그라운드)"""
        blog_name = self.blog_name_var.get()
        blog_url = f"https://{blog_name}.tistory.com"
        write_url = f"{blog_url}/manage/newpost"

        try:
            self.log("🚀 브라우저 시작...")

            options = uc.ChromeOptions()
            options.add_argument("--window-size=1920,1080")
            self.driver = uc.Chrome(options=options, version_main=144)

            # 로그인
            if not self.do_login():
                self.log("❌ 로그인 실패")
                return

            self.log(f"\n📝 {len(files)}개 파일 업로드 시작")

            success = 0
            for i, file in enumerate(files, 1):
                self.log(f"\n[{i}/{len(files)}] {file.name}")

                # 파일 읽기
                with open(file, 'r', encoding='utf-8') as f:
                    md_content = f.read()

                title = self.extract_title_from_md(md_content, file)
                html_content = self.convert_md_to_html(md_content)

                if self.post_article(write_url, title, html_content):
                    success += 1
                    self.log(f"   ✅ 발행 완료")
                else:
                    self.log(f"   ❌ 발행 실패")

                time.sleep(2)

            self.log(f"\n🎉 완료! {success}/{len(files)}개 발행 성공")
            self.log(f"   블로그: {blog_url}/manage/posts/")

        except Exception as e:
            self.log(f"❌ 오류: {e}")
        finally:
            if self.driver:
                try:
                    self.driver.quit()
                except:
                    pass
            self.is_uploading = False
            self.root.after(0, lambda: self.upload_btn.config(state=tk.NORMAL))

    def do_login(self):
        """카카오 로그인"""
        self.log("🔐 로그인 시도...")

        self.driver.get(LOGIN_URL)
        time.sleep(2)

        # 카카오 버튼 클릭
        try:
            kakao_btn = self.driver.find_element(By.CSS_SELECTOR, "a.link_kakao_id")
            kakao_btn.click()
            time.sleep(3)
        except:
            pass

        # 아이디/비밀번호 입력
        kakao_id = self.kakao_id_var.get()
        kakao_pw = self.kakao_pw_var.get()

        if kakao_id and kakao_pw:
            try:
                # 아이디 입력
                id_input = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='loginId'], input#loginId"))
                )
                id_input.clear()
                id_input.send_keys(kakao_id)
                time.sleep(0.5)

                # 비밀번호 입력
                pw_input = self.driver.find_element(By.CSS_SELECTOR, "input[name='password'], input#password")
                pw_input.clear()
                pw_input.send_keys(kakao_pw)
                time.sleep(0.5)

                # 로그인 버튼
                login_btn = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit'], button.submit")
                login_btn.click()
                self.log("   아이디/비밀번호 자동 입력 완료")
                time.sleep(3)
            except Exception as e:
                self.log(f"   ⚠️ 자동 입력 실패: {e}")

        # 로그인 대기 (2차 인증 등)
        self.log("⏳ 로그인 완료 대기... (2차 인증이 필요하면 브라우저에서 완료해주세요)")
        for i in range(90):
            time.sleep(2)
            try:
                url = self.driver.current_url.lower()
                if "tistory.com" in url and "auth/login" not in url and "kakao" not in url:
                    self.log(f"✅ 로그인 성공! ({i*2}초)")
                    return True
            except:
                pass
            if i > 0 and i % 15 == 0:
                self.log(f"   ... 대기 중 ({i*2}초)")

        return False

    def post_article(self, write_url, title, html_content):
        """글 발행"""
        try:
            self.driver.get(write_url)
            time.sleep(4)

            # 임시저장 알림 처리
            try:
                from selenium.webdriver.common.alert import Alert
                alert = Alert(self.driver)
                alert.dismiss()
                time.sleep(1)
            except:
                pass

            time.sleep(3)
            wait = WebDriverWait(self.driver, 30)

            # 제목
            title_inp = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#post-title-inp")))
            title_inp.clear()
            title_inp.send_keys(title)
            time.sleep(1)
            self.log(f"   - 제목 입력 완료: {title[:30]}...")

            # 본문 입력 (여러 방법 시도)
            body_inserted = False

            # 에디터 로딩 충분히 대기
            time.sleep(3)

            # 방법 1: TinyMCE API 직접 호출 (가장 권장 - 티스토리 기본)
            try:
                result = self.driver.execute_script("""
                    // tinyMCE (대문자) 먼저 시도
                    if (typeof tinyMCE !== 'undefined' && tinyMCE.activeEditor) {
                        tinyMCE.activeEditor.setContent(arguments[0]);
                        tinyMCE.activeEditor.save();
                        return 'tinyMCE';
                    }
                    // tinymce (소문자) 시도
                    if (typeof tinymce !== 'undefined' && tinymce.activeEditor) {
                        tinymce.activeEditor.setContent(arguments[0]);
                        tinymce.activeEditor.save();
                        return 'tinymce';
                    }
                    return false;
                """, html_content)
                if result:
                    body_inserted = True
                    self.log(f"   - 본문 입력 완료 ({result} API)")
            except Exception as e:
                self.log(f"   - TinyMCE API 방법 실패: {e}")

            # 방법 2: 티스토리 iframe 직접 접근 (정확한 구조)
            # iframe ID: editor-tistory_ifr
            # 내부 body ID: tinymce, class: mce-content-body
            if not body_inserted:
                try:
                    iframe = self.driver.find_element(By.ID, "editor-tistory_ifr")
                    self.driver.switch_to.frame(iframe)

                    # 내부 body (ID: tinymce)
                    body = wait.until(EC.presence_of_element_located((By.ID, "tinymce")))

                    # innerHTML 직접 설정 + 이벤트
                    self.driver.execute_script("""
                        var body = arguments[0];
                        var content = arguments[1];
                        body.innerHTML = content;
                        body.dispatchEvent(new Event('input', { bubbles: true }));
                        body.dispatchEvent(new Event('change', { bubbles: true }));
                        body.focus();
                    """, body, html_content)

                    self.driver.switch_to.default_content()
                    body_inserted = True
                    self.log("   - 본문 입력 완료 (iframe #editor-tistory_ifr → #tinymce)")
                except Exception as e:
                    self.driver.switch_to.default_content()
                    self.log(f"   - iframe 직접 접근 실패: {e}")

            # 방법 3: 다른 iframe 셀렉터 시도
            if not body_inserted:
                try:
                    iframe_selectors = [
                        "iframe.tox-edit-area__iframe",
                        "iframe[id*='editor']",
                        "iframe[id*='ifr']",
                        "iframe[id*='mce']",
                    ]
                    for sel in iframe_selectors:
                        try:
                            iframe = self.driver.find_element(By.CSS_SELECTOR, sel)
                            self.driver.switch_to.frame(iframe)
                            body = wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))

                            self.driver.execute_script("""
                                arguments[0].innerHTML = arguments[1];
                                arguments[0].dispatchEvent(new Event('input', { bubbles: true }));
                            """, body, html_content)

                            self.driver.switch_to.default_content()
                            body_inserted = True
                            self.log(f"   - 본문 입력 완료 (iframe: {sel})")
                            break
                        except:
                            self.driver.switch_to.default_content()
                            continue
                except Exception as e:
                    self.log(f"   - 대체 iframe 방법 실패: {e}")
                    self.driver.switch_to.default_content()

            # 방법 4: CodeMirror (HTML 모드)
            if not body_inserted:
                try:
                    # HTML 모드로 전환
                    try:
                        html_btn = self.driver.find_element(By.CSS_SELECTOR, "button[data-mode='html'], .btn-html, button[title='HTML']")
                        html_btn.click()
                        time.sleep(1)
                        self.log("   - HTML 모드 전환")
                    except:
                        pass

                    cm_editor = self.driver.find_element(By.CSS_SELECTOR, ".CodeMirror")
                    self.driver.execute_script("""
                        var cm = arguments[0].CodeMirror;
                        if (cm) {
                            cm.setValue(arguments[1]);
                            cm.save();
                        }
                    """, cm_editor, html_content)
                    body_inserted = True
                    self.log("   - 본문 입력 완료 (CodeMirror)")
                except Exception as e:
                    self.log(f"   - CodeMirror 방법 실패: {e}")

            # 방법 4: contenteditable div (새 에디터)
            if not body_inserted:
                try:
                    editor_selectors = [
                        ".mce-content-body",
                        "[contenteditable='true']",
                        ".editor-content",
                        "#editor-content",
                        "[data-placeholder]",
                        ".ProseMirror",
                    ]
                    for sel in editor_selectors:
                        try:
                            editor = self.driver.find_element(By.CSS_SELECTOR, sel)
                            self.driver.execute_script("""
                                var el = arguments[0];
                                el.innerHTML = arguments[1];
                                el.focus();
                                ['input', 'change', 'keyup', 'blur'].forEach(function(eventType) {
                                    el.dispatchEvent(new Event(eventType, { bubbles: true }));
                                });
                            """, editor, html_content)
                            body_inserted = True
                            self.log(f"   - 본문 입력 완료 (contenteditable: {sel})")
                            break
                        except:
                            continue
                except Exception as e:
                    self.log(f"   - contenteditable 방법 실패: {e}")

            # 방법 5: 클립보드 붙여넣기
            if not body_inserted:
                try:
                    import pyperclip
                    pyperclip.copy(html_content)

                    # 에디터 영역 클릭
                    editor_selectors = [".editor-wrapper", ".write-content", "#editor", ".mce-edit-area", "[contenteditable='true']"]
                    for sel in editor_selectors:
                        try:
                            editor_area = self.driver.find_element(By.CSS_SELECTOR, sel)
                            editor_area.click()
                            break
                        except:
                            continue

                    time.sleep(0.5)

                    # Ctrl+V
                    from selenium.webdriver.common.action_chains import ActionChains
                    actions = ActionChains(self.driver)
                    actions.key_down(Keys.CONTROL).send_keys('v').key_up(Keys.CONTROL).perform()
                    body_inserted = True
                    self.log("   - 본문 입력 완료 (클립보드)")
                except Exception as e:
                    self.log(f"   - 클립보드 방법 실패: {e}")

            if not body_inserted:
                self.log("   ⚠️ 본문 입력 실패 - 수동 입력 필요")

            time.sleep(2)

            # 완료 버튼
            complete_btn = None
            btn_selectors = [
                "//button[contains(text(), '완료')]",
                "//button[contains(text(), '발행')]",
                "//button[contains(@class, 'publish')]",
                "//button[contains(@class, 'btn-publish')]",
            ]
            for sel in btn_selectors:
                try:
                    complete_btn = self.driver.find_element(By.XPATH, sel)
                    break
                except:
                    continue

            if complete_btn:
                complete_btn.click()
                self.log("   - 완료 버튼 클릭")
                time.sleep(2)

            # 비공개/공개 발행
            if self.private_var.get():
                try:
                    private_btn = self.driver.find_element(By.XPATH, "//button[contains(text(), '비공개')]")
                    private_btn.click()
                    self.log("   - 비공개 발행")
                except:
                    try:
                        publish_btn = self.driver.find_element(By.XPATH, "//button[contains(text(), '발행')]")
                        publish_btn.click()
                        self.log("   - 발행 버튼 클릭")
                    except:
                        pass
            else:
                try:
                    public_btn = self.driver.find_element(By.XPATH, "//button[contains(text(), '공개발행')]")
                    public_btn.click()
                    self.log("   - 공개 발행")
                except:
                    pass

            time.sleep(2)
            return body_inserted

        except Exception as e:
            self.log(f"   오류: {e}")
            import traceback
            self.log(f"   상세: {traceback.format_exc()}")
            return False

    def on_close(self):
        """종료"""
        if self.is_uploading:
            if not messagebox.askyesno("확인", "업로드 중입니다. 정말 종료하시겠습니까?"):
                return
        self.save_config()
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass
        self.root.destroy()

    def run(self):
        """실행"""
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
        self.root.mainloop()


if __name__ == "__main__":
    if not SELENIUM_OK:
        print("⚠️ 필요한 패키지를 설치해주세요:")
        print("   pip install undetected-chromedriver markdown")
        input("Enter를 눌러 종료...")
    else:
        app = TistoryUploader()
        app.run()
