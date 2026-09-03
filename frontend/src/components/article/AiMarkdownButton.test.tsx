import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiMarkdownButton } from "./AiMarkdownButton";

const MARKDOWN = '---\ntitle: "測試"\n---\n\n內文';

function mockFetchReturning(text: string) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(text),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  return writeText;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("AiMarkdownButton", () => {
  it("點一下會把整篇文章的 Markdown 放進剪貼簿", async () => {
    // 這是這個元件存在的理由：讓人一鍵把全文貼進 ChatGPT / Claude 對話框。
    // 若只是複製了網址或標題，功能就失去意義。
    mockFetchReturning(MARKDOWN);
    const writeText = mockClipboard();

    render(<AiMarkdownButton articleId={289} />);
    await userEvent.click(screen.getByRole("button", { name: /markdown/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(MARKDOWN));
  });

  // 以下兩條是「實作寫完才補的」迴歸測試，不是測試驅動出來的。
  // 誠實記著：它們第一次跑就是綠的，所以下面各自做過突變驗證確認不是空測試。

  it("取不到內容時要說失敗，不能靜靜地假裝複製成功", async () => {
    // 靜默失敗最傷：使用者以為複製到了，貼進對話框才發現是空的，
    // 而且會怪自己而不是怪這個按鈕。
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const writeText = mockClipboard();

    render(<AiMarkdownButton articleId={1} />);
    await userEvent.click(screen.getByRole("button", { name: /markdown/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /失敗/ })).toBeInTheDocument(),
    );
    expect(writeText).not.toHaveBeenCalled();
  });

  it("旁邊的連結指向這篇文章的 .md 端點，給會自己抓網頁的 agent 用", () => {
    render(<AiMarkdownButton articleId={289} />);

    expect(screen.getByRole("link", { name: /Markdown/ })).toHaveAttribute(
      "href",
      "/api/articles/289/markdown",
    );
  });
});
