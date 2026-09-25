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

/** Registry is the source of truth for Gallery labels and promotion decisions. */
export const motions: MotionEntry[] = [
  { id: 'panel-media-safe', name: 'PanelFadeInMediaSafe', kind: 'preset', surface: 'media-safe', status: 'Core', intent: '画像を再サンプリングせず穏やかに表示', use: '画像を含むパネル', avoid: '動画やWebContentsViewの合成面', parameters: 'opacity / standard / ease', reduced: '即時に表示', reference: 'VideoDeck renderer/styles/main.css panelIn', code: '<section className="ak-motion-panel-media-safe">…</section>' },
  { id: 'panel-subtle', name: 'PanelEnterSubtle', kind: 'preset', surface: 'standard', status: 'Core', intent: 'テキスト面の切替を軽く知らせる', use: '設定などテキスト中心の面', avoid: '画像・動画を内包する面', parameters: 'opacity + Y subtle / standard / ease', reduced: '移動なしで即時表示', reference: 'VideoDeck renderer/styles/main.css settingsPanelIn', code: '<section className="ak-motion-panel-enter-subtle">…</section>' },
  { id: 'toast-compact', name: 'ToastEnterCompact', kind: 'preset', surface: 'standard', status: 'Core', intent: '短い通知を控えめに出す', use: '雛形の現行トースト', avoid: '退場Motionが必要な通知', parameters: 'opacity + Y compact / toast-compact / ease-out', reduced: '移動なしで即時表示', reference: 'template src/renderer/src/index.css toast-in', code: '<div className="ak-motion-toast-compact" role="status">保存しました</div>' },
  { id: 'toast-rise', name: 'ToastRiseIn', kind: 'preset', surface: 'standard', status: 'Core', intent: '通知を少し強く提示', use: '通知の登場を明確にしたい場面', avoid: '動画合成面の上', parameters: 'opacity + Y toast / emphasis / ease', reduced: '移動なしで即時表示', reference: 'VideoDeck renderer/styles/main.css toastIn', code: '<div className="ak-motion-toast-rise-in" role="status">保存しました</div>' },
  { id: 'toast-drop', name: 'ToastDropOut', kind: 'preset', surface: 'standard', status: 'Core', intent: '通知の終了を示す', use: '退場のlifecycleを持つ通知', avoid: '雛形の現行Toastへの無条件適用', parameters: 'opacity + Y toast-exit / toast-exit / ease', reduced: '即時非表示', reference: 'VideoDeck renderer/styles/main.css toastOut', code: '<div className="ak-motion-toast-drop-out">保存しました</div>' },
  { id: 'accordion', name: 'AccordionReveal', kind: 'preset', surface: 'standard', status: 'Core', intent: '内容を保持したまま展開する', use: '折り畳みセクション', avoid: '非表示時もフォーカス可能な子要素を残す使い方', parameters: 'grid rows / layout / emphasis easing', reduced: '展開を即時切替', reference: 'VideoDeck renderer/styles/main.css section collapse', code: '<div className="ak-motion-accordion" data-open={open}><div className="ak-motion-accordion-content">…</div></div>' },
  { id: 'caret', name: 'DisclosureCaret', kind: 'preset', surface: 'standard', status: 'Core', intent: '展開状態を矢印で示す', use: 'AccordionRevealの操作子', avoid: '矢印だけで状態を伝える使い方', parameters: 'rotation / layout / emphasis easing', reduced: '回転停止。aria-expandedとラベルで状態表示', reference: 'VideoDeck renderer/styles/main.css disclosure caret', code: '<button aria-expanded={open}><span className="ak-motion-caret" data-open={open}>›</span> 詳細</button>' },
  { id: 'segment', name: 'SegmentIndicatorGlide', kind: 'preset', surface: 'standard', status: 'Core', intent: '選択位置を連続して示す', use: '同幅のセグメント切替', avoid: '可変幅の選択肢に計測なしで適用', parameters: 'translateX / layout / emphasis easing', reduced: '選択位置を即時切替', reference: 'VideoDeck renderer/styles/main.css segmented-control', code: '<span className="ak-motion-segment-indicator" style={{ transform: `translateX(${index * 100}%)` }} />' },
  { id: 'toggle', name: 'ToggleThumbSlide', kind: 'preset', surface: 'standard', status: 'Core', intent: 'ON/OFFの切替を明確にする', use: '状態を持つスイッチ', avoid: '装飾だけでON/OFFを伝える使い方', parameters: 'translateX / standard / ease', reduced: '位置移動停止。色とラベルで状態表示', reference: 'VideoDeck renderer/styles/main.css toggle', code: '<button role="switch" aria-checked={on}><span className="ak-motion-toggle-thumb" data-on={on} /></button>' },
  { id: 'image-first', name: 'ImageFirstPaintFade', kind: 'behavior', surface: 'media-safe', status: 'Core', intent: '初回ロードだけ画像を柔らかく表示', use: '初めて読み込むサムネイル', avoid: '再描画や状態更新のたびに再生する実装', parameters: 'opacity / layout / ease', reduced: '画像を即時表示', reference: 'VideoDeck renderer/styles/main.css thumbFadeIn', code: '<ImageFirstPaint src={url} alt="説明" />' },
  { id: 'card-lift', name: 'CardLiftSubtle', kind: 'preset', surface: 'standard', status: 'Core', intent: '操作可能なカードを控えめに強調', use: 'テキスト中心のカード', avoid: '大量画像を含むカード', parameters: 'Y -2px / fast / ease', reduced: '移動停止。影を維持', reference: 'VideoDeck renderer/styles/main.css card hover', code: '<button className="ak-motion-card-lift">開く</button>' },
  { id: 'selection-glider', name: 'SelectionGlider', kind: 'behavior', surface: 'standard', status: 'Lab', intent: '選択面が項目を追従', use: 'ツリー・リスト', avoid: '未計測の可変行高', parameters: 'FLIP / layout', reduced: '即時位置切替', reference: 'VideoDeck renderer/styles/main.css treeActiveGlide', code: '// Lab: 計測と再描画時の契約を評価してから実装' },
  { id: 'dialog-exit', name: 'DialogExitLifecycle', kind: 'behavior', surface: 'standard', status: 'Lab', intent: '閉鎖を見せてからnative dialogを閉じる', use: '将来のdialog更新', avoid: '現在のDialogへCSSのみを付与', parameters: 'closing → animationend → close', reduced: '即時close', reference: 'template src/renderer/src/ui/dialog.tsx', code: '// Lab: closing state と native close の順序を設計' },
  { id: 'toast-opaque', name: 'ToastSlideOpaque', kind: 'recipe', surface: 'opaque-media', status: 'Recipe', intent: '合成面を透過させず通知を出す', use: '動画・WebContentsView上の通知', avoid: '通常UIの既定Toast', parameters: '不透明 / 画面外から水平移動', reduced: '不透明のまま即時表示', reference: 'VideoDeck preload/webview-adblock.js', code: '// Recipe: 合成面の検証後に製品別に実装' },
  { id: 'media-curtain', name: 'MediaFullscreenCurtain', kind: 'recipe', surface: 'opaque-media', status: 'Recipe', intent: '動画面の切替を隠す', use: '合成面の全画面切替', avoid: '通常パネル', parameters: '即時黒化 / 解除は製品条件次第', reduced: '状態は維持し動きのみ停止', reference: 'VideoDeck renderer/styles/main.css fullscreen curtain', code: '// Recipe: 製品のWCV lifecycleに合わせて実装' }
]
