window.__ModuleLoader__.load({
  id: '@local/dsh-session-unread',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'dsh-session-unread'
    const STORAGE_KEY = 'dsh.session-unread.v1'

    const EN = { markUnread: 'Mark as unread', markRead: 'Mark as read', unread: 'Unread' }
    const ZH = { markUnread: '标记为未读', markRead: '标记为已读', unread: '未读' }

    const CSS = [
      '.dsu-dot{display:inline-block;flex:none;width:6px;height:6px;margin:0 1px;',
      'border-radius:50%;background:var(--dsw-alias-brand-primary);vertical-align:middle}',
    ].join('')

    // The menu row primitive is a baseline external of the Module Loader lane; when it is
    // unavailable the row falls back to the plain `role="menuitem"` button the menu styles.
    let MenuItemButton
    try {
      MenuItemButton = require('@deepseek-ai/dsh-client-ui-primitives').MenuItemButton
    } catch (error) {
      console.warn('[session-unread] menu primitives unavailable, using a plain menuitem button', error)
    }

    /**
     * Browser-local unread marks: the same storage class the sidebar uses for its own view
     * preferences, so no Host state, session log entry, or cross-browser contract is involved.
     */
    function readStored() {
      const marks = {}
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return marks
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return marks
        for (const key of Object.keys(parsed)) if (parsed[key] === true) marks[key] = true
      } catch (error) {
        console.warn('[session-unread] stored marks are unreadable', error)
      }
      return marks
    }

    let marks = readStored()
    const listeners = new Set()

    function emit() {
      for (const listener of Array.from(listeners)) {
        try {
          listener()
        } catch (error) {
          console.error('[session-unread] listener failed', error)
        }
      }
    }

    function subscribe(listener) {
      listeners.add(listener)
      let active = true
      return () => {
        if (!active) return
        active = false
        listeners.delete(listener)
      }
    }

    function isMarked(sessionId) {
      return marks[sessionId] === true
    }

    function setMarked(sessionId, marked) {
      if (typeof sessionId !== 'string' || sessionId === '') return
      if (isMarked(sessionId) === marked) return
      const next = { ...marks }
      if (marked) next[sessionId] = true
      else delete next[sessionId]
      marks = next
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch (error) {
        console.warn('[session-unread] could not persist marks', error)
      }
      emit()
    }

    /** Subscribe one Session row to its own mark; unrelated rows never re-render. */
    function useMarked(sessionId) {
      const read = () => marks[sessionId] === true
      if (typeof React.useSyncExternalStore === 'function') {
        return React.useSyncExternalStore(subscribe, read, read)
      }
      const [value, setValue] = React.useState(read)
      React.useEffect(() => subscribe(() => setValue(marks[sessionId] === true)), [sessionId])
      return value
    }

    /** Read `retainedBy.mainView` from a retain-info value or its observable snapshot. */
    function mainViewCount(info) {
      if (info === undefined || info === null) return 0
      const snapshot = typeof info.getSnapshot === 'function' ? info.getSnapshot() : info
      const count = snapshot && snapshot.retainedBy ? snapshot.retainedBy.mainView : undefined
      return typeof count === 'number' ? count : 0
    }

    function MenuRow(props) {
      const sessionId = props.sessionId
      const t = typeof props.t === 'function' ? props.t : (key) => key
      const marked = useMarked(sessionId)
      const menuState = typeof props.useMenuOpenState === 'function' ? props.useMenuOpenState() : undefined
      const setMenuOpen = Array.isArray(menuState) ? menuState[1] : undefined

      const onSelect = () => {
        if (typeof setMenuOpen === 'function') setMenuOpen(false)
        setMarked(sessionId, !marked)
      }
      const label = marked ? t('markRead') : t('markUnread')

      if (typeof MenuItemButton === 'function') {
        const icon = h(
          'svg',
          { width: 14, height: 14, viewBox: '0 0 16 16', 'aria-hidden': true, style: { display: 'block' } },
          marked
            ? h('circle', { cx: 8, cy: 8, r: 4.5, fill: 'currentColor' })
            : h('circle', { cx: 8, cy: 8, r: 4, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 }),
        )
        return h(MenuItemButton, { icon, separatorBefore: true, onSelect }, label)
      }
      return h('button', { type: 'button', role: 'menuitem', onClick: onSelect }, label)
    }

    /**
     * The unread dot sits after the row's time label. Opening the Session clears the mark: the
     * mark survives while the Session stays open, and clears on the next transition into the main
     * view, so marking the Session the user is already reading does not erase itself.
     */
    function UnreadDot(props) {
      const sessionId = props.sessionId
      const t = typeof props.t === 'function' ? props.t : (key) => key
      const marked = useMarked(sessionId)
      const info =
        typeof props.useSessionRetainInfo === 'function'
          ? props.useSessionRetainInfo(sessionId)
          : undefined
      const inMainView = mainViewCount(info) > 0
      const wasInMainView = React.useRef(inMainView)

      React.useEffect(() => {
        const previous = wasInMainView.current
        wasInMainView.current = inMainView
        if (marked && inMainView && !previous) setMarked(sessionId, false)
      }, [marked, inMainView, sessionId])

      if (!marked) return null
      return h('span', { className: 'dsu-dot', role: 'img', 'aria-label': t('unread') })
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'session-unread: dictionaries')

      ctx.effect(() => {
        const style = document.createElement('style')
        style.setAttribute('data-dsh-session-unread', 'true')
        style.textContent = CSS
        document.head.appendChild(style)
        return () => style.remove()
      }, 'session-unread: row styles')

      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register(
          {
            name: 'sidebar.workspaces.session.menu.item',
            id: 'session-unread.menu-item',
            order: 7,
            inject: () => ({ t: ctx.locale.bind(NS) }),
          },
          MenuRow,
        ),
      )

      ctx.slots.inject('sidebar.session.row.trailing', () =>
        ctx.slots.register(
          {
            name: 'sidebar.session.row.trailing',
            id: 'session-unread.dot',
            order: 5,
            inject: () => ({ t: ctx.locale.bind(NS) }),
          },
          UnreadDot,
        ),
      )
    }

    return { inject: ['slots', 'locale'], apply }
  },
})
