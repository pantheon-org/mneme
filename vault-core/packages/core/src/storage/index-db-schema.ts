export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS memories (
    id               TEXT PRIMARY KEY,
    tier             TEXT NOT NULL,
    scope            TEXT NOT NULL,
    status           TEXT NOT NULL,
    category         TEXT NOT NULL,
    summary          TEXT NOT NULL,
    content          TEXT NOT NULL,
    tags             TEXT NOT NULL DEFAULT '[]',
    project_id       TEXT,
    strength         REAL NOT NULL DEFAULT 1.0,
    importance_score REAL NOT NULL DEFAULT 0,
    frequency_count  INTEGER NOT NULL DEFAULT 0,
    source_type      TEXT NOT NULL DEFAULT 'manual',
    human_edited_at  TEXT,
    file_path        TEXT NOT NULL,
    captured_at      TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    mtime_ns         INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
    id,
    summary,
    content,
    tags
  )`,
];

export const UPSERT_SQL = `INSERT INTO memories (id,tier,scope,status,category,summary,content,tags,project_id,strength,importance_score,frequency_count,source_type,human_edited_at,file_path,captured_at,updated_at,mtime_ns) VALUES ($id,$tier,$scope,$status,$category,$summary,$content,$tags,$project_id,$strength,$importance_score,$frequency_count,$source_type,$human_edited_at,$file_path,$captured_at,$updated_at,$mtime_ns) ON CONFLICT(id) DO UPDATE SET tier=excluded.tier,scope=excluded.scope,status=excluded.status,category=excluded.category,summary=excluded.summary,content=excluded.content,tags=excluded.tags,project_id=excluded.project_id,strength=excluded.strength,importance_score=excluded.importance_score,frequency_count=excluded.frequency_count,source_type=excluded.source_type,human_edited_at=excluded.human_edited_at,file_path=excluded.file_path,captured_at=excluded.captured_at,updated_at=excluded.updated_at,mtime_ns=excluded.mtime_ns`;

export const MIGRATE_COLUMNS: [string, string][] = [
  ["importance_score", "REAL NOT NULL DEFAULT 0"],
  ["frequency_count", "INTEGER NOT NULL DEFAULT 0"],
  ["source_type", "TEXT NOT NULL DEFAULT 'manual'"],
  ["human_edited_at", "TEXT"],
];
