//! 文载 Wenzai —— 应用装配层
//!
//! 这里只负责把各个部件接起来：路径 → 数据库 → 状态 → 窗口 → 快捷键。
//! 装配顺序有讲究，尤其是崩溃钩子必须在**一切之前**装好 ——
//! 初始化过程本身也可能 panic。

mod commands;
mod db;
mod error;
mod journal;
mod paths;
mod state;

use std::fs;
use std::time::Duration;

use tauri::{Emitter, Manager, WindowEvent};

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

use crate::paths::AppPaths;
use crate::state::AppState;

// ─────────────────────────────────────────────
//  崩溃抢救
// ─────────────────────────────────────────────

/// 进程要死之前，把内存里的稿子甩到磁盘上。
///
/// 这个函数运行在极端环境下 —— 可能已经有东西坏掉了。
/// 因此它：
///   · 不分配大块内存
///   · 不用 `?`，任何一步失败都继续尝试下一份文档
///   · 用 `try_lock` 而非 `lock`，绝不允许自己卡死
///
/// 抢救文件是纯文本，用记事本就能打开。
/// 到了这一步，格式好不好看已经无所谓了，能读到字才是唯一目标。
fn rescue_all_documents() {
    let Some(dir) = state::rescue_dir() else {
        return;
    };
    let Some(guard) = state::mirror().try_lock() else {
        // 锁被同线程持有 —— 正是它 panic 的。硬抢会死锁，只能放弃。
        return;
    };

    let _ = fs::create_dir_all(dir);
    let stamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    for (doc_id, m) in guard.iter() {
        if m.content.is_empty() {
            continue;
        }
        let path = dir.join(format!("{doc_id}.rescue.txt"));
        let body = format!(
            "【文载·紧急抢救稿】\r\n\
             标题：{}\r\n\
             时间：{}\r\n\
             字数：{}\r\n\
             说明：程序意外退出，以下是内存中最后的内容。重新打开文载即可自动恢复。\r\n\
             ────────────────────────────\r\n\
             {}",
            m.title,
            stamp,
            m.content.chars().count(),
            m.content
        );
        let _ = fs::write(&path, body);
    }
}

fn install_panic_hook() {
    let previous = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        rescue_all_documents();
        previous(info);
    }));
}

// ─────────────────────────────────────────────
//  入口
// ─────────────────────────────────────────────

pub fn run() {
    // 第一件事，先于任何可能失败的初始化
    install_panic_hook();

    let mut builder = tauri::Builder::default();

    // single-instance 必须最先注册，官方文档明确要求
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // 第二次启动时唤回已有窗口，而不是开第二个实例。
            // 两个实例同时写一个 SQLite 文件是灾难。
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }));
    }

    builder = builder
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .max_file_size(2 * 1024 * 1024)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build());

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec!["--silent"]),
            ))
            .plugin(build_shortcut_plugin());
    }

    builder
        .setup(|app| {
            let handle = app.handle().clone();

            // ── 路径 ──────────────────────────────
            let config_dir = handle
                .path()
                .app_config_dir()
                .unwrap_or_else(|_| std::env::temp_dir().join("wenzai"));

            // 资料库位置存在配置目录下的独立小文件里，而非数据库中 ——
            // 数据库本身就在资料库里，不能自己指向自己。
            let vault_dir = paths::read_vault_location(&config_dir)
                .unwrap_or_else(paths::default_vault_dir);

            let app_paths = AppPaths::new(config_dir, vault_dir)?;
            let vault_display = app_paths.vault_dir.display().to_string();

            // ── 状态 ──────────────────────────────
            let st = AppState::new(app_paths)?;
            app.manage(st);
            log::info!("资料库：{vault_display}");

            // ── 全局快捷键 ────────────────────────
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            register_shortcuts(&handle);

            // ── 窗口 ──────────────────────────────
            if let Some(win) = app.get_webview_window("main") {
                let h = handle.clone();
                win.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { .. } = event {
                        // 关窗前最后一次落盘。这里同步执行，
                        // 宁可让关闭慢 50 毫秒，也不能丢最后一句话。
                        if let Some(s) = h.try_state::<AppState>() {
                            let _ = s.flush_all();
                        }
                    }
                });

                // 兜底：窗口初始为隐藏，正常由前端在首屏就绪后唤出。
                // 万一前端脚本挂了，2.5 秒后强制显示 ——
                // 让用户看到一个坏掉的界面，也好过对着任务栏里的幽灵进程发呆。
                let w = win.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_millis(2500));
                    if !w.is_visible().unwrap_or(true) {
                        log::warn!("前端未在 2.5 秒内就绪，强制显示窗口");
                        let _ = w.show();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 项目
            commands::list_projects,
            commands::create_project,
            commands::rename_project,
            commands::update_project,
            commands::set_project_archived,
            commands::reorder_projects,
            commands::delete_project,
            // 文档
            commands::list_docs,
            commands::create_doc,
            commands::read_doc,
            commands::save_doc,
            commands::rename_doc,
            commands::delete_doc,
            commands::reorder_docs,
            commands::read_project_contents,
            // 缓冲
            commands::heartbeat,
            commands::flush_doc,
            commands::flush_all,
            commands::panic_save,
            // 快照
            commands::commit_snapshot,
            commands::list_snapshots,
            commands::read_snapshot,
            commands::restore_snapshot,
            // 恢复
            commands::scan_recovery,
            commands::accept_recovery,
            commands::discard_recovery,
            // 设置
            commands::get_setting,
            commands::set_setting,
            commands::set_settings,
            // 环境
            commands::app_info,
            commands::validate_vault_dir,
            commands::set_vault_dir,
            commands::suggest_filename,
            commands::reveal_in_explorer,
            // 窗口
            commands::panic_hide,
            commands::restore_window,
            // 文件 IO
            commands::read_text_file,
            commands::write_text_file,
            commands::write_binary_file,
            // 错词库 / 白名单
            commands::list_lexicon,
            commands::add_lexicon,
            commands::set_lexicon_enabled,
            commands::remove_lexicon,
            commands::import_lexicon,
            commands::get_lexicon_map,
            commands::add_whitelist,
            commands::remove_whitelist,
            commands::list_whitelist,
        ])
        .run(tauri::generate_context!())
        .expect("文载启动失败");
}

// ─────────────────────────────────────────────
//  快捷键
// ─────────────────────────────────────────────

/// 老板键：Ctrl + Shift + H（Hide）
///
/// 选它是因为三键组合几乎不会误触，而且 H 好记。
/// 用户可以在设置里改 —— 但默认值必须一按就灵。
#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn boss_key() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL.union(Modifiers::SHIFT)), Code::KeyH)
}

/// 紧急保存：Ctrl + Alt + S
#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn panic_save_key() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL.union(Modifiers::ALT)), Code::KeyS)
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn build_shortcut_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let boss = boss_key();
    let panic = panic_save_key();

    tauri_plugin_global_shortcut::Builder::new()
        .with_handler(move |app, shortcut, event| {
            // 只认按下，不认抬起 —— 否则一次按键会触发两回
            if event.state() != ShortcutState::Pressed {
                return;
            }

            if shortcut == &boss {
                handle_boss_key(app);
            } else if shortcut == &panic {
                if let Some(s) = app.try_state::<AppState>() {
                    let n = s.flush_all().unwrap_or(0);
                    log::info!("紧急保存：{n} 份");
                }
                let _ = app.emit("wenzai://panic-save", ());
            }
        })
        .build()
}

/// 老板键的实际动作。
///
/// 顺序：**先落盘，再藏窗口**。
/// 用户按下它的时候通常心跳很快，此刻丢字是最不可原谅的。
#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn handle_boss_key(app: &tauri::AppHandle) {
    if let Some(s) = app.try_state::<AppState>() {
        let _ = s.flush_all();
    }

    let Some(win) = app.get_webview_window("main") else {
        return;
    };

    match win.is_visible() {
        Ok(true) => {
            let _ = win.hide();
            log::info!("已隐藏");
        }
        _ => {
            let _ = win.show();
            let _ = win.unminimize();
            let _ = win.set_focus();
            // 通知前端：可能需要重新校验解锁口令
            let _ = app.emit("wenzai://restored", ());
        }
    }
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn register_shortcuts(handle: &tauri::AppHandle) {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    let gs = handle.global_shortcut();
    // 快捷键可能被别的程序抢占。抢不到不是致命错误，
    // 记一笔日志、让前端在设置里提示用户换一个就行。
    if let Err(e) = gs.register(boss_key()) {
        log::warn!("老板键注册失败（可能被其他程序占用）：{e}");
    }
    if let Err(e) = gs.register(panic_save_key()) {
        log::warn!("紧急保存热键注册失败：{e}");
    }
}
