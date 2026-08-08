//! SQLite 存储层
//!
//! ## 关键配置
//! - `journal_mode = WAL`：写不阻塞读，且进程被强杀后能自动回滚到一致状态
//! - `synchronous = NORMAL`：WAL 下这一档已能抵御**进程崩溃**；
//!   抵御**断电**的责任交给热日志（见 journal.rs），不必让每次提交都 fsync
//! - `foreign_keys = ON`：SQLite 默认是关的，删项目时不级联会留下孤儿章节
//!
//! ## 迁移
//! 用 `PRAGMA user_version` 记录版本号，每次启动顺序补齐。
//! 不引入迁移框架 —— 一个单机应用的表结构，值不上那个复杂度。

use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

/// 当前 schema 版本。加表 / 改字段时 +1，并在 `migrate` 里补一段。
const SCHEMA_VERSION: i64 = 1;

// ─────────────────────────────────────────────
//  数据模型
// ─────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    /// 对应 wendao-lineage.ts 里的 IdentityId
    pub identity: String,
    pub description: String,
    /// 色标，取自元素色板
    pub color: String,
    pub created_at: String,
    pub updated_at: String,
    pub sort_order: i64,
    pub archived: bool,
    /// 统计字段，由查询时聚合得出，不落表
    #[serde(default)]
    pub doc_count: i64,
    #[serde(default)]
    pub char_count: i64,
}

/// 文档节点。用邻接表（parent_id）表达章节树，
/// 卷 / 章 / 随笔都是同一张表，靠 kind 区分。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocNode {
    pub id: String,
    pub project_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    /// folder | chapter | note
    pub kind: String,
    pub sort_order: i64,
    pub char_count: i64,
    /// draft | revising | done
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snapshot {
    pub id: String,
    pub doc_id: String,
    pub char_count: i64,
    /// auto | manual | recovery | pre_ai
    pub reason: String,
    pub created_at: String,
    /// 列表查询时不带正文，避免一次拉出几十兆
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
}

// ─────────────────────────────────────────────
//  连接与迁移
// ─────────────────────────────────────────────

pub fn open(db_path: &Path) -> AppResult<Connection> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let conn = Connection::open(db_path)?;

    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    // 64MB 页缓存。写作类文档不大，但全文检索时能省不少 IO。
    conn.pragma_update(None, "cache_size", -64000)?;
    conn.pragma_update(None, "busy_timeout", 5000)?;

    migrate(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> AppResult<()> {
    let current: i64 = conn.pragma_query_value(None, "user_version", |r| r.get(0))?;

    if current >= SCHEMA_VERSION {
        return Ok(());
    }

    log::info!("数据库迁移：v{current} → v{SCHEMA_VERSION}");

    if current < 1 {
        conn.execute_batch(SCHEMA_V1)?;
    }

    conn.pragma_update(None, "user_version", SCHEMA_VERSION)?;
    Ok(())
}

const SCHEMA_V1: &str = r#"
BEGIN;

CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    identity    TEXT NOT NULL DEFAULT 'general',
    description TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL DEFAULT '#E3B872',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    archived    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS documents (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id   TEXT REFERENCES documents(id) ON DELETE CASCADE,
    title       TEXT NOT NULL DEFAULT '未命名',
    kind        TEXT NOT NULL DEFAULT 'chapter',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    char_count  INTEGER NOT NULL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT 'draft',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_doc_project ON documents(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_doc_parent  ON documents(parent_id, sort_order);

-- 正文单独一张表：列章节树时不必把几十万字一起读出来
CREATE TABLE IF NOT EXISTS doc_contents (
    doc_id     TEXT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
    content    TEXT NOT NULL DEFAULT '',
    format     TEXT NOT NULL DEFAULT 'html',
    sha256     TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
);

-- 版本快照。写作者最怕的不只是丢稿，还有「改坏了想改回去」
CREATE TABLE IF NOT EXISTS snapshots (
    id         TEXT PRIMARY KEY,
    doc_id     TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    char_count INTEGER NOT NULL DEFAULT 0,
    reason     TEXT NOT NULL DEFAULT 'auto',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snap_doc ON snapshots(doc_id, created_at DESC);

-- AI 校对结果。留着是为了导出「原文 / 改文 / 变动」对照表
CREATE TABLE IF NOT EXISTS corrections (
    id         TEXT PRIMARY KEY,
    doc_id     TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    run_id     TEXT NOT NULL,
    category   TEXT NOT NULL,
    original   TEXT NOT NULL,
    revised    TEXT NOT NULL,
    reason     TEXT NOT NULL DEFAULT '',
    pos_from   INTEGER NOT NULL DEFAULT 0,
    pos_to     INTEGER NOT NULL DEFAULT 0,
    accepted   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_corr_run ON corrections(run_id);
CREATE INDEX IF NOT EXISTS idx_corr_doc ON corrections(doc_id, created_at DESC);

-- 用户自定义错词库
CREATE TABLE IF NOT EXISTS lexicon (
    id       TEXT PRIMARY KEY,
    wrong    TEXT NOT NULL,
    right    TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'custom',
    note     TEXT NOT NULL DEFAULT '',
    enabled  INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lex_wrong ON lexicon(wrong);

-- 专有名词白名单：人名、地名、功法名，AI 一律不许改
CREATE TABLE IF NOT EXISTS whitelist (
    id         TEXT PRIMARY KEY,
    term       TEXT NOT NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    note       TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wl_term ON whitelist(term, project_id);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

COMMIT;
"#;

// ─────────────────────────────────────────────
//  项目
// ─────────────────────────────────────────────

pub fn list_projects(conn: &Connection, include_archived: bool) -> AppResult<Vec<Project>> {
    let sql = format!(
        "SELECT p.id, p.name, p.identity, p.description, p.color,
                p.created_at, p.updated_at, p.sort_order, p.archived,
                (SELECT COUNT(*) FROM documents d WHERE d.project_id = p.id AND d.kind != 'folder'),
                (SELECT COALESCE(SUM(d.char_count), 0) FROM documents d WHERE d.project_id = p.id)
         FROM projects p
         {}
         ORDER BY p.sort_order ASC, p.updated_at DESC",
        if include_archived { "" } else { "WHERE p.archived = 0" }
    );

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], |r| {
        Ok(Project {
            id: r.get(0)?,
            name: r.get(1)?,
            identity: r.get(2)?,
            description: r.get(3)?,
            color: r.get(4)?,
            created_at: r.get(5)?,
            updated_at: r.get(6)?,
            sort_order: r.get(7)?,
            archived: r.get::<_, i64>(8)? != 0,
            doc_count: r.get(9)?,
            char_count: r.get(10)?,
        })
    })?;

    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn create_project(
    conn: &Connection,
    name: &str,
    identity: &str,
    description: &str,
    color: &str,
) -> AppResult<Project> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Other("项目名不能为空。".into()));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = now_rfc3339();
    let next_order: i64 = conn
        .query_row("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM projects", [], |r| r.get(0))
        .unwrap_or(0);

    conn.execute(
        "INSERT INTO projects (id, name, identity, description, color, created_at, updated_at, sort_order, archived)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?7, 0)",
        params![id, name, identity, description, color, now, next_order],
    )?;

    Ok(Project {
        id,
        name: name.to_string(),
        identity: identity.to_string(),
        description: description.to_string(),
        color: color.to_string(),
        created_at: now.clone(),
        updated_at: now,
        sort_order: next_order,
        archived: false,
        doc_count: 0,
        char_count: 0,
    })
}

pub fn rename_project(conn: &Connection, id: &str, name: &str) -> AppResult<()> {
    let n = conn.execute(
        "UPDATE projects SET name = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, name.trim(), now_rfc3339()],
    )?;
    if n == 0 {
        return Err(AppError::NotFound("该项目已不存在。".into()));
    }
    Ok(())
}

/// 删除项目。级联删除章节与正文 —— 因此调用方**必须**先做确认。
pub fn delete_project(conn: &Connection, id: &str) -> AppResult<()> {
    conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
    Ok(())
}

// ─────────────────────────────────────────────
//  文档
// ─────────────────────────────────────────────

pub fn list_docs(conn: &Connection, project_id: &str) -> AppResult<Vec<DocNode>> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, parent_id, title, kind, sort_order,
                char_count, status, created_at, updated_at
         FROM documents WHERE project_id = ?1
         ORDER BY sort_order ASC, created_at ASC",
    )?;
    let rows = stmt.query_map([project_id], |r| {
        Ok(DocNode {
            id: r.get(0)?,
            project_id: r.get(1)?,
            parent_id: r.get(2)?,
            title: r.get(3)?,
            kind: r.get(4)?,
            sort_order: r.get(5)?,
            char_count: r.get(6)?,
            status: r.get(7)?,
            created_at: r.get(8)?,
            updated_at: r.get(9)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn create_doc(
    conn: &Connection,
    project_id: &str,
    parent_id: Option<&str>,
    title: &str,
    kind: &str,
) -> AppResult<DocNode> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = now_rfc3339();

    let next_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM documents
             WHERE project_id = ?1 AND parent_id IS ?2",
            params![project_id, parent_id],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let title = if title.trim().is_empty() { "未命名" } else { title.trim() };

    conn.execute(
        "INSERT INTO documents (id, project_id, parent_id, title, kind, sort_order, char_count, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 'draft', ?7, ?7)",
        params![id, project_id, parent_id, title, kind, next_order, now],
    )?;

    conn.execute(
        "INSERT INTO doc_contents (doc_id, content, format, sha256, updated_at)
         VALUES (?1, '', 'html', '', ?2)",
        params![id, now],
    )?;

    conn.execute(
        "UPDATE projects SET updated_at = ?2 WHERE id = ?1",
        params![project_id, now],
    )?;

    Ok(DocNode {
        id,
        project_id: project_id.to_string(),
        parent_id: parent_id.map(str::to_string),
        title: title.to_string(),
        kind: kind.to_string(),
        sort_order: next_order,
        char_count: 0,
        status: "draft".into(),
        created_at: now.clone(),
        updated_at: now,
    })
}

pub fn read_content(conn: &Connection, doc_id: &str) -> AppResult<String> {
    conn.query_row(
        "SELECT content FROM doc_contents WHERE doc_id = ?1",
        params![doc_id],
        |r| r.get(0),
    )
    .optional()?
    .ok_or_else(|| AppError::NotFound("找不到这份稿件的正文。".into()))
}

/// 保存正文。同时更新字数与项目时间戳，一次事务完成。
pub fn save_content(
    conn: &mut Connection,
    doc_id: &str,
    content: &str,
    char_count: i64,
) -> AppResult<()> {
    let now = now_rfc3339();
    let sha = crate::journal::sha256_hex(content);
    let tx = conn.transaction()?;

    tx.execute(
        "UPDATE doc_contents SET content = ?2, sha256 = ?3, updated_at = ?4 WHERE doc_id = ?1",
        params![doc_id, content, sha, now],
    )?;
    tx.execute(
        "UPDATE documents SET char_count = ?2, updated_at = ?3 WHERE id = ?1",
        params![doc_id, char_count, now],
    )?;
    tx.execute(
        "UPDATE projects SET updated_at = ?2
         WHERE id = (SELECT project_id FROM documents WHERE id = ?1)",
        params![doc_id, now],
    )?;

    tx.commit()?;
    Ok(())
}

pub fn rename_doc(conn: &Connection, doc_id: &str, title: &str) -> AppResult<()> {
    let t = title.trim();
    let t = if t.is_empty() { "未命名" } else { t };
    conn.execute(
        "UPDATE documents SET title = ?2, updated_at = ?3 WHERE id = ?1",
        params![doc_id, t, now_rfc3339()],
    )?;
    Ok(())
}

pub fn delete_doc(conn: &Connection, doc_id: &str) -> AppResult<()> {
    conn.execute("DELETE FROM documents WHERE id = ?1", params![doc_id])?;
    Ok(())
}

// ─────────────────────────────────────────────
//  快照
// ─────────────────────────────────────────────

/// 提交一份版本快照。
///
/// 会先比对最近一次快照的字数：完全一样就跳过，
/// 免得三十秒一条把历史刷成一片无意义的重复。
pub fn commit_snapshot(
    conn: &Connection,
    doc_id: &str,
    content: &str,
    reason: &str,
) -> AppResult<Option<String>> {
    let char_count = content.chars().count() as i64;

    let last: Option<(String, i64)> = conn
        .query_row(
            "SELECT content, char_count FROM snapshots
             WHERE doc_id = ?1 ORDER BY created_at DESC LIMIT 1",
            params![doc_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;

    if let Some((prev, prev_len)) = last {
        if prev_len == char_count && prev == content {
            return Ok(None);
        }
    }

    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO snapshots (id, doc_id, content, char_count, reason, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, doc_id, content, char_count, reason, now_rfc3339()],
    )?;

    prune_snapshots(conn, doc_id)?;
    Ok(Some(id))
}

/// 快照保留策略
///
/// 手动快照与 AI 改写前快照**永不自动删除** —— 那是用户主动留的锚点。
/// 自动快照只保留最近 100 条，防止长篇小说把库撑到几个 G。
fn prune_snapshots(conn: &Connection, doc_id: &str) -> AppResult<()> {
    conn.execute(
        "DELETE FROM snapshots
         WHERE doc_id = ?1 AND reason = 'auto' AND id NOT IN (
             SELECT id FROM snapshots
             WHERE doc_id = ?1 AND reason = 'auto'
             ORDER BY created_at DESC LIMIT 100
         )",
        params![doc_id],
    )?;
    Ok(())
}

pub fn list_snapshots(conn: &Connection, doc_id: &str) -> AppResult<Vec<Snapshot>> {
    let mut stmt = conn.prepare(
        "SELECT id, doc_id, char_count, reason, created_at FROM snapshots
         WHERE doc_id = ?1 ORDER BY created_at DESC LIMIT 200",
    )?;
    let rows = stmt.query_map([doc_id], |r| {
        Ok(Snapshot {
            id: r.get(0)?,
            doc_id: r.get(1)?,
            char_count: r.get(2)?,
            reason: r.get(3)?,
            created_at: r.get(4)?,
            content: None,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn read_snapshot(conn: &Connection, snapshot_id: &str) -> AppResult<String> {
    conn.query_row(
        "SELECT content FROM snapshots WHERE id = ?1",
        params![snapshot_id],
        |r| r.get(0),
    )
    .optional()?
    .ok_or_else(|| AppError::NotFound("这个历史版本已被清理。".into()))
}

// ─────────────────────────────────────────────
//  设置
// ─────────────────────────────────────────────

pub fn get_setting(conn: &Connection, key: &str) -> AppResult<Option<String>> {
    conn.query_row("SELECT value FROM settings WHERE key = ?1", params![key], |r| r.get(0))
        .optional()
        .map_err(Into::into)
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> AppResult<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

// ─────────────────────────────────────────────
//  错词库 / 白名单
// ─────────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LexiconEntry {
    pub id: String,
    pub wrong: String,
    pub right: String,
    pub category: String,
    pub note: String,
    pub enabled: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LexiconInput {
    pub wrong: String,
    pub right: String,
    pub category: Option<String>,
    pub note: Option<String>,
}

pub fn list_lexicon(conn: &Connection, enabled_only: bool) -> AppResult<Vec<LexiconEntry>> {
    let sql = if enabled_only {
        "SELECT id, wrong, right, category, note, enabled FROM lexicon WHERE enabled = 1 ORDER BY wrong"
    } else {
        "SELECT id, wrong, right, category, note, enabled FROM lexicon ORDER BY wrong"
    };
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([], |r| {
        Ok(LexiconEntry {
            id: r.get(0)?,
            wrong: r.get(1)?,
            right: r.get(2)?,
            category: r.get(3)?,
            note: r.get(4)?,
            enabled: r.get::<_, i64>(5)? != 0,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn add_lexicon(
    conn: &Connection,
    wrong: &str,
    right: &str,
    category: &str,
    note: &str,
) -> AppResult<()> {
    let wrong = wrong.trim();
    let right = right.trim();
    if wrong.is_empty() {
        return Err(AppError::Invalid("错词不能为空".into()));
    }
    conn.execute(
        "INSERT INTO lexicon (id, wrong, right, category, note, enabled)
         VALUES (?1, ?2, ?3, ?4, ?5, 1)
         ON CONFLICT(wrong) DO UPDATE SET right = excluded.right, category = excluded.category, note = excluded.note, enabled = 1",
        params![uuid::Uuid::new_v4().to_string(), wrong, right, category, note],
    )?;
    Ok(())
}

pub fn set_lexicon_enabled(conn: &Connection, id: &str, enabled: bool) -> AppResult<()> {
    conn.execute(
        "UPDATE lexicon SET enabled = ?1 WHERE id = ?2",
        params![if enabled { 1 } else { 0 }, id],
    )?;
    Ok(())
}

pub fn remove_lexicon(conn: &Connection, id: &str) -> AppResult<()> {
    conn.execute("DELETE FROM lexicon WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn import_lexicon(conn: &Connection, entries: &[LexiconInput]) -> AppResult<usize> {
    let mut count = 0;
    for e in entries {
        let wrong = e.wrong.trim();
        if wrong.is_empty() {
            continue;
        }
        add_lexicon(
            conn,
            wrong,
            &e.right,
            e.category.as_deref().unwrap_or("imported"),
            e.note.as_deref().unwrap_or(""),
        )?;
        count += 1;
    }
    Ok(count)
}

/// 供编辑器实时标红：返回所有启用的 (错词, 正确词) 对。
pub fn lexicon_map(conn: &Connection) -> AppResult<Vec<(String, String)>> {
    let mut stmt = conn.prepare("SELECT wrong, right FROM lexicon WHERE enabled = 1")?;
    let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WhitelistEntry {
    pub id: String,
    pub term: String,
    pub project_id: Option<String>,
    pub note: String,
}

pub fn add_whitelist(
    conn: &Connection,
    term: &str,
    project_id: Option<&str>,
    note: &str,
) -> AppResult<()> {
    let term = term.trim();
    if term.is_empty() {
        return Err(AppError::Invalid("专有名词不能为空".into()));
    }
    conn.execute(
        "INSERT INTO whitelist (id, term, project_id, note) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(term, project_id) DO UPDATE SET note = excluded.note",
        params![uuid::Uuid::new_v4().to_string(), term, project_id, note],
    )?;
    Ok(())
}

pub fn remove_whitelist(conn: &Connection, id: &str) -> AppResult<()> {
    conn.execute("DELETE FROM whitelist WHERE id = ?1", params![id])?;
    Ok(())
}

/// 列出白名单。编辑器实时标红时会排除这些专有名词。
pub fn list_whitelist(conn: &Connection) -> AppResult<Vec<WhitelistEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, term, project_id, note FROM whitelist ORDER BY term",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(WhitelistEntry {
            id: r.get(0)?,
            term: r.get(1)?,
            project_id: r.get(2)?,
            note: r.get(3)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

fn now_rfc3339() -> String {
    chrono::Local::now().to_rfc3339()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mem() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();
        conn.execute_batch(SCHEMA_V1).unwrap();
        conn
    }

    #[test]
    fn 创建项目与章节() {
        let mut conn = mem();
        let p = create_project(&conn, "山海journal", "webnovel", "测试", "#E3B872").unwrap();
        let d = create_doc(&conn, &p.id, None, "第一章 雨夜", "chapter").unwrap();

        save_content(&mut conn, &d.id, "<p>他站在雨里。</p>", 6).unwrap();
        assert_eq!(read_content(&conn, &d.id).unwrap(), "<p>他站在雨里。</p>");

        let list = list_projects(&conn, false).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].doc_count, 1);
        assert_eq!(list[0].char_count, 6);
    }

    #[test]
    fn 空项目名应被拒绝() {
        let conn = mem();
        assert!(create_project(&conn, "   ", "general", "", "#000").is_err());
    }

    #[test]
    fn 相同内容不应重复生成快照() {
        let conn = mem();
        let p = create_project(&conn, "测试", "general", "", "#000").unwrap();
        let d = create_doc(&conn, &p.id, None, "章", "chapter").unwrap();

        assert!(commit_snapshot(&conn, &d.id, "内容", "auto").unwrap().is_some());
        assert!(commit_snapshot(&conn, &d.id, "内容", "auto").unwrap().is_none());
        assert!(commit_snapshot(&conn, &d.id, "内容变了", "auto").unwrap().is_some());
        assert_eq!(list_snapshots(&conn, &d.id).unwrap().len(), 2);
    }

    #[test]
    fn 删除项目应级联删除章节() {
        let conn = mem();
        let p = create_project(&conn, "测试", "general", "", "#000").unwrap();
        create_doc(&conn, &p.id, None, "章", "chapter").unwrap();

        delete_project(&conn, &p.id).unwrap();
        assert_eq!(list_docs(&conn, &p.id).unwrap().len(), 0);
    }
}
