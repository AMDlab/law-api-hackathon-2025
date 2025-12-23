'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LawTree } from '@/components/law-tree';
import { KijoDiagramViewer } from '@/components/diagram-viewer';
import { LawNode, parseLawData } from '@/lib/parser';
import { getLawData, LAW_IDS, LAW_INFO, LawInfo } from '@/lib/api';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { KijoDiagram, FlowDiagram } from '@/types/diagram';

interface DiagramFile {
  diagramId: string;
  baseId: string;
  type: 'kijo' | 'flow';
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

// 法令タブ定義
const LAW_TABS = [
  { id: LAW_IDS.BUILDING_STANDARDS_ACT, label: '法' },
  { id: LAW_IDS.BUILDING_STANDARDS_ORDER, label: '令' },
];

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [currentLawId, setCurrentLawId] = useState<string>(LAW_IDS.BUILDING_STANDARDS_ACT);
  const [treeData, setTreeData] = useState<LawNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<LawNode | null>(null);
  const [loading, setLoading] = useState(true);

  // 機序図関連
  const [diagram, setDiagram] = useState<KijoDiagram | null>(null);
  const [flowDiagram, setFlowDiagram] = useState<FlowDiagram | null>(null);
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [availableDiagrams, setAvailableDiagrams] = useState<DiagramFile[]>([]);
  const [availableDiagramIds, setAvailableDiagramIds] = useState<Set<string>>(new Set());
  const [showOnlyWithDiagram, setShowOnlyWithDiagram] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 現在の法令情報
  const currentLawInfo = LAW_INFO[currentLawId];

  // URLパラメータから初期値を取得
  useEffect(() => {
    const lawIdParam = searchParams.get('lawId');
    const diagramIdParam = searchParams.get('diagramId');

    if (lawIdParam && LAW_INFO[lawIdParam]) {
      setCurrentLawId(lawIdParam);
    }
  }, [searchParams]);

  // URLを更新する関数
  const updateUrl = useCallback((lawId: string, diagramId?: string) => {
    const params = new URLSearchParams();
    params.set('lawId', lawId);
    if (diagramId) {
      params.set('diagramId', diagramId);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router]);

  // 機序図を指定のdiagramIdにナビゲート（関連条項リンク用）
  const navigateToDiagram = useCallback((targetLawId: string, targetDiagramId: string) => {
    // 法令を切り替え
    if (targetLawId !== currentLawId) {
      setCurrentLawId(targetLawId);
    }
    updateUrl(targetLawId, targetDiagramId);
  }, [currentLawId, updateUrl]);

  // 法令データと機序図一覧を読み込む（法令ID変更時のみ）
  useEffect(() => {
    async function loadLawData() {
      setLoading(true);
      setSelectedNode(null);
      setDiagram(null);
      setFlowDiagram(null);

      try {
        // 法令データ取得
        const data = await getLawData(currentLawId);
        const nodes = parseLawData(data);
        setTreeData(nodes);

        // 機序図一覧取得
        const res = await fetch('/api/diagrams');
        let diagrams: DiagramFile[] = [];
        if (res.ok) {
          const diagramData = await res.json();
          const lawDiagrams = diagramData.diagrams.find(
            (d: { lawId: string }) => d.lawId === currentLawId
          );
          if (lawDiagrams) {
            diagrams = lawDiagrams.files.map(
              (f: { diagramId: string; baseId: string; type: 'kijo' | 'flow'; path: string }) => ({
                diagramId: f.diagramId,
                baseId: f.baseId,
                type: f.type,
                path: f.path,
              })
            );
            setAvailableDiagrams(diagrams);
            // baseIdのセットを作成（機序図があるものだけ）
            const kijoBaseIds = diagrams
              .filter(d => d.type === 'kijo')
              .map(d => d.baseId);
            setAvailableDiagramIds(new Set(kijoBaseIds));
          } else {
            setAvailableDiagrams([]);
            setAvailableDiagramIds(new Set());
          }
        }

        // URLパラメータからdiagramIdを取得してロード（初期ロード時のみ）
        const diagramIdParam = searchParams.get('diagramId');
        if (diagramIdParam && diagrams.length > 0) {
          // diagramIdParamはbaseId（例: A43_P1）として扱う
          const kijoFile = diagrams.find(d => d.baseId === diagramIdParam && d.type === 'kijo');
          const flowFile = diagrams.find(d => d.baseId === diagramIdParam && d.type === 'flow');

          if (kijoFile) {
            // 対応するノードを探して選択
            const findNodeByDiagramId = (nodes: LawNode[], id: string): LawNode | null => {
              for (const node of nodes) {
                if (node.diagramId === id) return node;
                if (node.children) {
                  const found = findNodeByDiagramId(node.children, id);
                  if (found) return found;
                }
              }
              return null;
            };
            const targetNode = findNodeByDiagramId(nodes, diagramIdParam);
            if (targetNode) {
              setSelectedNode(targetNode);
              // 機序図をロード
              try {
                const diagramRes = await fetch(kijoFile.path);
                if (diagramRes.ok) {
                  const diagramJson: KijoDiagram = await diagramRes.json();
                  setDiagram(diagramJson);
                }
              } catch (err) {
                console.error('Failed to load kijo diagram from URL param:', err);
              }
              // フロー図もあればロード
              if (flowFile) {
                try {
                  const flowRes = await fetch(flowFile.path);
                  if (flowRes.ok) {
                    const flowJson: FlowDiagram = await flowRes.json();
                    setFlowDiagram(flowJson);
                  }
                } catch (err) {
                  console.error('Failed to load flow diagram from URL param:', err);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load law data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLawData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLawId]);

  // ノード選択時の処理
  const handleSelect = useCallback(async (node: LawNode) => {
    setSelectedNode(node);

    // 機序図があるか確認（baseIdで検索）
    const baseId = node.diagramId;
    const kijoFile = baseId
      ? availableDiagrams.find(d => d.baseId === baseId && d.type === 'kijo')
      : undefined;
    const flowFile = baseId
      ? availableDiagrams.find(d => d.baseId === baseId && d.type === 'flow')
      : undefined;

    // URLを更新（機序図がある場合のみdiagramIdを設定）
    updateUrl(currentLawId, kijoFile ? baseId : undefined);

    if (kijoFile) {
      setDiagramLoading(true);
      try {
        // 機序図をロード
        const res = await fetch(kijoFile.path);
        if (res.ok) {
          const data: KijoDiagram = await res.json();
          setDiagram(data);
        } else {
          setDiagram(null);
        }

        // フロー図もあればロード
        if (flowFile) {
          const flowRes = await fetch(flowFile.path);
          if (flowRes.ok) {
            const flowData: FlowDiagram = await flowRes.json();
            setFlowDiagram(flowData);
          } else {
            setFlowDiagram(null);
          }
        } else {
          setFlowDiagram(null);
        }
      } catch (err) {
        console.error('Failed to load diagram:', err);
        setDiagram(null);
        setFlowDiagram(null);
      } finally {
        setDiagramLoading(false);
      }
    } else {
      setDiagram(null);
      setFlowDiagram(null);
    }
  }, [availableDiagrams, currentLawId, updateUrl]);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
      <header className="p-4 border-b">
        <h1 className="text-xl font-bold">審査機序図自動生成システム</h1>
      </header>

      <main className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={25} minSize={20}>
            <div className="h-full flex flex-col p-2">
              {/* 法令切り替えタブ */}
              <div className="px-2 mb-2">
                <Tabs value={currentLawId} onValueChange={setCurrentLawId}>
                  <TabsList className="w-full grid grid-cols-2">
                    {LAW_TABS.map((tab) => (
                      <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <div className="text-xs text-muted-foreground mt-1">
                  {currentLawInfo?.name}
                </div>
              </div>

              <div className="flex flex-col gap-2 mb-2 px-2">
                <input
                  type="text"
                  placeholder="条文を検索... (例: 43, 接道)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded bg-background"
                />
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
                  searchQuery={searchQuery}
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
                          <CardTitle>{diagram.page_title.title}</CardTitle>
                          {diagram.page_title.target_subject && (
                            <div className="text-sm text-muted-foreground mt-1">
                              対象主体: {diagram.page_title.target_subject}
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
                        <KijoDiagramViewer
                          diagram={diagram}
                          flowDiagram={flowDiagram ?? undefined}
                          articleContent={selectedNode?.content}
                          articleTitle={selectedNode ? formatArticleTitle(selectedNode) : undefined}
                          onNavigate={navigateToDiagram}
                        />
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

export default function Home() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
