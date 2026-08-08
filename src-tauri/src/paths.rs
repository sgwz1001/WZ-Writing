//! 路径解析
//!
//! 本模块统一处理三类目录，并对「中文路径」做了专门处理：
//!
//!   配置目录  %APPDATA%\Wenzai          —— 设置、模型密钥、皮肤偏好
//!   资料库    用户自定义（默认 文档\文载） —— 用户的稿件，可整个搬走
//!   热日志    资料库\.live               —— 崩溃恢复用的高频落盘区
//!
//! ## 关于中文路径
//! Windows 上路径底层是 UTF-16。Rust 的 `PathBuf` 用 `OsString` 承载，
//! 中文本身没有问题；真正的坑在于把路径交给 C 库（SQLite）的那一刻 ——
//! 必须保证它是合法 UTF-8，SQLite 的 Windows VFS 会自行转回 UTF-16。
//! 因此这里在写入配置前会显式校验一次，宁可早报错也不要在深处炸掉。

use std::path::{Path, PathBuf};

use crate::error::{AppError, AppResult};

/// 资料库内的固定子目录名
pub const DIR_LIVE: &str = ".live";
pub const DIR_SNAPSHOT: &str = ".snapshots";
pub const DIR_ASSETS: &str = "assets";
pub const DIR_EXPORT: &str = "导出";
pub const DIR_TRASH: &str = ".trash";

/// 主数据库文件名
pub const DB_FILE: &str = "wenzai.db";

/// 解析后的运行时路径集合
#[derive(Debug, Clone)]
pub struct AppPaths {
    /// 配置目录（不随资料库迁移）
    pub config_dir: PathBuf,
    /// 资料库根目录（用户可自定义，可包含中文）
    pub vault_dir: PathBuf,
}

impl AppPaths {
    pub fn new(config_dir: PathBuf, vault_dir: PathBuf) -> AppResult<Self> {
        validate_path(&config_dir)?;
        validate_path(&vault_dir)?;
        Ok(Self {
            config_dir,
            vault_dir,
        })
    }

    pub fn db_file(&self) -> PathBuf {
        self.vault_dir.join(DB_FILE)
    }

    pub fn live_dir(&self) -> PathBuf {
        self.vault_dir.join(DIR_LIVE)
    }

    pub fn snapshot_dir(&self) -> PathBuf {
        self.vault_dir.join(DIR_SNAPSHOT)
    }

    pub fn assets_dir(&self) -> PathBuf {
        self.vault_dir.join(DIR_ASSETS)
    }

    pub fn export_dir(&self) -> PathBuf {
        self.vault_dir.join(DIR_EXPORT)
    }

    pub fn trash_dir(&self) -> PathBuf {
        self.vault_dir.join(DIR_TRASH)
    }

    /// 某个文档的热日志文件。文件名用 doc_id（UUID），
    /// 不用标题 —— 标题可能含有 Windows 非法字符。
    pub fn live_file(&self, doc_id: &str) -> PathBuf {
        self.live_dir().join(format!("{doc_id}.live"))
    }

    /// 崩溃抢救文件。与热日志分开存放，
    /// 因为它是在 panic 过程中写的，必须绕开一切可能再次 panic 的逻辑。
    pub fn rescue_file(&self, doc_id: &str) -> PathBuf {
        self.live_dir().join(format!("{doc_id}.rescue"))
    }

    /// 首次运行时铺开目录结构
    pub fn ensure_all(&self) -> AppResult<()> {
        for dir in [
            &self.config_dir,
            &self.vault_dir,
            &self.live_dir(),
            &self.snapshot_dir(),
            &self.assets_dir(),
            &self.export_dir(),
            &self.trash_dir(),
        ] {
            std::fs::create_dir_all(dir).map_err(|e| {
                AppError::Io(format!("无法创建目录 {}：{e}", dir.display()))
            })?;
        }
        Ok(())
    }
}

/// 资料库的默认位置：`文档\文载`
///
/// 刻意用中文目录名 —— 一是符合中文用户直觉，
/// 二是让中文路径在开发期就成为默认路径，逼着我们尽早撞上编码问题，
/// 而不是等用户装到 `D:\我的小说\` 才发现。
pub fn default_vault_dir() -> PathBuf {
    dirs_document()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("文载")
}

fn dirs_document() -> Option<PathBuf> {
    // 不引入 dirs crate，直接读环境变量，少一个依赖。
    #[cfg(windows)]
    {
        std::env::var_os("USERPROFILE")
            .map(PathBuf::from)
            .map(|p| p.join("Documents"))
    }
    #[cfg(not(windows))]
    {
        std::env::var_os("HOME")
            .map(PathBuf::from)
            .map(|p| p.join("Documents"))
    }
}

/// 记录资料库位置的指针文件
///
/// 它必须待在配置目录、而不是资料库里 ——
/// 数据库本身就住在资料库中，不可能靠它来告诉程序资料库在哪。
const LOCATION_FILE: &str = "location.txt";

/// 读取用户设定的资料库位置。
///
/// 用纯文本单行存储，不用 JSON：这个文件的唯一使命是「在一切都还没初始化时
/// 告诉程序去哪找数据」。它越简单越好 —— 万一坏了，用户拿记事本就能修。
pub fn read_vault_location(config_dir: &Path) -> Option<PathBuf> {
    let raw = std::fs::read_to_string(config_dir.join(LOCATION_FILE)).ok()?;
    let line = raw.trim();
    if line.is_empty() {
        return None;
    }

    let p = PathBuf::from(line);
    // 指过去的地方可能已经被删了、或者是张拔掉的移动硬盘。
    // 这种情况下装作没设置过，回落到默认位置，总比启动失败强。
    if validate_path(&p).is_err() {
        log::warn!("资料库位置记录无效，回退到默认位置：{line}");
        return None;
    }
    Some(p)
}

pub fn write_vault_location(config_dir: &Path, vault: &Path) -> AppResult<()> {
    std::fs::create_dir_all(config_dir)?;
    std::fs::write(
        config_dir.join(LOCATION_FILE),
        vault.display().to_string().as_bytes(),
    )?;
    Ok(())
}

/// 校验路径能否安全地交给底层 C 库
///
/// 拦三类问题：
///   1. 非 UTF-8（理论上 Windows 下极罕见，但一旦发生 SQLite 会静默失败）
///   2. 路径过长（Windows MAX_PATH 260；虽然可长路径，但保守起见提前警告）
///   3. 尾随空格或点（Windows 会静默去掉，导致路径对不上）
pub fn validate_path(p: &Path) -> AppResult<()> {
    let s = p.to_str().ok_or_else(|| {
        AppError::InvalidPath(format!(
            "路径包含无法识别的字符，请改用纯中文或英文路径：{}",
            p.display()
        ))
    })?;

    if s.len() > 240 {
        return Err(AppError::InvalidPath(format!(
            "路径过长（{} 字节，上限 240）。请把资料库放到层级更浅的位置，例如 D:\\文载",
            s.len()
        )));
    }

    if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
        if name.ends_with(' ') || name.ends_with('.') {
            return Err(AppError::InvalidPath(
                "文件夹名不能以空格或英文句点结尾，Windows 会自动去掉它们，导致路径失效。".into(),
            ));
        }
    }

    Ok(())
}

/// 把用户输入的标题净化成合法文件名
///
/// 章节标题里出现 `?`、`:`、`/` 是家常便饭（「第三章：他去哪了？」），
/// 直接拿来当文件名必然失败。这里替换而非删除，保证可读性。
pub fn sanitize_filename(title: &str) -> String {
    const ILLEGAL: [char; 9] = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    // Windows 保留设备名，即使加扩展名也不能用
    const RESERVED: [&str; 22] = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7",
        "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];

    let mut out: String = title
        .chars()
        .map(|c| {
            if ILLEGAL.contains(&c) {
                '＿' // 用全角下划线替换，视觉上比直接删更诚实
            } else if (c as u32) < 0x20 {
                ' '
            } else {
                c
            }
        })
        .collect();

    out = out.trim().trim_end_matches('.').trim().to_string();

    if out.is_empty() {
        out = "未命名".to_string();
    }

    if RESERVED
        .iter()
        .any(|r| out.eq_ignore_ascii_case(r))
    {
        out.push('_');
    }

    // 单个文件名过长同样会失败，中文按字符截断而非字节，避免切碎多字节序列
    if out.chars().count() > 80 {
        out = out.chars().take(80).collect();
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn 中文路径应通过校验() {
        let p = PathBuf::from("D:\\我的小说\\第一卷");
        assert!(validate_path(&p).is_ok());
    }

    #[test]
    fn 尾随点应被拒绝() {
        let p = PathBuf::from("D:\\小说.");
        assert!(validate_path(&p).is_err());
    }

    #[test]
    fn 标题净化() {
        assert_eq!(sanitize_filename("第三章：他去哪了？"), "第三章＿他去哪了＿");
        assert_eq!(sanitize_filename("   "), "未命名");
        assert_eq!(sanitize_filename("CON"), "CON_");
        assert_eq!(sanitize_filename("正常标题"), "正常标题");
    }
}
