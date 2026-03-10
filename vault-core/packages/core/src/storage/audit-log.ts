import { appendFileSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"
import type { AuditEntry } from "@vault-core/types"

export class AuditLog {
  constructor(private readonly logPath: string) {
    mkdirSync(dirname(logPath), { recursive: true })
  }

  append(entry: AuditEntry): void {
    appendFileSync(this.logPath, JSON.stringify(entry) + "\n", "utf-8")
  }
}
