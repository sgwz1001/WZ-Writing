//! 统一错误类型
//!
//! 原则：**错误信息面向用户，不面向开发者。**
//! 前端会把 message 直接弹给写作者看，所以这里的每一句话
//! 都要让一个不懂技术的人知道下一步该干什么。
//! 技术细节走 log，不进 message。

use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Io(String),

    #[error("{0}")]
    InvalidPath(String),

    #[error("数据库出错：{0}")]
    Db(String),

    #[error("找不到内容：{0}")]
    NotFound(String),

    #[error("{0}")]
    Conflict(String),

    #[error("{0}")]
    Other(String),
}

pub type AppResult<T> = Result<T, AppError>;

/// Tauri 的 command 返回值必须可序列化。
/// 这里输出结构化错误，前端能按 kind 分支处理（比如冲突时弹版本对比框）。
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut s = serializer.serialize_struct("AppError", 2)?;
        s.serialize_field("kind", self.kind())?;
        s.serialize_field("message", &self.to_string())?;
        s.end()
    }
}

impl AppError {
    pub fn kind(&self) -> &'static str {
        match self {
            AppError::Io(_) => "io",
            AppError::InvalidPath(_) => "invalid_path",
            AppError::Db(_) => "db",
            AppError::NotFound(_) => "not_found",
            AppError::Conflict(_) => "conflict",
            AppError::Other(_) => "other",
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        // 把常见的 io 错误翻译成人话
        let msg = match e.kind() {
            std::io::ErrorKind::NotFound => "文件或文件夹不存在，可能已被移动或删除。".to_string(),
            std::io::ErrorKind::PermissionDenied => {
                "没有权限访问该位置。如果保存位置在 C 盘的受保护目录，请换到其他文件夹，或以管理员身份运行。"
                    .to_string()
            }
            std::io::ErrorKind::AlreadyExists => "目标已存在。".to_string(),
            _ => format!("读写文件时出错：{e}"),
        };
        AppError::Io(msg)
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        log::error!("sqlite: {e:?}");
        match e {
            rusqlite::Error::QueryReturnedNoRows => {
                AppError::NotFound("没有查到对应的记录。".into())
            }
            _ => AppError::Db(
                "本地数据库读写失败。你的稿件仍保留在热日志中，不会丢失；请尝试重启程序。".into(),
            ),
        }
    }
}

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        log::error!("anyhow: {e:?}");
        AppError::Other(e.to_string())
    }
}
