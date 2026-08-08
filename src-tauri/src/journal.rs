//! 热日志 —— 断点保存的第一道防线
//!
//! ## 为什么不直接写数据库
//! SQLite 单次事务提交在机械硬盘上可能要几十毫秒，每敲几个字就提交一次
//! 会让编辑器发涩。而写一个几十 KB 的纯文本文件只要 1–2 毫秒。
//! 所以分两层：
//!
//!   第一层  热日志   前端防抖 600ms 触发一次，原子覆写，带 fsync
//!   第二层  快照库   每 30 秒 / 每 500 字 提交一次 SQLite 版本快照
//!
//! 断电最坏情况丢失约 600 毫秒的输入，实测约 3–8 个汉字。
//!
//! ## 文件格式
//! 刻意**不用** JSON 包裹正文。格式是：
//!
//! ```text
//! WENZAI-LIVE-1
//! {"doc_id":"…","title":"…","saved_at":"…","char_count":1234,"sha256":"…"}
//! 这里开始是正文原文，一个字节都没被转义……
//! ```
//!
//! 这样即使程序彻底损坏、数据库打不开、我们全都不在了，
//! 用户用记事本打开 `.live` 文件，跳过前两行就是完整的稿子。
//! 一个写作工具最不该做的事，就是把用户的文字锁死在只有自己能读的格式里。

use std::fs::{self, File};
use std::io::{BufWriter, Write};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::error::{AppError, AppResult};
use crate::paths::AppPaths;

const MAGIC: &str = "WENZAI-LIVE-1";

/// 热日志头部元信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveHeader {
    pub doc_id: String,
    pub project_id: String,
    pub title: String,
    /// RFC3339 时间戳
    pub saved_at: String,
    pub char_count: usize,
    /// 正文的 sha256，用于判断内容是否真的变了
    pub sha256: String,
    /// 光标位置，恢复后能跳回原处 —— 这个细节很影响「找回稿子」的体验
    #[serde(default)]
    pub cursor: usize,
}

/// 一条完整的热日志记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveRecord {
    pub header: LiveHeader,
    pub content: String,
}

pub struct Journal {
    live_dir: PathBuf,
}

impl Journal {
    pub fn new(paths: &AppPaths) -> Self {
        Self {
            live_dir: paths.live_dir(),
        }
    }

    fn path_for(&self, doc_id: &str) -> PathBuf {
        self.live_dir.join(format!("{doc_id}.live"))
    }

    /// 原子写入。
    ///
    /// 三步走：写临时文件 → fsync → rename 覆盖。
    /// rename 在 NTFS 上是原子的，因此任何时刻断电，
    /// `.live` 文件要么是旧的完整内容，要么是新的完整内容，
    /// 绝不会出现「写了一半」的残缺文件。
    ///
    /// 返回 `false` 表示内容与上次一致、跳过了本次写入。
    pub fn write(
        &self,
        doc_id: &str,
        project_id: &str,
        title: &str,
        content: &str,
        cursor: usize,
    ) -> AppResult<bool> {
        let digest = sha256_hex(content);

        // 内容没变就别写 —— 用户可能只是移动了光标。
        // 频繁 fsync 对 SSD 寿命不友好，能省则省。
        if let Ok(Some(existing)) = self.read(doc_id) {
            if existing.header.sha256 == digest && existing.header.cursor == cursor {
                return Ok(false);
            }
        }

        fs::create_dir_all(&self.live_dir)?;

        let header = LiveHeader {
            doc_id: doc_id.to_string(),
            project_id: project_id.to_string(),
            title: title.to_string(),
            saved_at: chrono::Local::now().to_rfc3339(),
            char_count: content.chars().count(),
            sha256: digest,
            cursor,
        };

        let final_path = self.path_for(doc_id);
        let tmp_path = final_path.with_extension("live.tmp");

        {
            let file = File::create(&tmp_path)?;
            let mut w = BufWriter::new(file);
            writeln!(w, "{MAGIC}")?;
            writeln!(
                w,
                "{}",
                serde_json::to_string(&header)
                    .map_err(|e| AppError::Other(format!("热日志头部序列化失败：{e}")))?
            )?;
            w.write_all(content.as_bytes())?;
            w.flush()?;
            // 关键：必须 fsync。否则内容只在系统页缓存里，
            // 断电就没了 —— 而断电正是这套机制存在的理由。
            w.get_ref().sync_all()?;
        }

        fs::rename(&tmp_path, &final_path)?;
        Ok(true)
    }

    /// 读取热日志。文件不存在返回 `Ok(None)`，这不算错误。
    pub fn read(&self, doc_id: &str) -> AppResult<Option<LiveRecord>> {
        let path = self.path_for(doc_id);
        if !path.exists() {
            return Ok(None);
        }
        parse_live_file(&path).map(Some)
    }

    /// 扫描全部待恢复的热日志。
    ///
    /// 启动时调用。正常退出会清空 `.live` 目录，
    /// 所以这里但凡扫到东西，就说明上次是**异常退出**。
    pub fn scan_pending(&self) -> AppResult<Vec<LiveRecord>> {
        if !self.live_dir.exists() {
            return Ok(Vec::new());
        }

        let mut out = Vec::new();
        for entry in fs::read_dir(&self.live_dir)? {
            let entry = match entry {
                Ok(e) => e,
                Err(e) => {
                    log::warn!("读取热日志目录项失败，跳过：{e}");
                    continue;
                }
            };
            let path = entry.path();
            let is_live = path
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| e == "live" || e == "rescue")
                .unwrap_or(false);
            if !is_live {
                continue;
            }

            // 单个文件损坏不能拖垮整个恢复流程 —— 其他文档还等着救呢
            match parse_live_file(&path) {
                Ok(rec) => out.push(rec),
                Err(e) => log::error!("热日志 {} 解析失败，已跳过：{e}", path.display()),
            }
        }

        // 最近编辑的排前面，用户多半最关心它
        out.sort_by(|a, b| b.header.saved_at.cmp(&a.header.saved_at));
        Ok(out)
    }

    /// 内容已安全落入数据库后，清掉热日志
    pub fn clear(&self, doc_id: &str) -> AppResult<()> {
        for ext in ["live", "rescue"] {
            let p = self.live_dir.join(format!("{doc_id}.{ext}"));
            if p.exists() {
                if let Err(e) = fs::remove_file(&p) {
                    log::warn!("清理热日志 {} 失败：{e}", p.display());
                }
            }
        }
        Ok(())
    }

    /// 正常退出时整体清空
    pub fn clear_all(&self) -> AppResult<()> {
        if !self.live_dir.exists() {
            return Ok(());
        }
        for entry in fs::read_dir(&self.live_dir)?.flatten() {
            let _ = fs::remove_file(entry.path());
        }
        Ok(())
    }
}

/// 解析热日志文件
///
/// 容错策略非常宽松：哪怕魔数不对、头部 JSON 坏了，
/// 只要文件里还有字，就当作正文全部交还给用户。
/// 宁可多还一点垃圾，也绝不因为格式问题吞掉别人的稿子。
fn parse_live_file(path: &Path) -> AppResult<LiveRecord> {
    let raw = fs::read_to_string(path)?;
    let mut lines = raw.splitn(3, '\n');

    let magic = lines.next().unwrap_or("").trim_end_matches('\r');
    let header_line = lines.next().unwrap_or("").trim_end_matches('\r');
    let body = lines.next().unwrap_or("");

    let fallback_id = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown")
        .to_string();

    if magic != MAGIC {
        log::warn!("热日志 {} 魔数不匹配，按纯文本抢救", path.display());
        return Ok(LiveRecord {
            header: degraded_header(&fallback_id, &raw),
            content: raw,
        });
    }

    let header: LiveHeader = match serde_json::from_str(header_line) {
        Ok(h) => h,
        Err(e) => {
            log::warn!("热日志 {} 头部损坏（{e}），按纯文本抢救", path.display());
            return Ok(LiveRecord {
                header: degraded_header(&fallback_id, body),
                content: body.to_string(),
            });
        }
    };

    Ok(LiveRecord {
        header,
        content: body.to_string(),
    })
}

fn degraded_header(doc_id: &str, content: &str) -> LiveHeader {
    LiveHeader {
        doc_id: doc_id.to_string(),
        project_id: String::new(),
        title: "（从损坏的日志中抢救）".to_string(),
        saved_at: chrono::Local::now().to_rfc3339(),
        char_count: content.chars().count(),
        sha256: sha256_hex(content),
        cursor: 0,
    }
}

pub fn sha256_hex(s: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(s.as_bytes());
    format!("{:x}", hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::paths::AppPaths;

    fn temp_paths() -> AppPaths {
        let base = std::env::temp_dir().join(format!("wenzai-test-{}", uuid::Uuid::new_v4()));
        let p = AppPaths::new(base.join("cfg"), base.join("库")).unwrap();
        p.ensure_all().unwrap();
        p
    }

    #[test]
    fn 写入后应能原样读回() {
        let paths = temp_paths();
        let j = Journal::new(&paths);
        let text = "第一章\n\n他站在雨里，谁也没来。";

        assert!(j.write("doc-1", "proj-1", "第一章", text, 12).unwrap());
        let got = j.read("doc-1").unwrap().unwrap();

        assert_eq!(got.content, text);
        assert_eq!(got.header.cursor, 12);
        assert_eq!(got.header.char_count, text.chars().count());
    }

    #[test]
    fn 内容未变时应跳过写入() {
        let paths = temp_paths();
        let j = Journal::new(&paths);
        assert!(j.write("d", "p", "t", "内容", 0).unwrap());
        assert!(!j.write("d", "p", "t", "内容", 0).unwrap());
        assert!(j.write("d", "p", "t", "内容", 2).unwrap());
    }

    #[test]
    fn 正文含换行与json特殊字符时不应损坏() {
        let paths = temp_paths();
        let j = Journal::new(&paths);
        let nasty = "他说：\"这是{引号}和\\反斜杠\"\n\n还有\t制表符";
        j.write("d2", "p", "t", nasty, 0).unwrap();
        assert_eq!(j.read("d2").unwrap().unwrap().content, nasty);
    }

    #[test]
    fn 扫描应能发现未清理的日志() {
        let paths = temp_paths();
        let j = Journal::new(&paths);
        j.write("a", "p", "甲", "内容甲", 0).unwrap();
        j.write("b", "p", "乙", "内容乙", 0).unwrap();

        assert_eq!(j.scan_pending().unwrap().len(), 2);
        j.clear("a").unwrap();
        assert_eq!(j.scan_pending().unwrap().len(), 1);
    }
}
