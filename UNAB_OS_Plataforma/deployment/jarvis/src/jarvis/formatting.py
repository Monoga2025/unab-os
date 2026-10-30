from __future__ import annotations

import html
import re
from collections.abc import Awaitable, Callable

from telegram.constants import ParseMode
from telegram.error import BadRequest


MAX_SOURCE_CHARS = 2800


def split_message(text: str, limit: int = MAX_SOURCE_CHARS) -> list[str]:
    """Divide por párrafos antes de convertir a HTML y evita cortar etiquetas."""
    text = text.strip()
    if not text:
        return [""]
    chunks: list[str] = []
    current = ""
    for paragraph in re.split(r"\n{2,}", text):
        paragraph = paragraph.strip()
        while len(paragraph) > limit:
            cut = paragraph.rfind("\n", 0, limit)
            if cut < limit // 2:
                cut = paragraph.rfind(" ", 0, limit)
            if cut < limit // 2:
                cut = limit
            head, paragraph = paragraph[:cut].strip(), paragraph[cut:].strip()
            if current:
                chunks.append(current)
                current = ""
            chunks.append(head)
        candidate = paragraph if not current else current + "\n\n" + paragraph
        if len(candidate) <= limit:
            current = candidate
        else:
            chunks.append(current)
            current = paragraph
    if current:
        chunks.append(current)
    return chunks


def _inline(text: str) -> str:
    protected: list[str] = []

    def protect_code(match: re.Match) -> str:
        protected.append(f"<code>{html.escape(match.group(1), quote=False)}</code>")
        return f"\x00P{len(protected) - 1}\x00"

    text = re.sub(r"`([^`\n]+)`", protect_code, text)
    text = html.escape(text, quote=False)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"__(.+?)__", r"<b>\1</b>", text)
    text = re.sub(r"~~(.+?)~~", r"<s>\1</s>", text)
    text = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<i>\1</i>", text)
    for index, value in enumerate(protected):
        text = text.replace(f"\x00P{index}\x00", value)
    return text


def markdown_to_telegram_html(text: str) -> str:
    """Convierte un subconjunto seguro de Markdown al HTML admitido por Telegram."""
    output: list[str] = []
    code_lines: list[str] = []
    in_code = False

    for raw_line in text.strip().splitlines():
        line = raw_line.rstrip()
        if line.lstrip().startswith("```"):
            if in_code:
                output.append("<pre><code>" + html.escape("\n".join(code_lines), quote=False) + "</code></pre>")
                code_lines = []
            in_code = not in_code
            continue
        if in_code:
            code_lines.append(line)
            continue

        stripped = line.strip()
        if re.fullmatch(r"[-_*]{3,}", stripped):
            output.append("────────────")
            continue
        heading = re.match(r"^\s*#{1,6}\s+(.+)$", line)
        if heading:
            output.append(f"<b>{_inline(heading.group(1))}</b>")
            continue
        quote = re.match(r"^\s*&gt;\s?(.+)$", html.escape(line, quote=False))
        if quote:
            output.append(f"<blockquote>{quote.group(1)}</blockquote>")
            continue
        bullet = re.match(r"^\s*[-*+]\s+(.+)$", line)
        if bullet:
            output.append("• " + _inline(bullet.group(1)))
            continue
        output.append(_inline(line))

    if code_lines:
        output.append("<pre><code>" + html.escape("\n".join(code_lines), quote=False) + "</code></pre>")
    return "\n".join(output).strip()


async def _send_chunks(send: Callable[..., Awaitable], text: str) -> None:
    for chunk in split_message(text):
        rendered = markdown_to_telegram_html(chunk)
        try:
            await send(rendered, parse_mode=ParseMode.HTML)
        except BadRequest:
            await send(chunk)


async def reply_rich(message, text: str) -> None:
    await _send_chunks(message.reply_text, text)


async def send_rich(bot, chat_id: int, text: str) -> None:
    async def sender(rendered: str, **kwargs):
        return await bot.send_message(chat_id=chat_id, text=rendered, **kwargs)

    await _send_chunks(sender, text)
