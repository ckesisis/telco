/**
 * Layout for long forms: fixed header, scrolling body, footer always visible.
 * Use as DialogContent className, with a DialogHeader then a form whose body
 * uses DIALOG_BODY_CLASS and actions use DIALOG_FOOTER_CLASS.
 */
export const DIALOG_SCROLL_LAYOUT_CLASS = "flex flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl";
export const DIALOG_HEADER_CLASS = "border-b border-slate-200 px-6 pb-4 pt-6 pr-12";
export const DIALOG_BODY_CLASS = "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5";
export const DIALOG_FOOTER_CLASS =
  "flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:rounded-b-lg";
