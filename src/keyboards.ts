import { getToolCategory, getToolTitle } from "./aliases.js";
import type { ToolMeta } from "./celina-api.js";
import { categoriesFromTools } from "./catalog-cache.js";
import { KEYBOARD } from "./constants.js";
import type { InlineKeyboardButton, ReplyMarkup } from "./telegram.js";

export const PAGE_SIZE = 8;

export type CallbackAction =
  | { type: "cats"; page: number }
  | { type: "cat"; catIndex: number; page: number }
  | { type: "tool"; toolIndex: number }
  | { type: "skip" }
  | { type: "skipall" }
  | { type: "cancel" };

export function encodeCallback(action: CallbackAction): string {
  switch (action.type) {
    case "cats":
      return `c:${action.page}`;
    case "cat":
      return `g:${action.catIndex}:${action.page}`;
    case "tool":
      return `x:${action.toolIndex}`;
    case "skip":
      return "s";
    case "skipall":
      return "a";
    case "cancel":
      return "z";
  }
}

export function decodeCallback(data: string): CallbackAction | undefined {
  if (data === "s") return { type: "skip" };
  if (data === "a") return { type: "skipall" };
  if (data === "z") return { type: "cancel" };
  const cats = data.match(/^c:(\d+)$/);
  if (cats) return { type: "cats", page: Number(cats[1]) };
  const cat = data.match(/^g:(\d+):(\d+)$/);
  if (cat) {
    return { type: "cat", catIndex: Number(cat[1]), page: Number(cat[2]) };
  }
  const tool = data.match(/^x:(\d+)$/);
  if (tool) return { type: "tool", toolIndex: Number(tool[1]) };
  return undefined;
}

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages.length > 0 ? pages : [[]];
}

function navRow(
  page: number,
  pageCount: number,
  make: (page: number) => CallbackAction,
): InlineKeyboardButton[] {
  const row: InlineKeyboardButton[] = [];
  if (page > 0) {
    row.push({ text: "‹ Prev", callback_data: encodeCallback(make(page - 1)) });
  }
  if (page + 1 < pageCount) {
    row.push({ text: "Next ›", callback_data: encodeCallback(make(page + 1)) });
  }
  return row;
}

export function categoriesKeyboard(tools: ToolMeta[], page = 0): ReplyMarkup {
  const categories = categoriesFromTools(tools);
  const pages = chunk(categories, PAGE_SIZE);
  const safePage = Math.min(page, pages.length - 1);
  const rows: InlineKeyboardButton[][] = pages[safePage].map((name, index) => {
    const catIndex = safePage * PAGE_SIZE + index;
    return [
      {
        text: name,
        callback_data: encodeCallback({ type: "cat", catIndex, page: 0 }),
      },
    ];
  });
  const nav = navRow(safePage, pages.length, (next) => ({ type: "cats", page: next }));
  if (nav.length) rows.push(nav);
  return { inline_keyboard: rows };
}

export function toolsInCategoryKeyboard(
  tools: ToolMeta[],
  catIndex: number,
  page = 0,
): { text: string; markup: ReplyMarkup } | undefined {
  const categories = categoriesFromTools(tools);
  const category = categories[catIndex];
  if (!category) return undefined;
  const inCategory = tools.filter((tool) => getToolCategory(tool.name) === category);
  const pages = chunk(inCategory, PAGE_SIZE);
  const safePage = Math.min(page, pages.length - 1);
  const rows: InlineKeyboardButton[][] = pages[safePage].map((tool) => {
    const toolIndex = tools.findIndex((candidate) => candidate.name === tool.name);
    return [
      {
        text: getToolTitle(tool.name).slice(0, 64),
        callback_data: encodeCallback({ type: "tool", toolIndex }),
      },
    ];
  });
  const nav = navRow(safePage, pages.length, (next) => ({
    type: "cat",
    catIndex,
    page: next,
  }));
  if (nav.length) rows.push(nav);
  rows.push([
    {
      text: "‹ Categories",
      callback_data: encodeCallback({ type: "cats", page: 0 }),
    },
  ]);
  return {
    text: `${category} tools`,
    markup: { inline_keyboard: rows },
  };
}

export function skipKeyboard(includeSkipAll: boolean): ReplyMarkup {
  const row: InlineKeyboardButton[] = [
    { text: "Skip", callback_data: encodeCallback({ type: "skip" }) },
  ];
  if (includeSkipAll) {
    row.push({
      text: "Skip remaining",
      callback_data: encodeCallback({ type: "skipall" }),
    });
  }
  row.push({ text: "Cancel", callback_data: encodeCallback({ type: "cancel" }) });
  return { inline_keyboard: [row] };
}

export function cancelKeyboard(): ReplyMarkup {
  return {
    inline_keyboard: [
      [{ text: "Cancel", callback_data: encodeCallback({ type: "cancel" }) }],
    ],
  };
}

export function persistentKeyboard(): ReplyMarkup {
  return {
    keyboard: [
      [{ text: KEYBOARD.tools }, { text: KEYBOARD.balance }],
      [{ text: KEYBOARD.gov }, { text: KEYBOARD.network }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}
