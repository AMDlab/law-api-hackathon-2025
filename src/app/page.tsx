'use client';

import { useEffect, useState, useCallback } from 'react';
import { LawTree } from '@/components/law-tree';
import { KijoDiagramViewer } from '@/components/kijo-diagram';
import { LawNode, parseLawData } from '@/lib/parser';
import { getBuildingStandardsAct } from '@/lib/api';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { KijoDiagram } from '@/types/diagram';

interface DiagramFile {
  diagramId: string;
  path: string;
}

// 条文タイトルを生成（例: "第21条第2項" or "第21条第1項第3号"）
function formatArticleTitle(node: LawNode): string {
  const parts: string[] = [];
  if (node.articleNum) {
    parts.push(`第${node.articleNum}条`);
  }
  if (node.paragraphNum) {
    parts.push(`第${node.paragraphNum}項`);
  }
  if (node.itemNum) {
    parts.push(`第${node.itemNum}号`);
  }
  return parts.join('');
}

export default function Home() {
  const [treeData, setTreeData] = useState<LawNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<LawNode | null>(null);
  const [loading, setLoading] = useState(true);

  // 機序図関連
  const [diagram, setDiagram] = useState<KijoDiagram | null>(null);
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [availableDiagrams, setAvailableDiagrams] = useState<DiagramFile[]>([]);
  const [availableDiagramIds, setAvailableDiagramIds] = useState<Set<string>>(new Set());
  const [showOnlyWithDiagram, setShowOnlyWithDiagram] = useState(true);

  // 初期化: 法令データと機序図一覧を読み込む
  useEffect(() => {
    async function init() {
      try {
        // 法令データ取得
        const data = await getBuildingStandardsAct();
        const nodes = parseLawData(data);
        setTreeData(nodes);

        // 機序図一覧取得
        const res = await fetch('/api/diagrams');
        if (res.ok) {
          const diagramData = await res.json();
          const lawDiagrams = diagramData.diagrams.find(
            (d: { lawId: string }) => d.lawId === '325AC0000000201'
          );
          if (lawDiagrams) {
            const diagrams = lawDiagrams.files.map(
              (f: { diagramId: string; path: string }) => ({
                diagramId: f.diagramId,
                path: f.path,
              })
            );
            setAvailableDiagrams(diagrams);
            setAvailableDiagramIds(new Set(diagrams.map((d: DiagramFile) => d.diagramId)));
          }
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // ノード選択時の処理
  const handleSelect = useCallback(async (node: LawNode) => {
    setSelectedNode(node);

    // 機序図があるか確認
    const diagramFile = availableDiagrams.find(d => d.diagramId === node.diagramId);

    if (diagramFile) {
      setDiagramLoading(true);
      try {
        const res = await fetch(diagramFile.path);
        if (res.ok) {
          const data: KijoDiagram = await res.json();
          setDiagram(data);
        } else {
          setDiagram(null);
        }
      } catch (err) {
        console.error('Failed to load diagram:', err);
        setDiagram(null);
      } finally {
        setDiagramLoading(false);
      }
    } else {
      setDiagram(null);
    }
  }, [availableDiagrams]);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
      <header className="p-4 border-b">
        <h1 className="text-xl font-bold">審査機序図自動生成システム</h1>
      </header>

      <main className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={25} minSize={20}>
            <div className="h-full flex flex-col p-2">
              <div className="flex items-center justify-between mb-2 px-2">
                <h2 className="text-sm font-semibold">目次</h2>
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyWithDiagram}
                    onChange={(e) => setShowOnlyWithDiagram(e.target.checked)}
                    className="w-3 h-3"
                  />
                  <span className="text-muted-foreground">審査機序図ありのみ表示</span>
                </label>
              </div>
              {loading ? (
                <div className="space-y-2 px-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : (
                <LawTree
                  nodes={treeData}
                  onSelect={handleSelect}
                  selectedDiagramId={selectedNode?.diagramId}
                  availableDiagramIds={availableDiagramIds}
                  showOnlyWithDiagram={showOnlyWithDiagram}
                />
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={75}>
            <div className="h-full p-4 overflow-auto flex flex-col gap-4">
              {selectedNode ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>{formatArticleTitle(selectedNode)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {selectedNode.content}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="flex-1 min-h-[400px]">
                    <CardHeader className="pb-2">
                      {diagram ? (
                        <div>
                          <CardTitle>{diagram.pageTitle.title}</CardTitle>
                          {diagram.pageTitle.targetSubject && (
                            <div className="text-sm text-muted-foreground mt-1">
                              対象主体: {diagram.pageTitle.targetSubject}
                            </div>
                          )}
                          {diagram.pageTitle.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {diagram.pageTitle.description}
                            </div>
                          )}
                        </div>
                      ) : (
                        <CardTitle>審査機序図</CardTitle>
                      )}
                    </CardHeader>
                    <CardContent className="h-[calc(100%-80px)]">
                      {diagramLoading ? (
                        <div className="flex items-center justify-center h-64">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : diagram ? (
                        <KijoDiagramViewer diagram={diagram} articleContent={selectedNode?.content} articleTitle={selectedNode ? formatArticleTitle(selectedNode) : undefined} />
                      ) : (
                        <div className="flex items-center justify-center h-64 text-muted-foreground">
                          この条文の機序図はまだ作成されていません
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  左側のツリーから条文を選択してください
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
