'use client';

import { useEffect, useState } from 'react';
import { LawTree } from '@/components/law-tree';
import { MermaidView } from '@/components/mermaid-view';
import { LawNode, parseLawData, findReferences, generateMermaid, findArticleInJson, Reference } from '@/lib/parser';
import { getBuildingStandardsAct, fetchLawData, searchLawIdByName, fetchLawList, BUILDING_STANDARDS_ACT_ID } from '@/lib/api';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const [treeData, setTreeData] = useState<LawNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<LawNode | null>(null);
  const [mermaidChart, setMermaidChart] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Cache for law data: lawId -> full json
  const [lawCache, setLawCache] = useState<Record<string, any>>({});

  useEffect(() => {
    async function init() {
      try {
        const data = await getBuildingStandardsAct();
        const nodes = parseLawData(data);
        setTreeData(nodes);
        setLawCache(prev => ({ ...prev, [BUILDING_STANDARDS_ACT_ID]: data }));
      } catch (err) {
        console.error('Failed to load initial law:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleSelect = async (node: LawNode) => {
    setSelectedNode(node);
    if (!node.content) return;
    
    setGenerating(true);
    try {
      // 1. Parse references
      const references = findReferences(node.content);
      const resolvedRefs: { ref: Reference; content?: string }[] = [];

      // 2. Resolve each reference
      for (const ref of references) {
        let targetLawId = BUILDING_STANDARDS_ACT_ID;
        
        // If external law
        if (ref.lawName) {
           // Search for law ID
           const id = await searchLawIdByName(ref.lawName);
           if (id) {
             targetLawId = id;
           } else {
             // Law not found, can't fetch
             resolvedRefs.push({ ref });
             continue;
           }
        }
        
        // Fetch law data if not in cache
        let targetLawData = lawCache[targetLawId];
        if (!targetLawData) {
          try {
             const revisions = await fetchLawList(targetLawId);
             if (revisions.length > 0) {
               const revId = revisions[0].revision_info.law_revision_id;
               targetLawData = await fetchLawData(revId);
               setLawCache(prev => ({ ...prev, [targetLawId]: targetLawData }));
             }
          } catch (e) {
            console.error(`Failed to fetch law ${targetLawId}`, e);
          }
        }
        
        // Find article in target law
        let refContent = undefined;
        if (targetLawData) {
           const found = findArticleInJson(targetLawData, ref.article);
           if (found) refContent = found;
        }
        
        resolvedRefs.push({ ref, content: refContent || undefined });
      }
      
      // 3. Generate Mermaid
      const chart = generateMermaid(node.title, node.content, resolvedRefs);
      setMermaidChart(chart);
      
    } catch (err) {
      console.error('Error generating mermaid:', err);
      setMermaidChart('graph TD\nError["Error generating chart"]');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
      <header className="p-4 border-b">
        <h1 className="text-xl font-bold">審査機序図生成システム (建築基準法)</h1>
      </header>
      
      <main className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={25} minSize={20}>
            <div className="h-full flex flex-col p-2">
               <h2 className="text-sm font-semibold mb-2 px-2">目次</h2>
               {loading ? (
                 <div className="space-y-2 px-2">
                   <Skeleton className="h-4 w-3/4" />
                   <Skeleton className="h-4 w-full" />
                   <Skeleton className="h-4 w-5/6" />
                 </div>
               ) : (
                 <LawTree nodes={treeData} onSelect={handleSelect} selectedId={selectedNode?.title} />
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
                       <CardTitle>{selectedNode.title}</CardTitle>
                     </CardHeader>
                     <CardContent>
                       <div className="whitespace-pre-wrap text-sm leading-relaxed">
                         {selectedNode.content}
                       </div>
                     </CardContent>
                   </Card>
                   
                   <Card className="flex-1 min-h-[400px]">
                     <CardHeader>
                       <CardTitle>審査機序図</CardTitle>
                     </CardHeader>
                     <CardContent className="h-full">
                       {generating ? (
                         <div className="flex items-center justify-center h-64">
                           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                         </div>
                       ) : (
                         <MermaidView chart={mermaidChart} />
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
