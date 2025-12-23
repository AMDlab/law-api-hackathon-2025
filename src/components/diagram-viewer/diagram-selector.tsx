"use client";

import { useState, useEffect } from "react";
import { ChevronDown, FileText, Folder } from "lucide-react";

interface DiagramFile {
  filename: string;
  articleId: string;
  path: string;
}

interface DiagramInfo {
  lawId: string;
  lawName: string;
  files: DiagramFile[];
}

interface DiagramSelectorProps {
  onSelect: (path: string) => void;
  selectedPath?: string;
}

/**
 * 機序図ファイル選択コンポーネント
 */
export function DiagramSelector({ onSelect, selectedPath }: DiagramSelectorProps) {
  const [diagrams, setDiagrams] = useState<DiagramInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLaws, setExpandedLaws] = useState<Set<string>>(new Set());

  // 一覧を取得
  useEffect(() => {
    async function fetchDiagrams() {
      try {
        const res = await fetch("/api/diagrams");
        if (!res.ok) throw new Error("Failed to fetch diagrams");
        const data = await res.json();
        setDiagrams(data.diagrams);

        // 最初の法令を展開
        if (data.diagrams.length > 0) {
          setExpandedLaws(new Set([data.diagrams[0].lawId]));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchDiagrams();
  }, []);

  // 法令の展開/折りたたみ
  const toggleLaw = (lawId: string) => {
    setExpandedLaws((prev) => {
      const next = new Set(prev);
      if (next.has(lawId)) {
        next.delete(lawId);
      } else {
        next.add(lawId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 text-sm">
        エラー: {error}
      </div>
    );
  }

  if (diagrams.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        機序図ファイルがありません。
        <br />
        <code className="text-xs">data/diagrams/</code> にJSONファイルを配置してください。
      </div>
    );
  }

  return (
    <div className="py-2">
      {diagrams.map((law) => (
        <div key={law.lawId}>
          {/* 法令名ヘッダー */}
          <button
            onClick={() => toggleLaw(law.lawId)}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                expandedLaws.has(law.lawId) ? "" : "-rotate-90"
              }`}
            />
            <Folder className="w-4 h-4 text-yellow-600" />
            <span className="font-medium text-sm">{law.lawName}</span>
            <span className="text-xs text-gray-400">({law.files.length})</span>
          </button>

          {/* ファイル一覧 */}
          {expandedLaws.has(law.lawId) && (
            <div className="ml-6">
              {law.files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => onSelect(file.path)}
                  className={`w-full flex items-center gap-2 px-4 py-1.5 hover:bg-gray-100 text-left ${
                    selectedPath === file.path ? "bg-blue-50 text-blue-700" : ""
                  }`}
                >
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{file.articleId}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
