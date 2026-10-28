import { Fragment } from "react";

/**
 * Renders the small subset of Markdown the assistant and articles use:
 * paragraphs, "- " lists and **bold**.
 *
 * Model output is untrusted, so this builds React elements and never sets
 * HTML. Anything else (links, headings, HTML tags) shows as plain text.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.trim().split(/\n\s*\n/);

  return (
    <div className={className}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const isList = lines.every((line) => /^\s*[-*]\s+/.test(line));

        if (isList) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((line, j) => (
                <li key={j}>
                  <Inline text={line.replace(/^\s*[-*]\s+/, "")} />
                </li>
              ))}
            </ul>
          );
        }

        // A paragraph followed directly by list lines, e.g. "Here are your cards:\n- ..."
        const firstListLine = lines.findIndex((line) => /^\s*[-*]\s+/.test(line));
        if (firstListLine > 0 && lines.slice(firstListLine).every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <Fragment key={i}>
              <p>
                <Inline text={lines.slice(0, firstListLine).join(" ")} />
              </p>
              <ul className="list-disc space-y-1 pl-5">
                {lines.slice(firstListLine).map((line, j) => (
                  <li key={j}>
                    <Inline text={line.replace(/^\s*[-*]\s+/, "")} />
                  </li>
                ))}
              </ul>
            </Fragment>
          );
        }

        return (
          <p key={i}>
            <Inline text={lines.join(" ")} />
          </p>
        );
      })}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const pieces = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {pieces.map((piece, i) =>
        piece.startsWith("**") && piece.endsWith("**") ? (
          <strong key={i} className="text-ink font-semibold">
            {piece.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{piece}</Fragment>
        ),
      )}
    </>
  );
}
