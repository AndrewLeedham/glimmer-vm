import { Span } from '../types/handlebars-ast';

export interface Position {
  line: number;
  column: number;
}

export interface Location {
  start: Position;
  end: Position;
}

export function locForSpan(source: string, span: Span): Location {
  let lines = source.split('\n');
  let seen = 0;
  let lineNo = 1;

  let start = { line: -1, column: -1 };
  let end = { line: -1, column: -1 };

  for (let line of lines) {
    // the current line contains the start span
    if (seen + line.length >= span.start) {
      start.line = lineNo;
      start.column = span.start - seen;
    } else {
      seen += line.length + 1;
      lineNo++;
      continue;
    }

    if (seen + line.length > span.end) {
      end.line = lineNo;
      end.column = span.end - seen;

      return { start, end };
    } else {
      seen += line.length + 1;
      lineNo++;
      break;
    }
  }

  let rest = lines.slice(lineNo - 1);

  for (let line of rest) {
    if (seen + line.length >= span.end) {
      end.line = lineNo;
      end.column = span.end - seen;
      break;
    } else {
      seen += line.length + 1;
      lineNo++;
      continue;
    }
  }

  return { start, end };
}
