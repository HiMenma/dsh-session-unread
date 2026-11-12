# dsh-session-unread

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）Web 客户端加**会话未读标记**：在任意会话行上「标记为未读」，侧栏该行右侧出现一个未读圆点，等你再次打开这个会话时自动清除。

一个 DSH 客户端插件包（bundle），纯 JavaScript，无构建步骤。

## 功能

- **会话行菜单开关**：会话行「…」菜单里新增一项，未读时显示「标记为已读」，已读时显示「标记为未读」。
- **侧栏未读圆点**：圆点排在行尾时间标签之后，颜色跟随主题品牌色（`--dsw-alias-brand-primary`），不额外占位。
- **打开即清除**：会话进入主视图的那一次状态跳变清除标记；标记当前正在阅读的会话不会被立刻擦掉，直到你切走再切回。
- **中英双语**：文案走 DSH 的 locale 服务，跟随界面语言。
- **零宿主状态**：标记只存在浏览器 `localStorage`（`dsh.session-unread.v1` ），不上报 Host、不写会话日志、不改会话 JSONL。

## 安装

本包是一个 DSH bundle（`dsh.bundle.patch` + `dsh.client`），用 DSH 自带的插件管理器安装，不要手工改 profile：

```jsonc
// 通过 Agent 的 plugin_manager 工具
{ "action": "install_bundle", "target": "/绝对路径/dsh-session-unread" }
```

也可以先克隆再安装：

```sh
git clone https://github.com/HiMenma/dsh-session-unread.git
```

安装后无需重启：客户端 bundle 通过 HMR 进入已打开的页面。改动本包的 `client.js` 会触发热重载；如需强制换一代模块，把插件 disable 再 enable 即可。

## 使用

1. 左侧栏任意会话行上点「…」（或右键）→ **标记为未读**；
2. 该行尾部出现未读圆点，和真实的新消息提示一样醒目；
3. 点开这个会话，圆点在进入主视图时消失；想撤销标记就再点一次菜单里的「标记为已读」。

## 实现要点

| 位置 | 用途 |
|---|---|
| `sidebar.workspaces.session.menu.item`（order 7） | 会话行菜单项：切换已读/未读，带实心/空心圆图标 |
| `sidebar.session.row.trailing`（order 5） | 行尾未读圆点，`role="img"` + `aria-label` |
| `ctx.locale.register('dsh-session-unread')` | 中英文案（`locale/zh.json`、`locale/en.json`） |
| `window.localStorage` key `dsh.session-unread.v1` | 标记集合，与侧栏自身视图偏好的存储同级 |

状态更新用 `React.useSyncExternalStore` 按会话 id 订阅，只有被标记的那一行会重渲染，其它行不受影响。菜单行优先用 `@deepseek-ai/dsh-client-ui-primitives` 的 `MenuItemButton`（带分隔线），该原语不可用时退化为普通的 `role="menuitem"` 按钮。

## 已知限制

- **只在当前浏览器生效**：换浏览器、换设备、清站点数据都会丢标记；DSH 没有暴露会话级的本地标记 API，所以不做跨端同步。
- **不复用 Host 的未读语义**：这是纯客户端视觉标记，不参与 Inbox、通知或会话排序。
- **删除会话不清理标记**：会话删掉后 `localStorage` 里可能残留一条无效 id（无害，只会占一个键；`localStorage` 满或被手动清理时自然消失）。
- 依赖 DSH 公开的 Slot 与 Client 服务；在 DSH Desktop `desktop` profile 上开发与验证，未做跨大版本兼容保证。

## License

MIT © 2026 Yang

---

## English summary

A DSH Web client bundle that adds **Mark as unread** to the session row menu and renders an unread dot after the row's time label. The mark lives only in browser `localStorage`; opening the session clears it on the next transition into the main view, so marking the conversation you are already reading does not erase itself. No host state, no session log entries.
