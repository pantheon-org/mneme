export const parseCommand = (cmd: string): string[] => {
  const result: string[] = [];
  const re = /(?:"([^"]*)")|(?:'([^']*)')|(\S+)/g;
  for (;;) {
    const m = re.exec(cmd);
    if (m === null) break;
    result.push(m[1] ?? m[2] ?? m[3] ?? "");
  }
  return result;
};
