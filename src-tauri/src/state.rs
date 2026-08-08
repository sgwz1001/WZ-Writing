//! 运行时状态
//!
//! ## 三级缓冲
//!
//! ```text
//!   前端编辑器
//!       │  每 400ms 节流推送（非防抖 —— 持续输入时也要持续更新）
//!       ▼
//!   内存镜像 LIVE_MIRROR ──── 崩溃钩子从这里抢救 ──► *.rescue
//!       │  距上次落盘 >1.2s，或字数变化 >80，才真正写盘
//!       ▼
//!   热日志 *.live （原子写 + fsync）
//!       │  每 30s / 每 500 字
//!       ▼
//!   SQLite 快照
//! ```
//!
//! 最坏情况下的损失：
//!   进程崩溃（panic / 访问违例）→ ≤ 400 毫秒
//!   断电 / 强制关机            → ≤ 1.2 秒
//!   程序被杀但系统正常          → 0（热日志已落盘）

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::OnceLock;
use std::time::Instant;

use parking_lot::Mutex;
use rusqlite::Connection;

use crate::error::AppResult;
use crate::journal::Journal;
use crate::paths::AppPaths;

/// 内存中的文档镜像
#[derive(Debug, Clone)]
pub struct LiveMirror {
    pub doc_id: String,
    pub project_id: String,
    pub title: String,
    pub content: String,
    pub cursor: usize,
    /// 上次真正写入磁盘的时刻
    pub last_flush: Instant,
    /// 上次写盘时的字数，用于判断变化幅度
    pub last_flush_chars: usize,
}

/// 全局镜像表。
///
/// 之所以用全局静态而不是放进 `AppState`：
/// panic 钩子是一个 `Fn`，拿不到 Tauri 的 `State`，
/// 只能通过全局量访问。这是这里唯一使用全局状态的理由。
static LIVE_MIRROR: OnceLock<Mutex<HashMap<String, LiveMirror>>> = OnceLock::new();

/// 抢救文件的落地目录，同样必须让 panic 钩子能拿到
static RESCUE_DIR: OnceLock<PathBuf> = OnceLock::new();

pub fn mirror() -> &'static Mutex<HashMap<String, LiveMirror>> {
    LIVE_MIRROR.get_or_init(|| Mutex::new(HashMap::new()))
}

pub fn set_rescue_dir(dir: PathBuf) {
    let _ = RESCUE_DIR.set(dir);
}

pub fn rescue_dir() -> Option<&'static PathBuf> {
    RESCUE_DIR.get()
}

/// 落盘判定阈值
const FLUSH_INTERVAL_MS: u128 = 1200;
const FLUSH_CHAR_DELTA: usize = 80;

pub struct AppState {
    pub paths: AppPaths,
    pub conn: Mutex<Connection>,
    pub journal: Journal,
}

impl AppState {
    pub fn new(paths: AppPaths) -> AppResult<Self> {
        paths.ensure_all()?;
        set_rescue_dir(paths.live_dir());

        let conn = crate::db::open(&paths.db_file())?;
        let journal = Journal::new(&paths);

        Ok(Self {
            paths,
            conn: Mutex::new(conn),
            journal,
        })
    }

    /// 心跳：更新内存镜像，并在满足条件时落盘。
    ///
    /// 返回是否真的写了磁盘 —— 前端用它来点亮「已保存」指示。
    pub fn heartbeat(
        &self,
        doc_id: &str,
        project_id: &str,
        title: &str,
        content: &str,
        cursor: usize,
    ) -> AppResult<bool> {
        let chars = content.chars().count();

        let should_flush = {
            let mut m = mirror().lock();
            match m.get_mut(doc_id) {
                Some(prev) => {
                    let elapsed = prev.last_flush.elapsed().as_millis();
                    let delta = chars.abs_diff(prev.last_flush_chars);

                    prev.content = content.to_string();
                    prev.cursor = cursor;
                    prev.title = title.to_string();

                    elapsed >= FLUSH_INTERVAL_MS || delta >= FLUSH_CHAR_DELTA
                }
                None => {
                    // 首次接触这份文档，立刻落一次盘建立基线
                    m.insert(
                        doc_id.to_string(),
                        LiveMirror {
                            doc_id: doc_id.to_string(),
                            project_id: project_id.to_string(),
                            title: title.to_string(),
                            content: content.to_string(),
                            cursor,
                            last_flush: Instant::now(),
                            last_flush_chars: chars,
                        },
                    );
                    true
                }
            }
        };

        if !should_flush {
            return Ok(false);
        }

        let written = self
            .journal
            .write(doc_id, project_id, title, content, cursor)?;

        if written {
            let mut m = mirror().lock();
            if let Some(e) = m.get_mut(doc_id) {
                e.last_flush = Instant::now();
                e.last_flush_chars = chars;
            }
        }

        Ok(written)
    }

    /// 强制落盘。用于紧急保存热键、窗口失焦、程序退出前。
    pub fn flush(&self, doc_id: &str) -> AppResult<bool> {
        let snap = mirror().lock().get(doc_id).cloned();
        let Some(s) = snap else { return Ok(false) };

        let written = self
            .journal
            .write(&s.doc_id, &s.project_id, &s.title, &s.content, s.cursor)?;

        if written {
            let mut m = mirror().lock();
            if let Some(e) = m.get_mut(doc_id) {
                e.last_flush = Instant::now();
                e.last_flush_chars = s.content.chars().count();
            }
        }
        Ok(written)
    }

    /// 全部落盘
    pub fn flush_all(&self) -> AppResult<usize> {
        let ids: Vec<String> = mirror().lock().keys().cloned().collect();
        let mut n = 0;
        for id in ids {
            // 单个文档失败不能中断其余文档的保存
            match self.flush(&id) {
                Ok(true) => n += 1,
                Ok(false) => {}
                Err(e) => log::error!("落盘 {id} 失败：{e}"),
            }
        }
        Ok(n)
    }

    /// 文档已安全提交到数据库，撤下镜像与热日志
    pub fn release(&self, doc_id: &str) -> AppResult<()> {
        mirror().lock().remove(doc_id);
        self.journal.clear(doc_id)
    }
}
