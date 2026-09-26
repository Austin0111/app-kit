export type MotionKind = 'token' | 'preset' | 'behavior' | 'recipe'
export type MotionSurface = 'standard' | 'media-safe' | 'opaque-media'
export type MotionStatus = 'Core' | 'Lab' | 'Recipe'

export type MotionEntry = {
  id: string
  name: string
  kind: MotionKind
  surface: MotionSurface
  status: MotionStatus
  intent: string
  use: string
  avoid: string
  parameters: string
  reduced: string
  reference: string
  code: string
}

export const motionStatusLabels: Record<MotionStatus, string> = { Core: '標準', Lab: '実験', Recipe: '特殊用途' }
export const motionKindLabels: Record<MotionKind, string> = { token: 'トークン', preset: 'プリセット', behavior: '動作制御', recipe: '特殊用途' }
export const motionSurfaceLabels: Record<MotionSurface, string> = { standard: '標準UI', 'media-safe': '画像向け安全', 'opaque-media': '不透明なメディア面' }
export const toastComparisonNotes = {
  'toast-compact': '標準初期値 / 登場 140ms',
  'toast-rise': 'VideoDeck由来 / 登場 200ms',
  'toast-drop': 'VideoDeck由来 / 退場 180ms'
} as const

/** OWNER-facing names stay beside the registry while the public identifiers remain stable. */
export const motionDisplayNames: Record<string, string> = {
  PanelFadeInMediaSafe: '画像入りパネル・フェード',
  PanelEnterSubtle: 'パネルの控えめな登場',
  ToastEnterCompact: '控えめな通知・登場',
  ToastRiseIn: '通知の強調・登場',
  ToastDropOut: '通知・退場',
  AccordionReveal: '折り畳み内容の展開',
  DisclosureCaret: '展開矢印',
  SegmentIndicatorGlide: '選択位置の移動',
  ToggleThumbSlide: 'スイッチの切替',
  ImageFirstPaintFade: '画像の初回表示',
  CardLiftSubtle: 'カードの控えめな浮き上がり',
  SelectionGlider: '選択面の追従',
  DialogExitLifecycle: 'ダイアログの退場制御',
  ToastSlideOpaque: '不透明な通知',
  MediaFullscreenCurtain: '全画面切替の目隠し',
  MenuPopIn: '小型メニュー・登場',
  MenuPopOut: '小型メニュー・退場'
}

/** Registry is the source of truth for Gallery labels and promotion decisions. */
export const motions: MotionEntry[] = [
  { id: 'panel-media-safe', name: 'PanelFadeInMediaSafe', kind: 'preset', surface: 'media-safe', status: 'Core', intent: '画像を再サンプリングせず穏やかに表示', use: '画像を含むパネル', avoid: '動画やWebContentsViewの合成面', parameters: 'opacity / standard / ease', reduced: '即時に表示', reference: 'VideoDeck renderer/styles/main.css panelIn', code: '<section className="ak-motion-panel-media-safe">…</section>' },
  { id: 'panel-subtle', name: 'PanelEnterSubtle', kind: 'preset', surface: 'standard', status: 'Core', intent: 'テキスト面の切替を軽く知らせる', use: '設定などテキスト中心の面', avoid: '画像・動画を内包する面', parameters: 'opacity + Y subtle / standard / ease', reduced: '移動なしで即時表示', reference: 'VideoDeck renderer/styles/main.css settingsPanelIn', code: '<section className="ak-motion-panel-enter-subtle">…</section>' },
  { id: 'toast-compact', name: 'ToastEnterCompact', kind: 'preset', surface: 'standard', status: 'Core', intent: '短い通知を控えめに出す', use: '雛形の現行トースト', avoid: '退場Motionが必要な通知', parameters: 'opacity + Y compact / toast-compact / ease-out', reduced: '移動なしで即時表示', reference: 'template src/renderer/src/ui/chrome.css toast-in', code: '<div className="ak-motion-toast-compact" role="status">保存しました</div>' },
  { id: 'toast-rise', name: 'ToastRiseIn', kind: 'preset', surface: 'standard', status: 'Core', intent: '通知を少し強く提示', use: '通知の登場を明確にしたい場面', avoid: '動画合成面の上', parameters: 'opacity + Y toast / emphasis / ease', reduced: '移動なしで即時表示', reference: 'VideoDeck renderer/styles/main.css toastIn', code: '<div className="ak-motion-toast-rise-in" role="status">保存しました</div>' },
  { id: 'toast-drop', name: 'ToastDropOut', kind: 'preset', surface: 'standard', status: 'Core', intent: '通知の終了を示す', use: '退場のlifecycleを持つ通知', avoid: '雛形の現行Toastへの無条件適用', parameters: 'opacity + Y toast-exit / toast-exit / ease', reduced: '即時非表示', reference: 'VideoDeck renderer/styles/main.css toastOut', code: '<div className="ak-motion-toast-drop-out">保存しました</div>' },
  { id: 'accordion', name: 'AccordionReveal', kind: 'preset', surface: 'standard', status: 'Core', intent: '内容を保持したまま展開する', use: '折り畳みセクション', avoid: '非表示時もフォーカス可能な子要素を残す使い方', parameters: 'grid rows / layout / emphasis easing', reduced: '展開を即時切替', reference: 'VideoDeck renderer/styles/main.css section collapse', code: '<div className="ak-motion-accordion" data-open={open}><div className="ak-motion-accordion-content">…</div></div>' },
  { id: 'caret', name: 'DisclosureCaret', kind: 'preset', surface: 'standard', status: 'Core', intent: '展開状態を矢印で示す', use: 'AccordionRevealの操作子', avoid: '矢印だけで状態を伝える使い方', parameters: 'rotation / layout / emphasis easing', reduced: '回転停止。aria-expandedとラベルで状態表示', reference: 'VideoDeck renderer/styles/main.css disclosure caret', code: '<button aria-expanded={open}><span className="ak-motion-caret" data-open={open}>›</span> 詳細</button>' },
  { id: 'segment', name: 'SegmentIndicatorGlide', kind: 'preset', surface: 'standard', status: 'Core', intent: '選択位置を連続して示す', use: '同幅のセグメント切替', avoid: '可変幅の選択肢に計測なしで適用', parameters: 'translateX / layout / emphasis easing', reduced: '選択位置を即時切替', reference: 'VideoDeck renderer/styles/main.css segmented-control', code: '<span className="ak-motion-segment-indicator" style={{ transform: `translateX(${index * 100}%)` }} />' },
  { id: 'toggle', name: 'ToggleThumbSlide', kind: 'preset', surface: 'standard', status: 'Core', intent: 'ON/OFFの切替を明確にする', use: '状態を持つスイッチ', avoid: '装飾だけでON/OFFを伝える使い方', parameters: 'translateX / standard / ease', reduced: '位置移動停止。色とラベルで状態表示', reference: 'VideoDeck renderer/styles/main.css toggle', code: '<button role="switch" aria-checked={on}><span className="ak-motion-toggle-thumb" data-on={on} /></button>' },
  { id: 'image-first', name: 'ImageFirstPaintFade', kind: 'behavior', surface: 'media-safe', status: 'Core', intent: '初回ロードだけ画像を柔らかく表示', use: '初めて読み込むサムネイル', avoid: '再描画や状態更新のたびに再生する実装', parameters: 'opacity / layout / ease', reduced: '画像を即時表示', reference: 'VideoDeck renderer/styles/main.css thumbFadeIn', code: '<ImageFirstPaint src={url} alt="説明" />' },
  { id: 'card-lift', name: 'CardLiftSubtle', kind: 'preset', surface: 'standard', status: 'Core', intent: '操作可能なカードを控えめに強調', use: 'テキスト中心のカード', avoid: '大量画像を含むカード', parameters: 'Y -2px / fast / ease', reduced: '移動停止。影を維持', reference: 'VideoDeck renderer/styles/main.css card hover', code: '<button className="ak-motion-card-lift">開く</button>' },
  { id: 'menu-pop-in', name: 'MenuPopIn', kind: 'preset', surface: 'standard', status: 'Lab', intent: '小型文字メニューの登場を示す', use: '画像を含まない小型文字メニュー', avoid: '画像・動画・WebContentsViewを含むメニュー', parameters: 'opacity + scale .98→1 / 180ms / ease', reduced: 'scaleなしで表示状態を切替', reference: 'VideoDeck renderer/styles/main.css menuIn', code: '<div className="ak-motion-menu-pop-in" role="menu">…</div>' },
  { id: 'menu-pop-out', name: 'MenuPopOut', kind: 'preset', surface: 'standard', status: 'Lab', intent: '小型文字メニューを退場後に取り除く', use: '画像を含まない小型文字メニューの閉鎖', avoid: 'animationendだけに依存したDOM削除', parameters: 'opacity + scale 1→.98 / 180ms / ease。animationend + fallbackで削除', reduced: 'scaleなしで非表示状態へ移行', reference: 'VideoDeck renderer/styles/main.css menuOut; renderer/js/util.js animateContextMenuExit', code: '<div className="ak-motion-menu-pop-out" role="menu">…</div> // animationendとfallbackで削除' },
  { id: 'selection-glider', name: 'SelectionGlider', kind: 'behavior', surface: 'standard', status: 'Lab', intent: '選択面が項目を追従', use: 'ツリー・リスト', avoid: '未計測の可変行高', parameters: 'FLIP / layout', reduced: '即時位置切替', reference: 'VideoDeck renderer/styles/main.css treeActiveGlide', code: '// Lab: 計測と再描画時の契約を評価してから実装' },
  { id: 'dialog-exit', name: 'DialogExitLifecycle', kind: 'behavior', surface: 'standard', status: 'Lab', intent: '閉鎖を見せてからnative dialogを閉じる', use: '将来のdialog更新', avoid: '現在のDialogへCSSのみを付与', parameters: 'closing → animationend → close', reduced: '即時close', reference: 'template src/renderer/src/ui/dialog.tsx', code: '// Lab: closing state と native close の順序を設計' },
  { id: 'toast-opaque', name: 'ToastSlideOpaque', kind: 'recipe', surface: 'opaque-media', status: 'Recipe', intent: '合成面を透過させず通知を出す', use: '動画・WebContentsView上の通知', avoid: '通常UIの既定Toast', parameters: '不透明 / 画面外から水平移動', reduced: '不透明のまま即時表示', reference: 'VideoDeck preload/webview-adblock.js', code: '// Recipe: 合成面の検証後に製品別に実装' },
  { id: 'media-curtain', name: 'MediaFullscreenCurtain', kind: 'recipe', surface: 'opaque-media', status: 'Recipe', intent: '動画面の切替を隠す', use: '合成面の全画面切替', avoid: '通常パネル', parameters: '即時黒化 / 解除は製品条件次第', reduced: '状態は維持し動きのみ停止', reference: 'VideoDeck renderer/styles/main.css fullscreen curtain', code: '// Recipe: 製品のWCV lifecycleに合わせて実装' }
]
