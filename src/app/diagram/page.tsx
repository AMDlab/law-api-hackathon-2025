"use client";

import { useState, useCallback, useEffect } from "react";
import { KijoDiagramViewer } from "@/components/kijo-diagram";
import { LawTreeSelector } from "@/components/kijo-diagram/law-tree-selector";
import type { KijoDiagram } from "@/types/diagram";
import type { LawNode } from "@/lib/parser";
import { Menu, RefreshCw } from "lucide-react";

interface DiagramFile {
  diagramId: string;
  path: string;
}

interface LawOption {
  lawId: string;
  lawName: string;
}

// 対応法令一覧
const AVAILABLE_LAWS: LawOption[] = [
  { lawId: "325AC0000000201", lawName: "建築基準法" },
  { lawId: "325CO0000000338", lawName: "建築基準法施行令" },
];

export default function DiagramPage() {
  const [diagram, setDiagram] = useState<KijoDiagram | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNode, setSelectedNode] = useState<LawNode | null>(null);

  // 法令選択
  const [selectedLawId, setSelectedLawId] = useState<string>(AVAILABLE_LAWS[0].lawId);
  const [lawData, setLawData] = useState<LawNode[]>([]);
  const [lawName, setLawName] = useState<string>("");
  const [lawLoading, setLawLoading] = useState(false);

  // 利用可能な機序図ファイル
  const [availableDiagrams, setAvailableDiagrams] = useState<DiagramFile[]>([]);

  // 法令データを読み込む
  const loadLawData = useCallback(async (lawId: string) => {
    setLawLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/laws/${lawId}`);
      if (!res.ok) throw new Error("Failed to load law data");
      const data = await res.json();
      setLawData(data.tree);
      setLawName(data.lawName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLawData([]);
    } finally {
      setLawLoading(false);
    }
  }, []);

  // 機序図一覧を読み込む
  const loadDiagramList = useCallback(async (lawId: string) => {
    try {
      const res = await fetch("/api/diagrams");
      if (!res.ok) throw new Error("Failed to load diagram list");
      const data = await res.json();

      // 選択された法令の機序図のみ抽出
      const lawDiagrams = data.diagrams.find((d: { lawId: string }) => d.lawId === lawId);
      if (lawDiagrams) {
        setAvailableDiagrams(
          lawDiagrams.files.map((f: { diagramId: string; path: string }) => ({
            diagramId: f.diagramId,
            path: f.path,
          }))
        );
      } else {
        setAvailableDiagrams([]);
      }
    } catch (err) {
      console.error("Failed to load diagram list:", err);
      setAvailableDiagrams([]);
    }
  }, []);

  // 初回ロードと法令変更時
  useEffect(() => {
    loadLawData(selectedLawId);
    loadDiagramList(selectedLawId);
  }, [selectedLawId, loadLawData, loadDiagramList]);

  // 機序図を読み込む（または規制文を選択）
  const handleNodeSelect = useCallback(async (path: string | null, node: LawNode) => {
    setSelectedNode(node);
    setError(null);

    if (path) {
      // 機序図がある場合は読み込む
      setLoading(true);
      setSelectedPath(path);

      try {
        const res = await fetch(path);
        if (!res.ok) throw new Error("Failed to load diagram");
        const data: KijoDiagram = await res.json();
        setDiagram(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setDiagram(null);
      } finally {
        setLoading(false);
      }
    } else {
      // 機序図がない場合はダイアグラムをクリア
      setDiagram(null);
      setSelectedPath(undefined);
    }
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* ヘッダー */}
      <header className="bg-gray-800 text-white px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 hover:bg-gray-700 rounded"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">審査機序図ビューアー</h1>

        {/* 法令選択 */}
        <select
          value={selectedLawId}
          onChange={(e) => {
            setSelectedLawId(e.target.value);
            setDiagram(null);
            setSelectedPath(undefined);
            setSelectedNode(null);
          }}
          className="ml-4 px-3 py-1 rounded bg-gray-700 text-white text-sm"
        >
          {AVAILABLE_LAWS.map((law) => (
            <option key={law.lawId} value={law.lawId}>
              {law.lawName}
            </option>
          ))}
        </select>

        {/* リロードボタン */}
        <button
          onClick={() => {
            loadLawData(selectedLawId);
            loadDiagramList(selectedLawId);
          }}
          className="p-1 hover:bg-gray-700 rounded"
          title="法令データを再読込"
        >
          <RefreshCw className={`w-5 h-5 ${lawLoading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* メインコンテンツ */}
      <div className="flex-1 flex overflow-hidden">
        {/* サイドバー */}
        {sidebarOpen && (
          <aside className="w-80 border-r bg-white overflow-y-auto">
            {lawLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-500">法令データを読み込み中...</div>
              </div>
            ) : lawData.length > 0 ? (
              <LawTreeSelector
                lawData={lawData}
                lawName={lawName}
                lawId={selectedLawId}
                availableDiagrams={availableDiagrams}
                onSelect={handleNodeSelect}
                selectedPath={selectedPath}
                selectedDiagramId={selectedNode?.diagramId}
              />
            ) : (
              <div className="p-4 text-gray-500 text-sm">
                法令データの読み込みに失敗しました
              </div>
            )}
          </aside>
        )}

        {/* メインエリア */}
        <main className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">読み込み中...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-500">エラー: {error}</div>
            </div>
          ) : diagram ? (
            <KijoDiagramViewer diagram={diagram} />
          ) : selectedNode && selectedNode.isRegulation ? (
            // 規制文があるが機序図がない場合
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 max-w-md">
                <p className="text-lg mb-2">機序図がまだ作成されていません</p>
                <p className="text-sm mb-4">
                  この規制文に対する機序図を作成してください
                </p>
                <div className="bg-gray-100 p-4 rounded text-left">
                  <div className="text-xs text-gray-400 mb-1">
                    {selectedNode.diagramId}
                  </div>
                  <div className="text-sm text-gray-700">
                    {selectedNode.content?.substring(0, 200)}
                    {(selectedNode.content?.length || 0) > 200 && "..."}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <p className="text-lg mb-2">機序図を選択してください</p>
                <p className="text-sm">
                  左のパネルから規制文のある項を選択すると機序図が表示されます
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
