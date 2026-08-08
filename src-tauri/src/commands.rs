//! Tauri 命令层
//!
//! 这一层只做三件事：解锁、转发、包装返回值。
//! 任何业务判断都应该待在 `db` / `journal` / `state` 里，
//! 否则命令层会慢慢长成一坨没人敢改的东西。
//!
//! 命名约定：前端看到的是 snake_case 的命令名，
//! 返回体统一 camelCase（见各结构体的 `rename_all`）。

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};

use crate::db;
use crate::error::{AppError, AppResult};
use crate::journal::LiveRecord;
use crate::paths;
use crate::state::AppState;

// ─────────────────────────────────────────────
//  项目
// ─────────────────────────────────────────────

#[tauri::command]
pub fn list_projects(state: State<'_, AppState>, include_archived: bool) -> AppResult<Vec<db::Project>> {
    let conn = state.conn.lock();
    db::list_projects(&conn, include_archived)
}

#[tauri::command]
pub fn create_project(
    state: State<'_, AppState>,
    name: String,
    identity: String,
    description: String,
    color: String,
) -> AppResult<db::Project> {
    let conn = state.conn.lock();
    db::create_project(&conn, &name, &identity, &description, &color)
}

#[tauri::command]
pub fn rename_project(state: State<'_, AppState>, id: String, name: String) -> AppResult<()> {
    let conn = state.conn.lock();
    db::rename_project(&conn, &id, &name)
}

/// 删除项目。前端**必须**先弹二次确认 —— 这里不再拦。
#[tauri::command]
pub fn delete_project(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let conn = state.conn.lock();
    db::delete_project(&conn, &id)
}

// ─────────────────────────────────────────────
//  文档
// ─────────────────────────────────────────────

#[tauri::command]
pub fn list_docs(state: State<'_, AppState>, project_id: String) -> AppResult<Vec<db::DocNode>> {
    let conn = state.conn.lock();
    db::list_docs(&conn, &project_id)
}

#[tauri::command]
pub fn create_doc(
    state: State<'_, AppState>,
    project_id: String,
    parent_id: Option<String>,
    title: String,
    kind: String,
) -> AppResult<db::DocNode> {
    let conn = state.conn.lock();
    db::create_doc(&conn, &project_id, parent_id.as_deref(), &title, &kind)
}

#[tauri::command]
pub fn read_doc(state: State<'_, AppState>, doc_id: String) -> AppResult<String> {
    let conn = state.conn.lock();
    db::read_content(&conn, &doc_id)
}

/// 正式落库。
///
/// 与热日志不同，这是「用户认账」的保存点：
/// 落库成功后热日志即可撤下，因为数据库已经拿到了这份内容。
#[tauri::command]
pub fn save_doc(
    state: State<'_, AppState>,
    doc_id: String,
    content: String,
    plain_len: i64,
) -> AppResult<()> {
    {
        let mut conn = state.conn.lock();
        db::save_content(&mut conn, &doc_id, &content, plain_len)?;
    }
    // 落库成功才撤热日志。顺序反了就会出现「库没写成、日志先没了」的空档。
    state.release(&doc_id)
}

#[tauri::command]
pub fn rename_doc(state: State<'_, AppState>, doc_id: String, title: String) -> AppResult<()> {
    let conn = state.conn.lock();
    db::rename_doc(&conn, &doc_id, &title)
}

#[tauri::command]
pub fn delete_doc(state: State<'_, AppState>, doc_id: String) -> AppResult<()> {
    {
        let conn = state.conn.lock();
        db::delete_doc(&conn, &doc_id)?;
    }
    let _ = state.release(&doc_id);
    Ok(())
}

// ─────────────────────────────────────────────
//  三级缓冲：心跳 / 强制落盘
// ─────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeartbeatAck {
    /// 本次心跳是否真的写了磁盘
    pub flushed: bool,
    /// 服务端时间戳，前端用来显示「刚刚已保存」
    pub at: String,
}

/// 编辑器每 400ms 调一次。
///
/// 注意：这里**不写数据库**。数据库是慢路径，
/// 高频写 SQLite 会在长文里出现肉眼可见的卡顿。
#[tauri::command]
pub fn heartbeat(
    state: State<'_, AppState>,
    doc_id: String,
    project_id: String,
    title: String,
    content: String,
    cursor: usize,
) -> AppResult<HeartbeatAck> {
    let flushed = state.heartbeat(&doc_id, &project_id, &title, &content, cursor)?;
    Ok(HeartbeatAck {
        flushed,
        at: chrono::Local::now().to_rfc3339(),
    })
}

/// 紧急保存。老板键、窗口失焦、关机信号都走这里。
#[tauri::command]
pub fn flush_doc(state: State<'_, AppState>, doc_id: String) -> AppResult<bool> {
    state.flush(&doc_id)
}

#[tauri::command]
pub fn flush_all(state: State<'_, AppState>) -> AppResult<usize> {
    state.flush_all()
}

/// 紧急保存并落库 —— 用户按下 Ctrl+Alt+S 时的完整动作。
#[tauri::command]
pub fn panic_save(
    state: State<'_, AppState>,
    doc_id: String,
    content: String,
    plain_len: i64,
) -> AppResult<String> {
    state.flush(&doc_id)?;
    {
        let mut conn = state.conn.lock();
        db::save_content(&mut conn, &doc_id, &content, plain_len)?;
        db::commit_snapshot(&conn, &doc_id, &content, "panic")?;
    }
    Ok(chrono::Local::now().to_rfc3339())
}

// ─────────────────────────────────────────────
//  快照
// ─────────────────────────────────────────────

#[tauri::command]
pub fn commit_snapshot(
    state: State<'_, AppState>,
    doc_id: String,
    content: String,
    reason: String,
) -> AppResult<Option<String>> {
    let conn = state.conn.lock();
    db::commit_snapshot(&conn, &doc_id, &content, &reason)
}

#[tauri::command]
pub fn list_snapshots(state: State<'_, AppState>, doc_id: String) -> AppResult<Vec<db::Snapshot>> {
    let conn = state.conn.lock();
    db::list_snapshots(&conn, &doc_id)
}

#[tauri::command]
pub fn read_snapshot(state: State<'_, AppState>, snapshot_id: String) -> AppResult<String> {
    let conn = state.conn.lock();
    db::read_snapshot(&conn, &snapshot_id)
}

/// 回滚到某个历史版本。
///
/// 回滚前会先把「当前内容」存成一份快照 ——
/// 否则用户点错一次就再也回不来了，这种损失不可接受。
#[tauri::command]
pub fn restore_snapshot(
    state: State<'_, AppState>,
    doc_id: String,
    snapshot_id: String,
    current_content: String,
) -> AppResult<String> {
    let mut conn = state.conn.lock();
    let target = db::read_snapshot(&conn, &snapshot_id)?;
    db::commit_snapshot(&conn, &doc_id, &current_content, "before-restore")?;
    let len = target.chars().count() as i64;
    db::save_content(&mut conn, &doc_id, &target, len)?;
    Ok(target)
}

// ─────────────────────────────────────────────
//  崩溃恢复
// ─────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryItem {
    pub doc_id: String,
    pub project_id: String,
    pub title: String,
    pub saved_at: String,
    pub char_count: usize,
    pub cursor: usize,
    pub content: String,
    /// 数据库里那一份的字数，用于展示「热日志比库里多 N 字」
    pub db_char_count: Option<i64>,
    /// 库里已有相同内容，说明只是没来得及清日志，不必打扰用户
    pub identical: bool,
}

/// 启动时扫描未清理的热日志。
///
/// 判定逻辑刻意保守：只要热日志与数据库内容不一致，就报给用户。
/// 宁可多问一次，也不能悄悄丢字。
#[tauri::command]
pub fn scan_recovery(state: State<'_, AppState>) -> AppResult<Vec<RecoveryItem>> {
    let pending: Vec<LiveRecord> = state.journal.scan_pending()?;
    if pending.is_empty() {
        return Ok(vec![]);
    }

    let conn = state.conn.lock();
    let mut out = Vec::with_capacity(pending.len());

    for rec in pending {
        let db_content = db::read_content(&conn, &rec.header.doc_id).ok();
        let identical = db_content.as_deref() == Some(rec.content.as_str());
        let db_char_count = db_content.as_ref().map(|c| c.chars().count() as i64);

        out.push(RecoveryItem {
            doc_id: rec.header.doc_id,
            project_id: rec.header.project_id,
            title: rec.header.title,
            saved_at: rec.header.saved_at,
            char_count: rec.header.char_count,
            cursor: rec.header.cursor,
            content: rec.content,
            db_char_count,
            identical,
        });
    }

    // 内容一致的直接静默清掉，别拿它去烦用户
    out.retain(|item| {
        if item.identical {
            let _ = state.journal.clear(&item.doc_id);
            false
        } else {
            true
        }
    });

    Ok(out)
}

/// 采纳热日志里的内容，写回数据库。
#[tauri::command]
pub fn accept_recovery(state: State<'_, AppState>, doc_id: String) -> AppResult<String> {
    let rec = state
        .journal
        .read(&doc_id)?
        .ok_or_else(|| AppError::NotFound("这份恢复记录已经不在了。".into()))?;

    let len = rec.content.chars().count() as i64;
    {
        let mut conn = state.conn.lock();
        // 先把库里那一份存成快照，两个版本都留着，用户自己挑
        if let Ok(old) = db::read_content(&conn, &doc_id) {
            db::commit_snapshot(&conn, &doc_id, &old, "before-recovery")?;
        }
        db::save_content(&mut conn, &doc_id, &rec.content, len)?;
    }
    state.release(&doc_id)?;
    Ok(rec.content)
}

/// 放弃热日志。内容会先存成快照再清掉 —— 不做真删除。
#[tauri::command]
pub fn discard_recovery(state: State<'_, AppState>, doc_id: String) -> AppResult<()> {
    if let Ok(Some(rec)) = state.journal.read(&doc_id) {
        let conn = state.conn.lock();
        let _ = db::commit_snapshot(&conn, &doc_id, &rec.content, "discarded-recovery");
    }
    state.journal.clear(&doc_id)
}

// ─────────────────────────────────────────────
//  设置
// ─────────────────────────────────────────────

#[tauri::command]
pub fn get_setting(state: State<'_, AppState>, key: String) -> AppResult<Option<String>> {
    let conn = state.conn.lock();
    db::get_setting(&conn, &key)
}

#[tauri::command]
pub fn set_setting(state: State<'_, AppState>, key: String, value: String) -> AppResult<()> {
    let conn = state.conn.lock();
    db::set_setting(&conn, &key, &value)
}

#[derive(Debug, Deserialize)]
pub struct SettingPair {
    pub key: String,
    pub value: String,
}

#[tauri::command]
pub fn set_settings(state: State<'_, AppState>, pairs: Vec<SettingPair>) -> AppResult<()> {
    let conn = state.conn.lock();
    for p in pairs {
        db::set_setting(&conn, &p.key, &p.value)?;
    }
    Ok(())
}

// ─────────────────────────────────────────────
//  路径与环境
// ─────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub version: String,
    pub vault_dir: String,
    pub config_dir: String,
    pub db_file: String,
    pub live_dir: String,
    pub export_dir: String,
}

#[tauri::command]
pub fn app_info(app: AppHandle, state: State<'_, AppState>) -> AppInfo {
    AppInfo {
        version: app.package_info().version.to_string(),
        vault_dir: state.paths.vault_dir.display().to_string(),
        config_dir: state.paths.config_dir.display().to_string(),
        db_file: state.paths.db_file().display().to_string(),
        live_dir: state.paths.live_dir().display().to_string(),
        export_dir: state.paths.export_dir().display().to_string(),
    }
}

/// 校验用户挑的资料库目录能不能用。
///
/// 中文路径是**明确支持**的，这里只拦真正会出事的情况：
/// 超长、尾随空格/点、非 UTF-8。
#[tauri::command]
pub fn validate_vault_dir(dir: String) -> AppResult<String> {
    let p = std::path::PathBuf::from(&dir);
    paths::validate_path(&p)?;

    if p.exists() && !p.is_dir() {
        return Err(AppError::InvalidPath("这个位置已经有一个同名文件了。".into()));
    }

    // 真写一次，比任何权限检查都可靠
    std::fs::create_dir_all(&p)?;
    let probe = p.join(".wenzai-write-test");
    std::fs::write(&probe, b"ok")?;
    std::fs::remove_file(&probe)?;

    Ok(p.display().to_string())
}

/// 换资料库位置。
///
/// 只改指针、不搬数据 —— 搬迁是个危险动作，
/// 交给显式的「迁移」流程去做，这里绝不隐式移动用户的稿子。
/// 新位置在**下次启动**时生效，前端需要提示重启。
#[tauri::command]
pub fn set_vault_dir(state: State<'_, AppState>, dir: String) -> AppResult<String> {
    let verified = validate_vault_dir(dir)?;
    paths::write_vault_location(&state.paths.config_dir, std::path::Path::new(&verified))?;
    Ok(verified)
}

#[tauri::command]
pub fn suggest_filename(title: String) -> String {
    paths::sanitize_filename(&title)
}

/// 在资源管理器里定位文件/目录
#[tauri::command]
pub fn reveal_in_explorer(path: String) -> AppResult<()> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Err(AppError::NotFound("这个位置不存在了。".into()));
    }

    #[cfg(target_os = "windows")]
    {
        let arg = if p.is_dir() {
            p.display().to_string()
        } else {
            format!("/select,{}" , p.display())
        };
        std::process::Command::new("explorer")
            .arg(arg)
            .spawn()
            .map_err(|e| AppError::Other(format!("打不开资源管理器：{e}")))?;
    }

    Ok(())
}

// ─────────────────────────────────────────────
//  窗口 / 老板键
// ─────────────────────────────────────────────

/// 老板键的落地动作：先保证数据安全，再藏窗口。
///
/// 顺序不能反。藏窗口是给人看的，落盘是给数据看的。
#[tauri::command]
pub fn panic_hide(app: AppHandle, state: State<'_, AppState>) -> AppResult<()> {
    let _ = state.flush_all();
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.hide();
    }
    Ok(())
}

#[tauri::command]
pub fn restore_window(app: AppHandle) -> AppResult<()> {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
    Ok(())
}

// ─────────────────────────────────────────────
//  文件 IO（用于导入 / 导出）
// ─────────────────────────────────────────────

/// 读取用户授权路径下的文本文件。
#[tauri::command]
pub fn read_text_file(path: String) -> AppResult<String> {
    std::fs::read_to_string(&path).map_err(Into::into)
}

/// 写入文本文件。路径由前端通过 dialog 选择， Rust 侧只负责原子写。
#[tauri::command]
pub fn write_text_file(path: String, content: String) -> AppResult<()> {
    let p = std::path::Path::new(&path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent)?;
    }
    // 原子写：先写临时文件，再 rename
    let tmp = p.with_extension(format!(
        "{}.tmp",
        p.extension().and_then(|s| s.to_str()).unwrap_or("txt")
    ));
    std::fs::write(&tmp, content)?;
    std::fs::rename(&tmp, p)?;
    Ok(())
}

/// 写入二进制文件。
#[tauri::command]
pub fn write_binary_file(path: String, bytes: Vec<u8>) -> AppResult<()> {
    let p = std::path::Path::new(&path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let tmp = p.with_extension(format!(
        "{}.tmp",
        p.extension().and_then(|s| s.to_str()).unwrap_or("bin")
    ));
    std::fs::write(&tmp, bytes)?;
    std::fs::rename(&tmp, p)?;
    Ok(())
}
